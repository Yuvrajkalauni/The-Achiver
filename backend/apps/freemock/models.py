"""Free Mock Test models (PRD §9, TRD §5).

Adaptation notes vs TRD:
- SQLite instead of PostgreSQL (project runs on SQLite locally); the same
  constraints/indexes are expressed through Meta.constraints / Meta.indexes.
- Anonymous start (product decision): attempts are owned by a hashed bearer
  token (`owner_hash`) instead of a User FK, so no login is required while
  ownership checks still apply (PRD FR-014, TRD §7.6).
- UserAnswer uses two plain FKs plus a unique (attempt, question) constraint
  instead of a composite foreign key (not representable in Django).
"""
import uuid

from django.conf import settings
from django.db import models
from django.db.models import Q

SUBJECTS = ("ENGLISH", "MATHEMATICS", "PHYSICS", "CHEMISTRY", "BIOLOGY")
QUESTIONS_PER_SUBJECT = 4
QUESTION_COUNT = 20
MARKS_PER_QUESTION = 5
TOTAL_MARKS = 100
DURATION_MINUTES = 30


class Question(models.Model):
    """A single MCQ in the question bank (TRD §5.4)."""

    class Subject(models.TextChoices):
        ENGLISH = "ENGLISH", "English"
        MATHEMATICS = "MATHEMATICS", "Mathematics"
        PHYSICS = "PHYSICS", "Physics"
        CHEMISTRY = "CHEMISTRY", "Chemistry"
        BIOLOGY = "BIOLOGY", "Biology"

    class Option(models.TextChoices):
        A = "A", "Option A"
        B = "B", "Option B"
        C = "C", "Option C"
        D = "D", "Option D"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    subject = models.CharField(max_length=20, choices=Subject.choices)
    question_text = models.TextField()
    # Shape: {"A": "...", "B": "...", "C": "...", "D": "..."}
    options = models.JSONField()
    correct_option = models.CharField(max_length=1, choices=Option.choices)
    explanation = models.TextField(blank=True, default="")
    difficulty = models.PositiveSmallIntegerField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="freemock_questions",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["subject", "created_at"]
        constraints = [
            models.CheckConstraint(
                condition=~Q(question_text=""),
                name="fm_question_text_nonempty",
            ),
            models.CheckConstraint(
                condition=Q(difficulty__isnull=True) | Q(difficulty__gte=1, difficulty__lte=5),
                name="fm_question_difficulty_range",
            ),
        ]
        indexes = [models.Index(fields=["subject", "is_active"], name="fm_question_subject_active")]

    def __str__(self) -> str:  # pragma: no cover - debug helper
        return f"{self.subject}: {self.question_text[:40]}"


class TestAttempt(models.Model):
    """One student's generated test instance (TRD §5.5)."""

    class Status(models.TextChoices):
        IN_PROGRESS = "IN_PROGRESS", "In progress"
        SUBMITTED = "SUBMITTED", "Submitted"
        EXPIRED = "EXPIRED", "Expired"
        CANCELLED = "CANCELLED", "Cancelled"

    class Reason(models.TextChoices):
        USER_SUBMITTED = "USER_SUBMITTED", "User submitted"
        TIME_EXPIRED = "TIME_EXPIRED", "Time expired"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner_hash = models.CharField(max_length=64, db_index=True)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.IN_PROGRESS)
    started_at = models.DateTimeField()
    expires_at = models.DateTimeField()
    submitted_at = models.DateTimeField(null=True, blank=True)
    score = models.PositiveSmallIntegerField(null=True, blank=True)
    total_questions = models.PositiveSmallIntegerField(default=QUESTION_COUNT)
    answered_questions = models.PositiveSmallIntegerField(default=0)
    correct_answers = models.PositiveSmallIntegerField(default=0)
    submission_reason = models.CharField(max_length=30, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["owner_hash"],
                condition=Q(status="IN_PROGRESS"),
                name="fm_one_active_attempt_per_owner",
            ),
            models.CheckConstraint(
                condition=Q(total_questions=QUESTION_COUNT),
                name="fm_attempt_total_questions",
            ),
            models.CheckConstraint(
                condition=Q(score__isnull=True) | Q(score__lte=TOTAL_MARKS),
                name="fm_attempt_score_range",
            ),
            models.CheckConstraint(
                condition=Q(expires_at__gt=models.F("started_at")),
                name="fm_attempt_expiry_after_start",
            ),
            models.CheckConstraint(
                condition=(
                    Q(status__in=["SUBMITTED", "EXPIRED"], submitted_at__isnull=False, score__isnull=False)
                    | Q(status__in=["IN_PROGRESS", "CANCELLED"])
                ),
                name="fm_attempt_submission_consistency",
            ),
        ]
        indexes = [models.Index(fields=["status", "expires_at"], name="fm_attempt_expiry_idx")]


class AttemptQuestion(models.Model):
    """Freezes the selected questions for an attempt (TRD §5.6)."""

    attempt = models.ForeignKey(
        TestAttempt, on_delete=models.CASCADE, related_name="attempt_questions"
    )
    question = models.ForeignKey(
        Question, on_delete=models.PROTECT, related_name="attempt_selections"
    )
    subject = models.CharField(max_length=20, choices=Question.Subject.choices)
    sequence_no = models.PositiveSmallIntegerField()

    class Meta:
        ordering = ["sequence_no"]
        constraints = [
            models.UniqueConstraint(
                fields=["attempt", "question"], name="fm_attempt_question_unique"
            ),
            models.UniqueConstraint(
                fields=["attempt", "sequence_no"], name="fm_attempt_sequence_unique"
            ),
            models.CheckConstraint(
                condition=Q(sequence_no__gte=1, sequence_no__lte=QUESTION_COUNT),
                name="fm_attempt_sequence_range",
            ),
        ]
        indexes = [models.Index(fields=["attempt", "subject"], name="fm_attempt_subject_idx")]


class UserAnswer(models.Model):
    """A saved answer. is_correct / marks_awarded stay NULL until scoring (TRD §5.7)."""

    attempt = models.ForeignKey(TestAttempt, on_delete=models.CASCADE, related_name="answers")
    question = models.ForeignKey(
        Question, on_delete=models.PROTECT, related_name="attempt_answers"
    )
    selected_option = models.CharField(
        max_length=1, null=True, blank=True, choices=Question.Option.choices
    )
    is_correct = models.BooleanField(null=True, blank=True)
    marks_awarded = models.SmallIntegerField(null=True, blank=True)
    answered_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["id"]
        constraints = [
            models.UniqueConstraint(
                fields=["attempt", "question"], name="fm_user_answer_unique"
            ),
            models.CheckConstraint(
                condition=Q(marks_awarded__isnull=True) | Q(marks_awarded__in=[0, MARKS_PER_QUESTION]),
                name="fm_user_answer_marks",
            ),
        ]


class CsvUpload(models.Model):
    """Audit record for a CSV bulk import (PRD §7.6 Screen F, TRD §6.5)."""

    class Status(models.TextChoices):
        COMPLETED = "COMPLETED", "Completed"
        DRY_RUN = "DRY_RUN", "Dry run"
        FAILED = "FAILED", "Validation failed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    filename = models.CharField(max_length=255)
    status = models.CharField(max_length=16, choices=Status.choices)
    total_rows = models.PositiveIntegerField(default=0)
    created_rows = models.PositiveIntegerField(default=0)
    skipped_rows = models.PositiveIntegerField(default=0)
    failed_rows = models.PositiveIntegerField(default=0)
    errors = models.JSONField(default=list, blank=True)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="freemock_uploads",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
