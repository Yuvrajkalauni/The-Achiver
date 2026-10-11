"""SQLite tables for the AI MCQ Test Lab (tests/questions/attempts/answers/results)."""
from django.db import models


class LabTest(models.Model):
    STATUS_QUEUED = "queued"
    STATUS_GENERATING = "generating"
    STATUS_READY = "ready"
    STATUS_FAILED = "failed"
    STATUS_CHOICES = [
        (STATUS_QUEUED, "Queued"),
        (STATUS_GENERATING, "Generating"),
        (STATUS_READY, "Ready"),
        (STATUS_FAILED, "Failed"),
    ]

    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default=STATUS_QUEUED)
    total = models.PositiveIntegerField(default=100)
    generated_count = models.PositiveIntegerField(default=0)
    per_subject = models.JSONField(default=dict)  # {"Mathematics": 12, ...}
    error = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"LabTest {self.pk} ({self.status} {self.generated_count}/{self.total})"


class LabQuestion(models.Model):
    test = models.ForeignKey(LabTest, related_name="questions", on_delete=models.CASCADE)
    subject = models.CharField(max_length=32)
    topic = models.CharField(max_length=64, blank=True, default="")
    text = models.TextField()
    options = models.JSONField(default=list)  # exactly 4 strings, correct position randomized
    correct_index = models.PositiveSmallIntegerField()
    explanation = models.TextField(blank=True, default="")
    difficulty = models.CharField(max_length=16, default="medium")
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["order"]

    def __str__(self) -> str:
        return f"Q{self.pk} [{self.subject}]"


class LabAttempt(models.Model):
    STATUS_IN_PROGRESS = "in_progress"
    STATUS_SUBMITTED = "submitted"

    test = models.ForeignKey(LabTest, related_name="attempts", on_delete=models.CASCADE)
    status = models.CharField(max_length=16, default=STATUS_IN_PROGRESS)
    duration_minutes = models.PositiveIntegerField(default=100)
    started_at = models.DateTimeField(auto_now_add=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    time_taken_s = models.PositiveIntegerField(default=0)
    score = models.PositiveIntegerField(default=0)
    total = models.PositiveIntegerField(default=0)
    per_subject = models.JSONField(default=dict)  # {"Mathematics": {"score": n, "total": m}}
    ai_summary = models.TextField(blank=True, default="")
    ai_summary_fallback = models.BooleanField(default=False)
    evaluation_ready = models.BooleanField(default=False)

    def __str__(self) -> str:
        return f"Attempt {self.pk} ({self.status})"


class LabAnswer(models.Model):
    """One row per (attempt, question): selecting another option REPLACES this row's value."""

    attempt = models.ForeignKey(LabAttempt, related_name="answers", on_delete=models.CASCADE)
    question = models.ForeignKey(LabQuestion, related_name="answers", on_delete=models.CASCADE)
    selected = models.PositiveSmallIntegerField(null=True, blank=True)  # null = cleared
    answered_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["attempt", "question"], name="unique_answer_per_question"),
        ]

    def __str__(self) -> str:
        return f"Answer attempt={self.attempt_id} q={self.question_id} selected={self.selected}"


class LabResult(models.Model):
    """Deterministic verdicts + AI feedback for one submitted attempt."""

    attempt = models.OneToOneField(LabAttempt, related_name="result", on_delete=models.CASCADE)
    score = models.PositiveIntegerField(default=0)
    total = models.PositiveIntegerField(default=0)
    verdicts = models.JSONField(default=list)  # [{question_id, selected, correct_index, verdict}]
    ai_explanations = models.JSONField(default=dict)  # {question_id: {"text": str, "ai": bool}}
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"Result attempt={self.attempt_id} {self.score}/{self.total}"
