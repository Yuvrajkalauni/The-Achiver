"""Unit tests: validator, scoring, and the one-answer-per-question rule."""
import json
import random

from django.test import Client, TestCase

from .jobs import score_round
from .models import LabAnswer, LabAttempt, LabQuestion, LabTest
from .validation import normalize, randomize_options, score_attempt, validate_question


def good_question(**over):
    q = {
        "text": "What is 2 + 2?",
        "options": ["3", "4", "5", "6"],
        "correct_index": 1,
        "explanation": "2 + 2 equals 4.",
        "difficulty": "easy",
    }
    q.update(over)
    return q


class ValidatorTests(TestCase):
    def test_accepts_valid_question(self):
        self.assertEqual(validate_question(good_question()), [])

    def test_rejects_wrong_option_count(self):
        self.assertIn("must have exactly 4 options", " ".join(validate_question(good_question(options=["a", "b"]))))

    def test_rejects_duplicate_options(self):
        q = good_question(options=["Paris", "paris", "Rome", "Oslo"])
        self.assertTrue(any("distinct" in e for e in validate_question(q)))

    def test_rejects_bad_correct_index(self):
        self.assertTrue(any("correct_index" in e for e in validate_question(good_question(correct_index=7))))

    def test_rejects_all_of_the_above(self):
        q = good_question(options=["1", "2", "3", "All of the above"])
        self.assertTrue(any("ambiguous" in e for e in validate_question(q)))

    def test_rejects_empty_text_and_bad_difficulty(self):
        errs = validate_question(good_question(text="  ", difficulty="extreme"))
        self.assertTrue(any("empty text" in e for e in errs))
        self.assertTrue(any("difficulty" in e for e in errs))

    def test_normalize_ignores_case_and_punctuation(self):
        self.assertEqual(normalize("What is 2+2?"), normalize("what IS 2 + 2!!"))

    def test_randomize_keeps_answer_attached(self):
        rng = random.Random(7)
        seen_positions = set()
        for _ in range(20):
            opts, ci = randomize_options(["a", "b", "c", "d"], 2, rng)
            self.assertEqual(opts[ci], "c")  # key follows the content
            seen_positions.add(ci)
        self.assertGreater(len(seen_positions), 1)  # key actually moves


class ScoringTests(TestCase):
    def test_exact_match_scoring(self):
        score, verdicts = score_attempt({1: 2, 2: 0, 3: None}, {1: 2, 2: 1, 3: 0})
        self.assertEqual(score, 1)
        self.assertEqual(verdicts, {1: "correct", 2: "wrong", 3: "unanswered"})


class SingleAnswerRuleTests(TestCase):
    def test_selecting_another_option_replaces(self):
        test = LabTest.objects.create(status="ready", total=1, generated_count=1)
        q = LabQuestion.objects.create(
            test=test, subject="Physics", text="Q?", options=["a", "b", "c", "d"],
            correct_index=0, explanation="E.", difficulty="easy", order=0,
        )
        attempt = LabAttempt.objects.create(test=test)
        LabAnswer.objects.update_or_create(attempt=attempt, question=q, defaults={"selected": 0})
        LabAnswer.objects.update_or_create(attempt=attempt, question=q, defaults={"selected": 2})
        rows = LabAnswer.objects.filter(attempt=attempt, question=q)
        self.assertEqual(rows.count(), 1)  # still exactly one answer row
        self.assertEqual(rows.get().selected, 2)  # latest choice wins

    def test_clearing_sets_null_not_delete(self):
        test = LabTest.objects.create(status="ready", total=1, generated_count=1)
        q = LabQuestion.objects.create(
            test=test, subject="Physics", text="Q?", options=["a", "b", "c", "d"],
            correct_index=0, explanation="E.", difficulty="easy", order=0,
        )
        attempt = LabAttempt.objects.create(test=test)
        LabAnswer.objects.update_or_create(attempt=attempt, question=q, defaults={"selected": 1})
        LabAnswer.objects.update_or_create(attempt=attempt, question=q, defaults={"selected": None})
        self.assertIsNone(LabAnswer.objects.get(attempt=attempt, question=q).selected)


def make_round(test, n=5, round_no=0):
    qs = []
    for i in range(n):
        qs.append(
            LabQuestion.objects.create(
                test=test, subject="Physics", text=f"Q{i}?", options=["a", "b", "c", "d"],
                correct_index=i % 4, explanation="E.", difficulty="easy", order=i, round_no=round_no,
            )
        )
    return qs


class RoundTests(TestCase):
    def test_score_round_counts_five(self):
        test = LabTest.objects.create(status="ready", total=100, generated_count=5)
        qs = make_round(test)
        answers = {qs[0].id: qs[0].correct_index, qs[1].id: (qs[1].correct_index + 1) % 4}
        score, verdicts = score_round(qs, answers)
        self.assertEqual(score, 1)
        self.assertEqual(verdicts[qs[2].id], "unanswered")

    def test_submit_round_scores_and_is_idempotent(self):
        test = LabTest.objects.create(status="ready", total=100, generated_count=5)
        qs = make_round(test)
        attempt = LabAttempt.objects.create(test=test)
        LabAnswer.objects.create(attempt=attempt, question=qs[0], selected=qs[0].correct_index)
        client = Client()
        first = client.post(
            f"/api/v1/mocklab/attempts/{attempt.pk}/submit-round",
            data=json.dumps({"round": 0}),
            content_type="application/json",
        )
        self.assertEqual(first.status_code, 200)
        self.assertEqual(first.json()["score"], 1)
        second = client.post(
            f"/api/v1/mocklab/attempts/{attempt.pk}/submit-round",
            data=json.dumps({"round": 0}),
            content_type="application/json",
        )
        self.assertEqual(second.status_code, 200)
        self.assertEqual(second.json()["score"], 1)
        attempt.refresh_from_db()
        self.assertEqual(attempt.submitted_rounds, [0])

    def test_submit_round_rejects_ungenerated_round(self):
        test = LabTest.objects.create(status="ready", total=100, generated_count=5)
        make_round(test)
        attempt = LabAttempt.objects.create(test=test)
        res = Client().post(
            f"/api/v1/mocklab/attempts/{attempt.pk}/submit-round",
            data=json.dumps({"round": 3}),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 409)
