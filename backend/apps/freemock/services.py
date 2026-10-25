"""Business logic for the Free Mock Test (PRD §9, TRD §7).

Everything here runs on the server: question selection, deadline enforcement
and scoring are authoritative and never trust the browser.
"""
import csv
import hashlib
import io
import re
import secrets
from datetime import timedelta

from django.conf import settings
from django.db import connection, transaction
from django.db.models import Count, Q
from django.utils import timezone

from .errors import FreemockError
from .models import (
    DURATION_MINUTES,
    MARKS_PER_QUESTION,
    QUESTIONS_PER_SUBJECT,
    QUESTION_COUNT,
    SUBJECTS,
    AttemptQuestion,
    CsvUpload,
    Question,
    TestAttempt,
    UserAnswer,
)

# --------------------------------------------------------------------------- #
# Owner token (anonymous identity, PRD §16 decision: no registration required)
# --------------------------------------------------------------------------- #


def new_owner_token() -> str:
    return secrets.token_hex(32)


def hash_owner(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


# --------------------------------------------------------------------------- #
# Test generation (TRD §7.1)
# --------------------------------------------------------------------------- #


def pool_shortfall() -> str | None:
    """Return the first subject with fewer than 4 active questions, else None."""
    counts = dict(
        Question.objects.filter(is_active=True)
        .values_list("subject")
        .annotate(n=Count("id"))
        .values_list("subject", "n")
    )
    for subject in SUBJECTS:
        if counts.get(subject, 0) < QUESTIONS_PER_SUBJECT:
            return subject
    return None


def _display_subject(subject: str) -> str:
    try:
        return Question.Subject(subject).label
    except ValueError:  # pragma: no cover - defensive
        return subject


def _insufficient_pool(subject: str) -> FreemockError:
    return FreemockError(
        code="INSUFFICIENT_QUESTION_POOL",
        message=(
            "This test is temporarily unavailable because the question bank is "
            f"incomplete for {_display_subject(subject)}. Please try again later."
        ),
        status_code=422,
        details={"subject": subject},
    )


def is_expired(attempt: TestAttempt) -> bool:
    return timezone.now() >= attempt.expires_at


def _locked(queryset):
    """Row lock where the backend supports it (PostgreSQL); no-op on SQLite,
    which locks the whole database on write anyway (TRD §7.4)."""
    if connection.features.has_select_for_update:
        return queryset.select_for_update()
    return queryset


@transaction.atomic
def start_attempt(owner_token: str | None) -> tuple[TestAttempt, bool, str]:
    """Create (or return) the owner's single active attempt.

    Returns (attempt, created, owner_token). Rolls back entirely when any
    subject lacks four active questions (PRD §9.1, TRD §7.1).
    """
    issued_token = owner_token or new_owner_token()
    owner_hash = hash_owner(issued_token)

    active = (
        _locked(TestAttempt.objects.filter(owner_hash=owner_hash, status=TestAttempt.Status.IN_PROGRESS))
        .order_by("-created_at")
        .first()
    )
    if active is not None:
        if not is_expired(active):
            return active, False, issued_token
        # Deadline passed without a client submit -> finalize, then allow a new test.
        finalize_attempt(active, reason=TestAttempt.Reason.TIME_EXPIRED)

    shortfall = pool_shortfall()
    if shortfall:
        raise _insufficient_pool(shortfall)

    now = timezone.now()
    attempt = TestAttempt.objects.create(
        owner_hash=owner_hash,
        started_at=now,
        expires_at=now + timedelta(minutes=DURATION_MINUTES),
    )

    rows: list[AttemptQuestion] = []
    sequence = 1
    for subject in SUBJECTS:
        picked = list(
            Question.objects.filter(subject=subject, is_active=True).order_by("?")[
                :QUESTIONS_PER_SUBJECT
            ]
        )
        if len(picked) != QUESTIONS_PER_SUBJECT:  # pragma: no cover - guarded above
            raise _insufficient_pool(subject)
        for question in picked:
            rows.append(
                AttemptQuestion(
                    attempt=attempt, question=question, subject=subject, sequence_no=sequence
                )
            )
            sequence += 1

    if len(rows) != QUESTION_COUNT:  # pragma: no cover - invariant guard
        raise FreemockError(
            code="INSUFFICIENT_QUESTION_POOL",
            message="This test is temporarily unavailable because the question bank is incomplete. Please try again later.",
            status_code=422,
        )
    AttemptQuestion.objects.bulk_create(rows)
    return attempt, True, issued_token


def attempt_questions(attempt: TestAttempt) -> list[AttemptQuestion]:
    return list(
        AttemptQuestion.objects.filter(attempt=attempt)
        .select_related("question")
        .order_by("sequence_no")
    )


def saved_answers(attempt: TestAttempt) -> dict[str, str]:
    return {
        str(a.question_id): a.selected_option
        for a in attempt.answers.all()
        if a.selected_option is not None
    }


# --------------------------------------------------------------------------- #
# Answer persistence (TRD §7.2)
# --------------------------------------------------------------------------- #


def save_answers(
    attempt_id, owner_hash: str, answers: list[dict]
) -> tuple[int, "TestAttempt"]:
    """Validate ownership/deadline, then persist in one transaction.

    The expiry finalization deliberately happens *outside* the write
    transaction so that raising afterwards cannot roll back the scoring.
    """
    attempt = TestAttempt.objects.filter(id=attempt_id).first()
    if attempt is None or attempt.owner_hash != owner_hash:
        raise FreemockError("NOT_FOUND", "Attempt not found.", status_code=404)

    if attempt.status != TestAttempt.Status.IN_PROGRESS:
        raise FreemockError(
            "ATTEMPT_ALREADY_SUBMITTED",
            "This test attempt has already been submitted.",
            status_code=409,
        )
    if is_expired(attempt):
        finalize_attempt(attempt, reason=TestAttempt.Reason.TIME_EXPIRED)
        raise FreemockError(
            "ATTEMPT_EXPIRED",
            "The deadline for this attempt has passed.",
            status_code=422,
            details={"attempt_id": str(attempt.id)},
        )

    expired = _persist(attempt_id, owner_hash, answers)
    if expired:
        finalize_attempt(attempt, reason=TestAttempt.Reason.TIME_EXPIRED)
        raise FreemockError(
            "ATTEMPT_EXPIRED",
            "The deadline for this attempt has passed.",
            status_code=422,
            details={"attempt_id": str(attempt.id)},
        )

    attempt.refresh_from_db(fields=["answered_questions", "updated_at"])
    return len(answers), attempt


@transaction.atomic
def _persist(attempt_id, owner_hash: str, answers: list[dict]) -> bool:
    """Upsert answers inside a locked transaction.

    Returns True when the deadline passed while we were writing (nothing is
    saved in that case).
    """
    attempt = _locked(TestAttempt.objects.filter(id=attempt_id)).first()
    if attempt is None or attempt.owner_hash != owner_hash:
        raise FreemockError("NOT_FOUND", "Attempt not found.", status_code=404)
    if attempt.status != TestAttempt.Status.IN_PROGRESS:
        raise FreemockError(
            "ATTEMPT_ALREADY_SUBMITTED",
            "This test attempt has already been submitted.",
            status_code=409,
        )
    if is_expired(attempt):
        return True

    valid_ids = set(
        str(v) for v in attempt.attempt_questions.values_list("question_id", flat=True)
    )
    for item in answers:
        question_id = str(item.get("question_id", ""))
        option = item.get("selected_option")
        if question_id not in valid_ids:
            raise FreemockError(
                "INVALID_QUESTION",
                "One or more questions do not belong to this attempt.",
                status_code=422,
                details={"question_id": question_id},
            )
        if option is not None and option not in ("A", "B", "C", "D"):
            raise FreemockError(
                "INVALID_OPTION",
                "selected_option must be A, B, C, D or null.",
                status_code=422,
            )
        UserAnswer.objects.update_or_create(
            attempt=attempt,
            question_id=question_id,
            defaults={"selected_option": option},
        )

    answered = attempt.answers.exclude(selected_option__isnull=True).count()
    TestAttempt.objects.filter(pk=attempt.pk).update(
        answered_questions=answered, updated_at=timezone.now()
    )
    return False


# --------------------------------------------------------------------------- #
# Scoring + finalization (TRD §7.3, §7.4)
# --------------------------------------------------------------------------- #


@transaction.atomic
def finalize_attempt(attempt: TestAttempt, reason: str) -> TestAttempt:
    """Score and finalize exactly once. Repeat calls return the stored result."""
    locked = _locked(TestAttempt.objects.filter(pk=attempt.pk)).get(pk=attempt.pk)
    if locked.status in (TestAttempt.Status.SUBMITTED, TestAttempt.Status.EXPIRED):
        return locked

    pairs = AttemptQuestion.objects.filter(attempt=locked).values_list(
        "question_id", "question__correct_option"
    )
    answers = {
        a.question_id: a
        for a in _locked(UserAnswer.objects.filter(attempt=locked)).select_related("question")
    }

    correct = 0
    answered = 0
    for question_id, correct_option in pairs:
        answer = answers.get(question_id)
        selected = answer.selected_option if answer else None
        if selected is not None:
            answered += 1
        is_correct = selected is not None and selected == correct_option
        marks = MARKS_PER_QUESTION if is_correct else 0
        if is_correct:
            correct += 1
        if answer is not None:
            answer.is_correct = is_correct
            answer.marks_awarded = marks
            answer.save(update_fields=["is_correct", "marks_awarded", "updated_at"])

    now = timezone.now()
    expired = now >= locked.expires_at
    locked.status = (
        TestAttempt.Status.EXPIRED if expired or reason == TestAttempt.Reason.TIME_EXPIRED
        else TestAttempt.Status.SUBMITTED
    )
    locked.submission_reason = (
        TestAttempt.Reason.TIME_EXPIRED
        if expired or reason == TestAttempt.Reason.TIME_EXPIRED
        else TestAttempt.Reason.USER_SUBMITTED
    )
    locked.submitted_at = now
    locked.correct_answers = correct
    locked.answered_questions = answered
    locked.score = correct * MARKS_PER_QUESTION
    locked.save(
        update_fields=[
            "status",
            "submission_reason",
            "submitted_at",
            "correct_answers",
            "answered_questions",
            "score",
            "updated_at",
        ]
    )
    return locked


def finalize_if_expired(attempt: TestAttempt) -> TestAttempt:
    """Convert an expired IN_PROGRESS attempt into a scored EXPIRED attempt."""
    if attempt.status == TestAttempt.Status.IN_PROGRESS and is_expired(attempt):
        return finalize_attempt(attempt, reason=TestAttempt.Reason.TIME_EXPIRED)
    return attempt


def expire_stale_attempts() -> int:
    """Background worker entry point (TRD §7.5): finalize every expired attempt."""
    ids = list(
        TestAttempt.objects.filter(
            status=TestAttempt.Status.IN_PROGRESS, expires_at__lte=timezone.now()
        ).values_list("id", flat=True)
    )
    for attempt_id in ids:
        attempt = TestAttempt.objects.filter(id=attempt_id).first()
        if attempt is not None:
            finalize_attempt(attempt, reason=TestAttempt.Reason.TIME_EXPIRED)
    return len(ids)


def summary_by_subject(attempt: TestAttempt) -> list[dict]:
    rows = list(
        AttemptQuestion.objects.filter(attempt=attempt)
        .values("subject")
        .annotate(total=Count("id"))
        .order_by("subject")
    )
    subject_of = dict(
        AttemptQuestion.objects.filter(attempt=attempt).values_list("question_id", "subject")
    )
    correct_by_subject: dict[str, int] = {}
    for answer in attempt.answers.filter(is_correct=True):
        subject = subject_of.get(answer.question_id)
        if subject:
            correct_by_subject[subject] = correct_by_subject.get(subject, 0) + 1

    return [
        {
            "subject": row["subject"],
            "correct": correct_by_subject.get(row["subject"], 0),
            "total": row["total"],
            "marks": correct_by_subject.get(row["subject"], 0) * MARKS_PER_QUESTION,
        }
        for row in rows
    ]


# --------------------------------------------------------------------------- #
# CSV bulk import (PRD §9.5, TRD §6.5)
# --------------------------------------------------------------------------- #

REQUIRED_COLUMNS = [
    "subject",
    "question_text",
    "option_a",
    "option_b",
    "option_c",
    "option_d",
    "correct_option",
    "explanation",
    "difficulty",
]
MAX_CSV_BYTES = getattr(settings, "MAX_CSV_UPLOAD_BYTES", 10 * 1024 * 1024)
MAX_CSV_ROWS = getattr(settings, "MAX_CSV_ROWS", 10000)


def _norm(text: str | None) -> str:
    return re.sub(r"\s+", " ", (text or "")).strip().lower()


def validate_csv(file_obj) -> tuple[list[dict], list[dict], dict]:
    """Validate the whole file before any write (all-or-nothing, PRD §9.5).

    Returns (rows, errors, stats). rows is empty when validation failed.
    """
    errors: list[dict] = []
    stats = {"total_rows": 0, "valid_rows": 0, "invalid_rows": 0, "duplicate_rows": 0}

    raw = file_obj.read()
    if len(raw) > MAX_CSV_BYTES:
        raise FreemockError(
            "FILE_TOO_LARGE",
            f"File exceeds the {MAX_CSV_BYTES // (1024 * 1024)} MB limit.",
            status_code=413,
        )
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise FreemockError(
            "INVALID_ENCODING", "File must be UTF-8 encoded CSV.", status_code=422
        )

    reader = csv.DictReader(io.StringIO(text))
    header = [h.strip() for h in (reader.fieldnames or [])]
    missing = [c for c in REQUIRED_COLUMNS if c not in header]
    extra = [c for c in header if c not in REQUIRED_COLUMNS]
    if missing or extra:
        details = {}
        if missing:
            details["missing_columns"] = missing
        if extra:
            details["unexpected_columns"] = extra
        raise FreemockError(
            "INVALID_HEADER",
            "CSV header must match the template exactly.",
            status_code=422,
            details=details,
        )

    existing = {
        (subject, _norm(text))
        for subject, text in Question.objects.values_list("subject", "question_text")
    }
    seen_in_file: set[tuple[str, str]] = set()

    rows: list[dict] = []
    for index, raw_row in enumerate(reader, start=1):
        stats["total_rows"] = index
        if index > MAX_CSV_ROWS:
            raise FreemockError(
                "TOO_MANY_ROWS", f"File exceeds the {MAX_CSV_ROWS} row limit.", status_code=413
            )

        row_errors: list[tuple[str, str, str]] = []
        subject_raw = (raw_row.get("subject") or "").strip().upper()
        aliases = {
            "ENGLISH": "ENGLISH",
            "MATH": "MATHEMATICS",
            "MATHS": "MATHEMATICS",
            "MATHEMATICS": "MATHEMATICS",
            "PHYSICS": "PHYSICS",
            "CHEMISTRY": "CHEMISTRY",
            "BIO": "BIOLOGY",
            "BIOLOGY": "BIOLOGY",
        }
        subject = aliases.get(subject_raw, "")
        if not subject:
            row_errors.append(
                ("INVALID_SUBJECT", "subject", "subject must be one of the five supported subjects")
            )

        question_text = (raw_row.get("question_text") or "").strip()
        if not question_text:
            row_errors.append(("EMPTY_QUESTION_TEXT", "question_text", "question_text is required"))

        options: dict[str, str] = {}
        for letter, column in (("A", "option_a"), ("B", "option_b"), ("C", "option_c"), ("D", "option_d")):
            value = (raw_row.get(column) or "").strip()
            if not value:
                row_errors.append(
                    ("EMPTY_OPTION", column, f"{column} must not be empty")
                )
            options[letter] = value

        correct = (raw_row.get("correct_option") or "").strip().upper()
        if correct not in ("A", "B", "C", "D"):
            row_errors.append(
                ("INVALID_CORRECT_OPTION", "correct_option", "correct_option must be A, B, C, or D")
            )

        difficulty_raw = (raw_row.get("difficulty") or "").strip()
        difficulty: int | None = None
        if difficulty_raw:
            try:
                difficulty = int(difficulty_raw)
                if difficulty < 1 or difficulty > 5:
                    raise ValueError
            except ValueError:
                difficulty = None
                row_errors.append(
                    ("INVALID_DIFFICULTY", "difficulty", "difficulty must be an integer from 1 to 5")
                )

        if row_errors:
            stats["invalid_rows"] += 1
            for code, field, message in row_errors:
                errors.append({"row": index, "code": code, "field": field, "message": message})
            continue

        dedupe_key = (subject, _norm(question_text))
        if dedupe_key in seen_in_file or dedupe_key in existing:
            stats["duplicate_rows"] += 1
            continue

        seen_in_file.add(dedupe_key)
        rows.append(
            {
                "subject": subject,
                "question_text": question_text,
                "options": options,
                "correct_option": correct,
                "explanation": (raw_row.get("explanation") or "").strip(),
                "difficulty": difficulty,
            }
        )

    stats["valid_rows"] = len(rows)
    if errors:
        stats["invalid_rows"] = len({e["row"] for e in errors})
        return [], errors, stats
    return rows, [], stats


@transaction.atomic
def import_questions(rows: list[dict], created_by=None) -> int:
    """bulk_create only after full validation (TRD §6.5)."""
    objects = [
        Question(
            subject=row["subject"],
            question_text=row["question_text"],
            options=row["options"],
            correct_option=row["correct_option"],
            explanation=row["explanation"],
            difficulty=row["difficulty"],
            created_by=created_by,
        )
        for row in rows
    ]
    Question.objects.bulk_create(objects, batch_size=1000)
    return len(objects)


def process_upload(file_obj, filename: str, dry_run: bool, uploaded_by=None) -> CsvUpload:
    rows, errors, stats = validate_csv(file_obj)
    if errors:
        upload = CsvUpload.objects.create(
            filename=filename,
            status=CsvUpload.Status.FAILED,
            total_rows=stats["total_rows"],
            failed_rows=stats["invalid_rows"],
            skipped_rows=stats["duplicate_rows"],
            errors=errors,
            uploaded_by=uploaded_by,
        )
        return upload

    if dry_run:
        return CsvUpload.objects.create(
            filename=filename,
            status=CsvUpload.Status.DRY_RUN,
            total_rows=stats["total_rows"],
            skipped_rows=stats["duplicate_rows"],
            errors=[],
            uploaded_by=uploaded_by,
        )

    created = import_questions(rows, created_by=uploaded_by)
    return CsvUpload.objects.create(
        filename=filename,
        status=CsvUpload.Status.COMPLETED,
        total_rows=stats["total_rows"],
        created_rows=created,
        skipped_rows=stats["duplicate_rows"],
        errors=[],
        uploaded_by=uploaded_by,
    )
