"""Free Mock Test API tests (TRD §11 testing strategy)."""
import json

from django.contrib.auth.models import User
from django.core.management import call_command
from django.test import override_settings
from django.urls import reverse
from django.utils import dateparse, timezone
from datetime import timedelta
from rest_framework import status
from rest_framework.test import APITestCase

from .models import (
    DURATION_MINUTES,
    SUBJECTS,
    AttemptQuestion,
    CsvUpload,
    Question,
    TestAttempt,
    UserAnswer,
)

TEST_REST_FRAMEWORK = {
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.TokenAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ],
    "EXCEPTION_HANDLER": "apps.freemock.errors.exception_handler",
    "DEFAULT_THROTTLE_RATES": {
        "anon": "100000/min",
        "user": "100000/min",
        "fm_start": "100000/min",
        "fm_read": "100000/min",
        "fm_save": "100000/min",
        "fm_submit": "100000/min",
        "fm_admin": "100000/min",
        "fm_admin_login": "100000/min",
        "fm_upload": "100000/min",
    },
}

CSV_HEADER = "subject,question_text,option_a,option_b,option_c,option_d,correct_option,explanation,difficulty"

# Throttle history lives in the default cache and is keyed by IP/user, so it
# leaks between test methods (same IP, same PK after rollback). A dummy cache
# keeps DRF's ScopedRateThrottle from ever seeing accumulated history.
TEST_CACHES = {"default": {"BACKEND": "django.core.cache.backends.dummy.DummyCache"}}


def seed_pool(per_subject: int = 5) -> None:
    for subject in SUBJECTS:
        for i in range(per_subject):
            Question.objects.create(
                subject=subject,
                question_text=f"{subject} demo question {i}",
                options={"A": "a1", "B": "b1", "C": "c1", "D": "d1"},
                correct_option="A",
                explanation="Because.",
                difficulty=2,
            )


