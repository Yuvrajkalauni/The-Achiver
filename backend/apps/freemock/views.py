"""Free Mock Test API views (TRD §6.4 student endpoints, §6.5 admin)."""
import csv
import io

from django.contrib.auth import authenticate
from django.db import transaction
from django.db.models import Count, Q
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.authtoken.models import Token
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .errors import FreemockError
from .models import QUESTION_COUNT, SUBJECTS, CsvUpload, Question, TestAttempt
from .serializers import (
    AdminLoginSerializer,
    AnswersSerializer,
    StartSerializer,
    SubmitSerializer,
    attempt_meta,
    questions_payload,
    result_payload,
    resume_payload,
    start_payload,
)
from . import services

OWNER_HEADER = "X-FM-Owner"


def _owner_hash(request) -> str | None:
    token = request.headers.get(OWNER_HEADER) or request.headers.get("x-fm-owner")
    if not token:
        return None
    return services.hash_owner(token.strip())


def _load_owned_attempt(attempt_id, owner_hash: str | None) -> TestAttempt:
    """Ownership is checked without revealing whether the attempt exists (PRD §10.12)."""
    attempt = TestAttempt.objects.filter(id=attempt_id).first()
    if attempt is None or owner_hash is None or attempt.owner_hash != owner_hash:
        raise FreemockError("NOT_FOUND", "Attempt not found.", status_code=404)
    return attempt


# --------------------------------------------------------------------------- #
# Student endpoints
# --------------------------------------------------------------------------- #


class StartView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "fm_start"

    def post(self, request):
        StartSerializer(data=request.data or {}).is_valid(raise_exception=True)
        header_token = request.headers.get(OWNER_HEADER)
        with transaction.atomic():
            attempt, created, owner_token = services.start_attempt(header_token)
        return Response(
            start_payload(attempt, owner_token, created),
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class ActiveView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "fm_read"

    def get(self, request):
        owner_hash = _owner_hash(request)
        if not owner_hash:
            return Response({"attempt": None, "questions": []})
        attempt = (
            TestAttempt.objects.filter(
                owner_hash=owner_hash, status=TestAttempt.Status.IN_PROGRESS
            )
            .order_by("-created_at")
            .first()
        )
        if attempt is None:
            return Response({"attempt": None, "questions": []})
        attempt = services.finalize_if_expired(attempt)
        if attempt.status != TestAttempt.Status.IN_PROGRESS:
            return Response(
                {
                    "attempt": attempt_meta(attempt),
                    "questions": [],
                    "requires_result": True,
                }
            )
        return Response(resume_payload(attempt))


class AttemptView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "fm_read"

    def get(self, request, attempt_id):
        attempt = _load_owned_attempt(attempt_id, _owner_hash(request))
        attempt = services.finalize_if_expired(attempt)
        if attempt.status != TestAttempt.Status.IN_PROGRESS:
            return Response(
                {
                    "attempt": attempt_meta(attempt),
                    "questions": [],
                    "requires_result": True,
                }
            )
        return Response(resume_payload(attempt))


class AnswersView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "fm_save"

    def patch(self, request, attempt_id):
        owner_hash = _owner_hash(request)
        _load_owned_attempt(attempt_id, owner_hash)  # ownership first
        serializer = AnswersSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        saved, attempt = services.save_answers(
            attempt_id, owner_hash, serializer.validated_data["answers"]
        )
        return Response(
            {
                "attempt_id": str(attempt.id),
                "saved": saved,
                "answered_questions": attempt.answered_questions,
                "server_time": attempt_meta(attempt)["server_time"],
            }
        )


class SubmitView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "fm_submit"

    def post(self, request):
        serializer = SubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        attempt = _load_owned_attempt(data["attempt_id"], _owner_hash(request))

        if attempt.status == TestAttempt.Status.IN_PROGRESS:
            pending = data.get("answers") or []
            if pending:
                try:
                    services.save_answers(attempt.id, _owner_hash(request), pending)
                except FreemockError as exc:
                    if exc.code != "ATTEMPT_EXPIRED":
                        raise
            expired = services.is_expired(attempt)
            attempt = services.finalize_attempt(
                attempt,
                reason=(
                    TestAttempt.Reason.TIME_EXPIRED
                    if expired
                    else TestAttempt.Reason.USER_SUBMITTED
                ),
            )
        return Response(result_payload(attempt))


class ResultView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "fm_read"

    def get(self, request, attempt_id):
        attempt = _load_owned_attempt(attempt_id, _owner_hash(request))
        attempt = services.finalize_if_expired(attempt)
        if attempt.status == TestAttempt.Status.IN_PROGRESS:
            raise FreemockError(
                "ATTEMPT_IN_PROGRESS",
                "This attempt has not been submitted yet.",
                status_code=409,
            )
        return Response(result_payload(attempt))


class HistoryView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "fm_read"

    def get(self, request):
        owner_hash = _owner_hash(request)
        if not owner_hash:
            return Response({"attempts": []})
        rows = TestAttempt.objects.filter(owner_hash=owner_hash).exclude(
            status=TestAttempt.Status.IN_PROGRESS
        ).order_by("-created_at")[:20]
        return Response(
            {
                "attempts": [
                    {
                        "id": str(a.id),
                        "status": a.status,
                        "score": a.score,
                        "started_at": attempt_meta(a)["started_at"],
                        "submitted_at": attempt_meta(a)["submitted_at"],
                        "correct_answers": a.correct_answers,
                    }
                    for a in rows
                ]
            }
        )


# --------------------------------------------------------------------------- #
# Admin endpoints (all require an authenticated staff user)
# --------------------------------------------------------------------------- #


class AdminLoginView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "fm_admin_login"

    def post(self, request):
        serializer = AdminLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = authenticate(
            username=serializer.validated_data["username"],
            password=serializer.validated_data["password"],
        )
        if user is None or not user.is_staff:
            raise FreemockError(
                "INVALID_CREDENTIALS",
                "Invalid username or password.",
                status_code=status.HTTP_401_UNAUTHORIZED,
            )
        token, _ = Token.objects.get_or_create(user=user)
        return Response({"token": token.key, "username": user.username})


class AdminPermission(permissions.BasePermission):
    message = "Administrator access required."

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.is_staff)


