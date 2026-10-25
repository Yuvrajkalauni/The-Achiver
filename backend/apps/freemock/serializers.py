"""Serializers: strict separation between pre-submit and post-submit payloads.

TRD §7.6 / Appendix A — `correct_option`, `is_correct`, `marks_awarded` and
score fields must NEVER appear before an attempt is finalized.
"""
from django.utils import timezone
from rest_framework import serializers

from .models import MARKS_PER_QUESTION, QUESTION_COUNT, TOTAL_MARKS, Question, TestAttempt


class StartSerializer(serializers.Serializer):
    test_type = serializers.CharField(required=False, allow_blank=True, default="STANDARD_100_MARK")


class AnswerItemSerializer(serializers.Serializer):
    question_id = serializers.UUIDField()
    selected_option = serializers.ChoiceField(
        choices=["A", "B", "C", "D"], allow_null=True, required=False, default=None
    )


class AnswersSerializer(serializers.Serializer):
    answers = AnswerItemSerializer(many=True, allow_empty=False)


class SubmitSerializer(serializers.Serializer):
    attempt_id = serializers.UUIDField()
    answers = AnswerItemSerializer(many=True, required=False, default=list)


class AdminLoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)


# --------------------------------------------------------------------------- #
# Payload builders
# --------------------------------------------------------------------------- #


def iso(value) -> str | None:
    if value is None:
        return None
    return value.isoformat().replace("+00:00", "Z")


def attempt_meta(attempt: TestAttempt, server_time=None) -> dict:
    return {
        "id": str(attempt.id),
        "status": attempt.status,
        "started_at": iso(attempt.started_at),
        "expires_at": iso(attempt.expires_at),
        "submitted_at": iso(attempt.submitted_at),
        "submission_reason": attempt.submission_reason or None,
        "server_time": iso(server_time or timezone.now()),
        "duration_seconds": int((attempt.expires_at - attempt.started_at).total_seconds()),
        "total_marks": TOTAL_MARKS,
        "marks_per_question": MARKS_PER_QUESTION,
        "question_count": attempt.total_questions or QUESTION_COUNT,
        "answered_questions": attempt.answered_questions,
        "correct_answers": attempt.correct_answers,
        "score": attempt.score,
    }


def questions_payload(attempt: TestAttempt, include_answers: bool = True) -> list[dict]:
    """Safe question payload — never carries correct_option."""
    answers = {}
    if include_answers:
        answers = {str(a.question_id): a.selected_option for a in attempt.answers.all()}

    payload = []
    for aq in attempt.attempt_questions.select_related("question").order_by("sequence_no"):
        question: Question = aq.question
        item = {
            "id": str(question.id),
            "sequence_no": aq.sequence_no,
            "subject": aq.subject,
            "question_text": question.question_text,
            "options": question.options,
        }
        if include_answers:
            item["selected_option"] = answers.get(str(question.id))
        payload.append(item)
    return payload


def start_payload(attempt: TestAttempt, owner_token: str, created: bool) -> dict:
    return {
        "owner_token": owner_token,
        "created": created,
        "attempt": attempt_meta(attempt),
        "questions": questions_payload(attempt),
    }


def resume_payload(attempt: TestAttempt) -> dict:
    return {"attempt": attempt_meta(attempt), "questions": questions_payload(attempt)}


def review_payload(attempt: TestAttempt) -> list[dict]:
    """Post-submission only: full answer review with keys and explanations."""
    answers = {str(a.question_id): a for a in attempt.answers.all()}
    review = []
    for aq in attempt.attempt_questions.select_related("question").order_by("sequence_no"):
        question = aq.question
        answer = answers.get(str(question.id))
        selected = answer.selected_option if answer else None
        correct = bool(answer.is_correct) if answer and answer.is_correct is not None else False
        review.append(
            {
                "question_id": str(question.id),
                "sequence_no": aq.sequence_no,
                "subject": aq.subject,
                "question_text": question.question_text,
                "options": question.options,
                "selected_option": selected,
                "correct_option": question.correct_option,
                "is_correct": correct,
                "marks_awarded": (answer.marks_awarded if answer and answer.marks_awarded else 0),
                "explanation": question.explanation,
                "state": (
                    "correct" if correct else ("incorrect" if selected else "unanswered")
                ),
            }
        )
    return review


def result_payload(attempt: TestAttempt) -> dict:
    from .services import summary_by_subject  # local import avoids a cycle

    return {
        "attempt": attempt_meta(attempt),
        "summary_by_subject": summary_by_subject(attempt),
        "review": review_payload(attempt),
    }