@override_settings(REST_FRAMEWORK=TEST_REST_FRAMEWORK, CACHES=TEST_CACHES)
class FreemockTestLifecycleTests(APITestCase):
    def setUp(self):
        seed_pool()

    def start(self, owner: str | None = None):
        headers = {"HTTP_X_FM_OWNER": owner} if owner else {}
        return self.client.post(reverse("freemock:start"), {}, format="json", **headers)

    def test_start_creates_20_questions_with_four_per_subject(self):
        response = self.start()
        self.assertIn(
            response.status_code, (status.HTTP_201_CREATED, status.HTTP_200_OK), response.data
        )
        questions = response.data["questions"]
        self.assertEqual(len(questions), 20)
        counts = {}
        for question in questions:
            counts[question["subject"]] = counts.get(question["subject"], 0) + 1
        for subject in SUBJECTS:
            self.assertEqual(counts[subject], 4, counts)
        self.assertEqual(response.data["attempt"]["total_marks"], 100)

    def test_start_payload_never_leaks_correct_answers(self):
        body = json.dumps(self.start().data).lower()
        for forbidden in ("correct_option", "is_correct", "marks_awarded"):
            self.assertNotIn(forbidden, body)

    def test_start_with_same_owner_token_returns_same_active_attempt(self):
        first = self.start()
        token = first.data["owner_token"]
        second = self.start(owner=token)
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertEqual(second.data["attempt"]["id"], first.data["attempt"]["id"])
        self.assertEqual(
            [q["id"] for q in second.data["questions"]],
            [q["id"] for q in first.data["questions"]],
        )

    def test_start_fails_when_a_subject_pool_is_short(self):
        Question.objects.filter(subject="BIOLOGY").delete()
        response = self.start()
        self.assertEqual(response.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)
        self.assertEqual(response.data["error"]["code"], "INSUFFICIENT_QUESTION_POOL")
        self.assertIn("Biology", response.data["error"]["message"])
        self.assertEqual(TestAttempt.objects.count(), 0)

    def test_answers_persist_and_are_returned_on_resume(self):
        started = self.start()
        token = started.data["owner_token"]
        attempt_id = started.data["attempt"]["id"]
        target = started.data["questions"][0]

        save = self.client.patch(
            reverse("freemock:answers", args=[attempt_id]),
            {"answers": [{"question_id": target["id"], "selected_option": "B"}]},
            format="json",
            HTTP_X_FM_OWNER=token,
        )
        self.assertEqual(save.status_code, status.HTTP_200_OK, save.data)
        self.assertEqual(save.data["saved"], 1)
        self.assertEqual(save.data["answered_questions"], 1)

        resumed = self.client.get(
            reverse("freemock:attempt", args=[attempt_id]), HTTP_X_FM_OWNER=token
        )
        self.assertEqual(resumed.status_code, status.HTTP_200_OK)
        saved = {q["id"]: q.get("selected_option") for q in resumed.data["questions"]}
        self.assertEqual(saved[target["id"]], "B")
        # still no answer key before submission
        self.assertNotIn("correct_option", json.dumps(resumed.data))

    def test_answers_reject_questions_outside_the_attempt(self):
        started = self.start()
        token = started.data["owner_token"]
        attempt_id = started.data["attempt"]["id"]
        stranger = Question.objects.create(
            subject="ENGLISH",
            question_text="not in the attempt",
            options={"A": "1", "B": "2", "C": "3", "D": "4"},
            correct_option="A",
        )
        response = self.client.patch(
            reverse("freemock:answers", args=[attempt_id]),
            {"answers": [{"question_id": str(stranger.id), "selected_option": "A"}]},
            format="json",
            HTTP_X_FM_OWNER=token,
        )
        self.assertEqual(response.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)
        self.assertEqual(response.data["error"]["code"], "INVALID_QUESTION")

    def test_another_owner_cannot_read_the_attempt(self):
        started = self.start()
        attempt_id = started.data["attempt"]["id"]
        response = self.client.get(
            reverse("freemock:attempt", args=[attempt_id]), HTTP_X_FM_OWNER="deadbeef" * 8
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["error"]["code"], "NOT_FOUND")

    def test_submit_scores_and_returns_full_review(self):
        started = self.start()
        token = started.data["owner_token"]
        attempt_id = started.data["attempt"]["id"]
        questions = started.data["questions"]

        # answer 3 correctly and 1 incorrectly
        answers = []
        for index, question in enumerate(questions):
            correct = Question.objects.get(id=question["id"]).correct_option
            if index < 3:
                answers.append({"question_id": question["id"], "selected_option": correct})
            elif index == 3:
                wrong = "ABCD"[("ABCD".index(correct) + 1) % 4]
                answers.append({"question_id": question["id"], "selected_option": wrong})

        response = self.client.post(
            reverse("freemock:submit"),
            {"attempt_id": attempt_id, "answers": answers},
            format="json",
            HTTP_X_FM_OWNER=token,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        attempt = response.data["attempt"]
        self.assertEqual(attempt["status"], "SUBMITTED")
        self.assertEqual(attempt["correct_answers"], 3)
        self.assertEqual(attempt["answered_questions"], 4)
        self.assertEqual(attempt["score"], 15)
        self.assertEqual(len(response.data["review"]), 20)
        self.assertEqual(
            sum(row["marks"] for row in response.data["summary_by_subject"]), 15
        )
        # every review row carries the key + state
        for row in response.data["review"]:
            self.assertIn(row["correct_option"], ("A", "B", "C", "D"))
            self.assertIn(row["state"], ("correct", "incorrect", "unanswered"))

    def test_perfect_score_is_100(self):
        started = self.start()
        token = started.data["owner_token"]
        attempt_id = started.data["attempt"]["id"]
        answers = [
            {
                "question_id": q["id"],
                "selected_option": Question.objects.get(id=q["id"]).correct_option,
            }
            for q in started.data["questions"]
        ]
        response = self.client.post(
            reverse("freemock:submit"),
            {"attempt_id": attempt_id, "answers": answers},
            format="json",
            HTTP_X_FM_OWNER=token,
        )
        self.assertEqual(response.data["attempt"]["score"], 100)
        self.assertEqual(response.data["attempt"]["correct_answers"], 20)

    def test_duplicate_submit_is_idempotent(self):
        started = self.start()
        token = started.data["owner_token"]
        attempt_id = started.data["attempt"]["id"]
        first = self.client.post(
            reverse("freemock:submit"),
            {"attempt_id": attempt_id, "answers": []},
            format="json",
            HTTP_X_FM_OWNER=token,
        )
        second = self.client.post(
            reverse("freemock:submit"),
            {"attempt_id": attempt_id, "answers": []},
            format="json",
            HTTP_X_FM_OWNER=token,
        )
        self.assertEqual(first.status_code, status.HTTP_200_OK)
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertEqual(first.data["attempt"]["score"], second.data["attempt"]["score"])
        self.assertEqual(TestAttempt.objects.filter(id=attempt_id).count(), 1)

    def test_result_before_submission_is_rejected(self):
        started = self.start()
        token = started.data["owner_token"]
        attempt_id = started.data["attempt"]["id"]
        response = self.client.get(
            reverse("freemock:result", args=[attempt_id]), HTTP_X_FM_OWNER=token
        )
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(response.data["error"]["code"], "ATTEMPT_IN_PROGRESS")

    def test_expired_attempt_rejects_answers_and_finalizes(self):
        started = self.start()
        token = started.data["owner_token"]
        attempt_id = started.data["attempt"]["id"]
        target = started.data["questions"][0]
        TestAttempt.objects.filter(id=attempt_id).update(
            started_at=timezone.now() - timedelta(minutes=DURATION_MINUTES + 1),
            expires_at=timezone.now() - timedelta(seconds=1),
        )
        response = self.client.patch(
            reverse("freemock:answers", args=[attempt_id]),
            {"answers": [{"question_id": target["id"], "selected_option": "A"}]},
            format="json",
            HTTP_X_FM_OWNER=token,
        )
        self.assertEqual(response.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)
        self.assertEqual(response.data["error"]["code"], "ATTEMPT_EXPIRED")
        attempt = TestAttempt.objects.get(id=attempt_id)
        self.assertEqual(attempt.status, TestAttempt.Status.EXPIRED)
        self.assertEqual(attempt.submission_reason, TestAttempt.Reason.TIME_EXPIRED)
        self.assertEqual(attempt.score, 0)

    def test_expiry_worker_finalizes_stale_attempts(self):
        started = self.start()
        attempt_id = started.data["attempt"]["id"]
        TestAttempt.objects.filter(id=attempt_id).update(
            started_at=timezone.now() - timedelta(minutes=DURATION_MINUTES + 5),
            expires_at=timezone.now() - timedelta(minutes=5),
        )
        call_command("freemock_expire")
        attempt = TestAttempt.objects.get(id=attempt_id)
        self.assertEqual(attempt.status, TestAttempt.Status.EXPIRED)
        self.assertIsNotNone(attempt.submitted_at)

    def test_start_after_expiry_issues_a_new_attempt(self):
        first = self.start()
        token = first.data["owner_token"]
        TestAttempt.objects.filter(id=first.data["attempt"]["id"]).update(
            started_at=timezone.now() - timedelta(minutes=DURATION_MINUTES + 1),
            expires_at=timezone.now() - timedelta(minutes=1),
        )
        second = self.start(owner=token)
        self.assertEqual(second.status_code, status.HTTP_201_CREATED)
        self.assertNotEqual(second.data["attempt"]["id"], first.data["attempt"]["id"])
        old = TestAttempt.objects.get(id=first.data["attempt"]["id"])
        self.assertEqual(old.status, TestAttempt.Status.EXPIRED)

    def test_duration_is_thirty_minutes(self):
        started = self.start()
        started_at = dateparse.parse_datetime(started.data["attempt"]["started_at"])
        expires_at = dateparse.parse_datetime(started.data["attempt"]["expires_at"])
        self.assertEqual(int((expires_at - started_at).total_seconds()), DURATION_MINUTES * 60)


@override_settings(REST_FRAMEWORK=TEST_REST_FRAMEWORK, CACHES=TEST_CACHES)
class FreemockAdminCsvTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username="ravi", password="Secret123!", is_staff=True
        )
        self.student = User.objects.create_user(username="asha", password="Secret123!")

    def login(self):
        response = self.client.post(
            reverse("freemock:admin-login"),
            {"username": "ravi", "password": "Secret123!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        return f"Token {response.data['token']}"

    def upload(self, content: str, auth: str, dry_run: bool = False):
        from django.core.files.uploadedfile import SimpleUploadedFile

        file = SimpleUploadedFile("questions.csv", content.encode("utf-8"), "text/csv")
        return self.client.post(
            reverse("freemock:admin-upload"),
            {"file": file, "dry_run": "true" if dry_run else "false"},
            format="multipart",
            HTTP_AUTHORIZATION=auth,
        )

    def test_admin_endpoints_require_staff(self):
        anonymous = self.client.get(reverse("freemock:admin-overview"))
        self.assertIn(
            anonymous.status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
        )
        # a student account cannot obtain an admin token
        student = self.client.post(
            reverse("freemock:admin-login"),
            {"username": "asha", "password": "Secret123!"},
            format="json",
        )
        self.assertEqual(student.status_code, status.HTTP_401_UNAUTHORIZED)
        # staff can
        allowed = self.client.get(
            reverse("freemock:admin-overview"), HTTP_AUTHORIZATION=self.login()
        )
        self.assertEqual(allowed.status_code, status.HTTP_200_OK)

    def test_valid_csv_is_imported(self):
        auth = self.login()
        csv_content = "\n".join(
            [
                CSV_HEADER,
                'ENGLISH,"Choose the correct spelling.",Accomodation,Accommodation,Acommodation,Accommmodation,B,"Two c and two m.",1',
                'MATHEMATICS,"What is 15% of 200?",15,25,30,45,C,"15/100 * 200 = 30.",2',
            ]
        )
        response = self.upload(csv_content, auth)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(response.data["created"], 2)
        self.assertEqual(Question.objects.count(), 2)
        question = Question.objects.get(question_text__startswith="Choose the correct")
        self.assertEqual(question.correct_option, "B")
        self.assertEqual(question.options["B"], "Accommodation")

    def test_minimal_header_without_optional_columns_imports(self):
        auth = self.login()
        header = "subject,question_text,option_a,option_b,option_c,option_d,correct_option"
        csv_content = "\n".join(
            [
                header,
                'English,"Choose the synonym of \'benevolent\'.",Cruel,Kind,Lazy,Angry,B,5',
            ]
        )
        response = self.upload(csv_content, auth)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(response.data["created"], 1)
        question = Question.objects.get()
        self.assertEqual(question.subject, "ENGLISH")
        self.assertEqual(question.explanation, "")
        self.assertIsNone(question.difficulty)

    def test_marks_column_must_match_marks_per_question(self):
        auth = self.login()
        header = (
            "subject,question_text,option_a,option_b,option_c,option_d,correct_option,marks"
        )
        good = 'ENGLISH,"Five marks?",a,b,c,d,A,5'
        bad = 'ENGLISH,"Ten marks?",a,b,c,d,A,10'

        ok = self.upload("\n".join([header, good]), auth)
        self.assertEqual(ok.status_code, status.HTTP_201_CREATED, ok.data)
        self.assertEqual(ok.data["created"], 1)

        rejected = self.upload("\n".join([header, bad]), auth)
        self.assertEqual(rejected.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)
        codes = {e["code"] for e in rejected.data["errors"]}
        self.assertIn("INVALID_MARKS", codes)
        self.assertEqual(Question.objects.count(), 1, "bad file must not write anything")

    def test_invalid_row_blocks_the_whole_file(self):
        auth = self.login()
        csv_content = "\n".join(
            [
                CSV_HEADER,
                'ENGLISH,"Good row?",a,b,c,d,A,"ok",1',
                'MATH,"Bad correct option?",a,b,c,d,Z,"bad",1',
            ]
        )
        response = self.upload(csv_content, auth)
        self.assertEqual(response.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)
        self.assertEqual(response.data["status"], "FAILED")
        self.assertEqual(Question.objects.count(), 0, "all-or-nothing: nothing imported")
        codes = {e["code"] for e in response.data["errors"]}
        self.assertIn("INVALID_CORRECT_OPTION", codes)
        self.assertTrue(all(e["row"] == 2 for e in response.data["errors"]))

    def test_header_mismatch_is_rejected(self):
        auth = self.login()
        response = self.upload("subject,question_text\nENGLISH,hello", auth)
        self.assertEqual(response.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)
        self.assertEqual(response.data["error"]["code"], "INVALID_HEADER")

    def test_duplicate_rows_are_skipped_not_imported_twice(self):
        auth = self.login()
        row = 'ENGLISH,"Same question?",a,b,c,d,A,"note",1'
        first = self.upload("\n".join([CSV_HEADER, row, row]), auth)
        self.assertEqual(first.status_code, status.HTTP_201_CREATED, first.data)
        self.assertEqual(first.data["created"], 1)
        self.assertEqual(first.data["skipped"], 1)
        self.assertEqual(Question.objects.count(), 1)

    def test_dry_run_writes_nothing(self):
        auth = self.login()
        response = self.upload('\n'.join([CSV_HEADER, 'BIOLOGY,"x?",a,b,c,d,A,"",1']), auth, dry_run=True)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], "DRY_RUN")
        self.assertEqual(Question.objects.count(), 0)

    def test_overview_reports_inventory_and_warnings(self):
        auth = self.login()
        seed_pool(per_subject=5)
        Question.objects.filter(subject="PHYSICS").update(is_active=False)
        response = self.client.get(
            reverse("freemock:admin-overview"), HTTP_AUTHORIZATION=auth
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("PHYSICS", response.data["warnings"])
        physics = next(s for s in response.data["subjects"] if s["subject"] == "PHYSICS")
        self.assertEqual(physics["active"], 0)
        self.assertFalse(physics["minimum_met"])

    def test_template_endpoint_returns_csv(self):
        auth = self.login()
        response = self.client.get(reverse("freemock:admin-template"), HTTP_AUTHORIZATION=auth)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("subject,question_text", response.content.decode())


@override_settings(REST_FRAMEWORK=TEST_REST_FRAMEWORK, CACHES=TEST_CACHES)
class FreemockSecurityTests(APITestCase):
    def setUp(self):
        seed_pool()

    def test_correct_answers_absent_from_start_and_save_responses(self):
        started = self.client.post(reverse("freemock:start"), {}, format="json")
        token = started.data["owner_token"]
        attempt_id = started.data["attempt"]["id"]
        target = started.data["questions"][0]
        saved = self.client.patch(
            reverse("freemock:answers", args=[attempt_id]),
            {"answers": [{"question_id": target["id"], "selected_option": "A"}]},
            format="json",
            HTTP_X_FM_OWNER=token,
        )
        for payload in (started.data, saved.data):
            blob = json.dumps(payload)
            self.assertNotIn("correct_option", blob)
            self.assertNotIn("is_correct", blob)

    def test_anonymous_start_needs_no_credentials(self):
        response = self.client.post(reverse("freemock:start"), {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["owner_token"])