class AdminOverviewView(APIView):
    permission_classes = [permissions.IsAuthenticated, AdminPermission]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "fm_admin"

    def get(self, request):
        active = {
            r["subject"]: r["n"]
            for r in Question.objects.filter(is_active=True)
            .values("subject")
            .annotate(n=Count("id"))
        }
        inactive = {
            r["subject"]: r["n"]
            for r in Question.objects.filter(is_active=False)
            .values("subject")
            .annotate(n=Count("id"))
        }
        subjects = [
            {
                "subject": subject,
                "active": active.get(subject, 0),
                "inactive": inactive.get(subject, 0),
                "minimum_met": active.get(subject, 0) >= services.QUESTIONS_PER_SUBJECT,
            }
            for subject in SUBJECTS
        ]
        attempts = dict(
            TestAttempt.objects.values_list("status")
            .annotate(n=Count("id"))
            .values_list("status", "n")
        )
        return Response(
            {
                "subjects": subjects,
                "warnings": [s["subject"] for s in subjects if not s["minimum_met"]],
                "totals": {
                    "active_questions": sum(active.values()),
                    "inactive_questions": sum(inactive.values()),
                    "attempts": sum(attempts.values()),
                    "in_progress": attempts.get(TestAttempt.Status.IN_PROGRESS, 0),
                    "completed": attempts.get(TestAttempt.Status.SUBMITTED, 0)
                    + attempts.get(TestAttempt.Status.EXPIRED, 0),
                },
                "recent_uploads": [
                    _upload_row(u) for u in CsvUpload.objects.all()[:5]
                ],
            }
        )


def _upload_row(upload: CsvUpload) -> dict:
    return {
        "id": str(upload.id),
        "filename": upload.filename,
        "status": upload.status,
        "total_rows": upload.total_rows,
        "created": upload.created_rows,
        "skipped": upload.skipped_rows,
        "failed": upload.failed_rows,
        "errors": upload.errors[:20],
        "uploaded_by": upload.uploaded_by.username if upload.uploaded_by else None,
        "created_at": upload.created_at.isoformat().replace("+00:00", "Z"),
    }


class AdminUploadView(APIView):
    permission_classes = [permissions.IsAuthenticated, AdminPermission]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "fm_upload"

    def post(self, request):
        file = request.FILES.get("file")
        if file is None:
            raise FreemockError("FILE_REQUIRED", "A CSV file is required.", status_code=422)
        if not file.name.lower().endswith(".csv"):
            raise FreemockError(
                "INVALID_FILE_TYPE", "Only .csv files are accepted.", status_code=422
            )
        dry_run = str(request.data.get("dry_run", "false")).lower() in ("1", "true", "yes", "on")

        # stream -> bytes for size validation inside the service
        upload = services.process_upload(io.BytesIO(file.read()), file.name, dry_run, request.user)

        payload = _upload_row(upload)
        if upload.status == CsvUpload.Status.FAILED:
            return Response(payload, status=status.HTTP_422_UNPROCESSABLE_ENTITY)
        payload["message"] = (
            "Validation passed. No rows were written (dry run)."
            if dry_run
            else f"Imported {upload.created_rows} questions."
        )
        return Response(payload, status=status.HTTP_201_CREATED)


class AdminUploadsView(APIView):
    permission_classes = [permissions.IsAuthenticated, AdminPermission]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "fm_admin"

    def get(self, request):
        return Response({"uploads": [_upload_row(u) for u in CsvUpload.objects.all()[:50]]})


class AdminTemplateView(APIView):
    permission_classes = [permissions.IsAuthenticated, AdminPermission]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "fm_admin"

    def get(self, request):
        buffer = io.StringIO()
        writer = csv.writer(buffer)
        writer.writerow(services.REQUIRED_COLUMNS)
        writer.writerow(
            [
                "ENGLISH",
                "Choose the correct spelling.",
                "Accomodation",
                "Accommodation",
                "Acommodation",
                "Accommmodation",
                "B",
                "Accommodation has two c's and two m's.",
                "1",
            ]
        )
        response = HttpResponse(buffer.getvalue(), content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="free_mock_test_template.csv"'
        return response


class AdminQuestionsView(APIView):
    permission_classes = [permissions.IsAuthenticated, AdminPermission]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "fm_admin"

    def get(self, request):
        queryset = Question.objects.all().order_by("-created_at")
        subject = request.query_params.get("subject")
        if subject:
            queryset = queryset.filter(subject=subject.upper())
        if request.query_params.get("active") in ("0", "false"):
            queryset = queryset.filter(is_active=False)
        search = request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                Q(question_text__icontains=search) | Q(subject__icontains=search)
            )
        page = max(1, int(request.query_params.get("page", "1")))
        per_page = 20
        offset = (page - 1) * per_page
        return Response(
            {
                "count": queryset.count(),
                "page": page,
                "results": [
                    {
                        "id": str(q.id),
                        "subject": q.subject,
                        "question_text": q.question_text,
                        "correct_option": q.correct_option,
                        "difficulty": q.difficulty,
                        "is_active": q.is_active,
                        "created_at": q.created_at.isoformat().replace("+00:00", "Z"),
                    }
                    for q in queryset[offset : offset + per_page]
                ],
            }
        )


class AdminQuestionToggleView(APIView):
    """Soft deactivation only — historical attempts keep their questions (TRD §13)."""

    permission_classes = [permissions.IsAuthenticated, AdminPermission]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "fm_admin"

    def post(self, request, question_id):
        question = Question.objects.filter(id=question_id).first()
        if question is None:
            raise FreemockError("NOT_FOUND", "Question not found.", status_code=404)
        question.is_active = not question.is_active
        question.save(update_fields=["is_active", "updated_at"])
        return Response({"id": str(question.id), "is_active": question.is_active})
