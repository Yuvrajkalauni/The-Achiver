"""REST API for the AI MCQ Test Lab. Keys are never sent before submit."""
import json
import logging
import os
from datetime import timedelta

from django.db import transaction
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST

from .jobs import mark_stale_jobs_failed, start_evaluation, start_round, start_round_evaluation
from .models import LabAnswer, LabAttempt, LabQuestion, LabResult, LabTest
from .ollama import OLLAMA_MODEL, OLLAMA_URL, ollama_health
from .validation import score_attempt

logger = logging.getLogger(__name__)

PASS_MARK = float(os.environ.get("MOCKLAB_PASS_MARK", "0.4"))
DEFAULT_MINUTES = int(os.environ.get("MOCKLAB_DEFAULT_MINUTES", "100"))


def _body(request):
    try:
        return json.loads(request.body.decode("utf-8") or "{}")
    except (json.JSONDecodeError, UnicodeDecodeError):
        return None


def _err(message: str, status: int = 400, fix: str = ""):
    payload: dict = {"error": message}
    if fix:
        payload["fix"] = fix
    return JsonResponse(payload, status=status)


@require_GET
def health(request):
    ok, message = ollama_health()
    return JsonResponse(
        {"ollama_url": OLLAMA_URL, "model": OLLAMA_MODEL, "ok": ok, "message": message},
        status=200 if ok else 503,
    )


@csrf_exempt
@require_POST
def generate_test(request):
    mark_stale_jobs_failed()
    ok, message = ollama_health()
    if not ok:
        return _err(message, 503, fix="Run `ollama serve` then `ollama pull qwen2.5:3b`.")
    test = LabTest.objects.create(status=LabTest.STATUS_QUEUED, total=100)
    start_round(test.pk)
    logger.info("mocklab generate started test=%s", test.pk)
    return JsonResponse({"testId": test.pk, "status": test.status}, status=202)


@csrf_exempt
@require_POST
def generate_next(request, test_id: int):
    """Generate the next round of 5. 409 while busy or when the set is complete."""
    mark_stale_jobs_failed()
    try:
        test = LabTest.objects.get(pk=test_id)
    except LabTest.DoesNotExist:
        return _err("Test not found.", 404)
    if test.status == LabTest.STATUS_FAILED:
        return _err(test.error or "Test failed.", 409)
    if test.status == LabTest.STATUS_GENERATING:
        return _err("Generation already running.", 409)
    if LabQuestion.objects.filter(test=test).count() >= test.total:
        return JsonResponse({"testId": test.pk, "complete": True})
    start_round(test.pk)
    made = LabQuestion.objects.filter(test=test).count()
    return JsonResponse({"testId": test.pk, "round": made // 5, "complete": False}, status=202)


@require_GET
def test_status(request, test_id: int):
    mark_stale_jobs_failed()
    try:
        test = LabTest.objects.get(pk=test_id)
    except LabTest.DoesNotExist:
        return _err("Test not found.", 404)
    return JsonResponse(
        {
            "testId": test.pk,
            "status": test.status,
            "generated": test.generated_count,
            "total": test.total,
            "per_subject": test.per_subject,
            "error": test.error,
        }
    )


@require_GET
def latest_test(request):
    mark_stale_jobs_failed()
    test = LabTest.objects.first()
    if test is None:
        return JsonResponse({"test": None})
    return JsonResponse(
        {
            "test": {
                "testId": test.pk,
                "status": test.status,
                "generated": test.generated_count,
                "total": test.total,
                "per_subject": test.per_subject,
                "created_at": test.created_at.isoformat(),
            }
        }
    )


def _serialize_attempt_payload(attempt: LabAttempt) -> dict:
    questions = list(LabQuestion.objects.filter(test=attempt.test).order_by("order"))
    saved = {a.question_id: a.selected for a in attempt.answers.all()}
    elapsed = (timezone.now() - attempt.started_at).total_seconds()
    remaining = max(0, int(attempt.duration_minutes * 60 - elapsed))
    submitted = set(attempt.submitted_rounds or [])
    return {
        "attemptId": attempt.pk,
        "testId": attempt.test_id,
        "status": attempt.status,
        "duration_minutes": attempt.duration_minutes,
        "remaining_s": remaining,
        "answered": sum(1 for v in saved.values() if v is not None),
        "total": len(questions),
        "submitted_rounds": attempt.submitted_rounds,
        "round_results": attempt.round_results,
        "test_complete": len(questions) >= attempt.test.total,
        "questions": [
            {
                "id": q.id,
                "subject": q.subject,
                "topic": q.topic,
                "text": q.text,
                "options": q.options,
                "difficulty": q.difficulty,
                "order": q.order,
                "round_no": q.round_no,
                # Keys only for rounds already submitted (never leak the active round).
                **({"correct_index": q.correct_index} if q.round_no in submitted else {}),
            }
            for q in questions
        ],
        "answers": {str(k): v for k, v in saved.items()},
    }


def _auto_submit_if_expired(attempt: LabAttempt) -> bool:
    """Submit synchronously when the timer ran out. Returns True if submitted here."""
    if attempt.status != LabAttempt.STATUS_IN_PROGRESS:
        return False
    elapsed = (timezone.now() - attempt.started_at).total_seconds()
    if elapsed < attempt.duration_minutes * 60:
        return False
    _submit_attempt(attempt, timed_out=True)
    return True


def _submit_attempt(attempt: LabAttempt, timed_out: bool = False) -> LabAttempt:
    with transaction.atomic():
        attempt = LabAttempt.objects.select_for_update().get(pk=attempt.pk)
        if attempt.status == LabAttempt.STATUS_SUBMITTED:
            return attempt
        questions = list(LabQuestion.objects.filter(test=attempt.test).order_by("order"))
        answers = {a.question_id: a.selected for a in attempt.answers.all()}
        keys = {q.id: q.correct_index for q in questions}
        score, _ = score_attempt(answers, keys)
        per_subject: dict[str, dict[str, int]] = {}
        for q in questions:
            cell = per_subject.setdefault(q.subject, {"score": 0, "total": 0})
            cell["total"] += 1
            if answers.get(q.id) == q.correct_index:
                cell["score"] += 1
        attempt.status = LabAttempt.STATUS_SUBMITTED
        attempt.submitted_at = timezone.now()
        attempt.time_taken_s = int((attempt.submitted_at - attempt.started_at).total_seconds())
        attempt.score = score
        attempt.total = len(questions)
        attempt.per_subject = per_subject
        attempt.evaluation_ready = False
        attempt.save()
    logger.info("mocklab attempt=%s submitted score=%s/%s timed_out=%s", attempt.pk, score, len(questions), timed_out)
    start_evaluation(attempt.pk)
    return attempt


@csrf_exempt
@require_POST
def start_attempt(request, test_id: int):
    try:
        test = LabTest.objects.get(pk=test_id)
    except LabTest.DoesNotExist:
        return _err("Test not found.", 404)
    if test.status == LabTest.STATUS_FAILED:
        return _err(test.error or "Test failed.", 409)
    body = _body(request)
    if body is None:
        return _err("Invalid JSON body.", 400)
    minutes = body.get("minutes", DEFAULT_MINUTES)
    if not isinstance(minutes, int) or not 5 <= minutes <= 300:
        return _err("minutes must be an integer between 5 and 300.", 400)
    attempt = LabAttempt.objects.create(test=test, duration_minutes=minutes)
    return JsonResponse({"attemptId": attempt.pk, "testId": test.pk}, status=201)


@require_GET
def get_attempt(request, attempt_id: int):
    try:
        attempt = LabAttempt.objects.select_related("test").get(pk=attempt_id)
    except LabAttempt.DoesNotExist:
        return _err("Attempt not found.", 404)
    _auto_submit_if_expired(attempt)
    attempt.refresh_from_db()
    payload = _serialize_attempt_payload(attempt)
    payload["pass_mark"] = PASS_MARK
    return JsonResponse(payload)


@csrf_exempt
def save_answer(request, attempt_id: int, question_id: int):
    if request.method != "PUT":
        return _err("Method not allowed.", 405)
    try:
        attempt = LabAttempt.objects.get(pk=attempt_id)
    except LabAttempt.DoesNotExist:
        return _err("Attempt not found.", 404)
    if _auto_submit_if_expired(attempt):
        return _err("Time ran out — the attempt was auto-submitted.", 409)
    if attempt.status != LabAttempt.STATUS_IN_PROGRESS:
        return _err("Attempt already submitted.", 409)
    try:
        question = LabQuestion.objects.get(pk=question_id, test=attempt.test)
    except LabQuestion.DoesNotExist:
        return _err("Question not part of this attempt.", 404)
    body = _body(request)
    if body is None or "selected" not in body:
        return _err('Body must be JSON like {"selected": 0-3 or null}.', 400)
    selected = body["selected"]
    if selected is not None and selected not in (0, 1, 2, 3):
        return _err("selected must be 0, 1, 2, 3 or null (clears the answer).", 400)
    # One row per (attempt, question): selecting another option REPLACES it.
    LabAnswer.objects.update_or_create(
        attempt=attempt, question=question, defaults={"selected": selected}
    )
    return JsonResponse({"attemptId": attempt.pk, "questionId": question.pk, "selected": selected})


@csrf_exempt
@require_POST
def submit_attempt(request, attempt_id: int):
    try:
        attempt = LabAttempt.objects.get(pk=attempt_id)
    except LabAttempt.DoesNotExist:
        return _err("Attempt not found.", 404)
    if LabQuestion.objects.filter(test=attempt.test).count() < attempt.test.total:
        return _err("Finish all 20 rounds before the final submit.", 409)
    attempt = _submit_attempt(attempt)  # idempotent: double submit is safe
    return JsonResponse(
        {
            "attemptId": attempt.pk,
            "status": attempt.status,
            "score": attempt.score,
            "total": attempt.total,
            "time_taken_s": attempt.time_taken_s,
            "evaluation_ready": attempt.evaluation_ready,
        }
    )


@require_GET
def get_result(request, attempt_id: int):
    try:
        attempt = LabAttempt.objects.select_related("test").get(pk=attempt_id)
    except LabAttempt.DoesNotExist:
        return _err("Attempt not found.", 404)
    if attempt.status != LabAttempt.STATUS_SUBMITTED:
        return _err("Attempt not submitted yet.", 409)
    questions = list(LabQuestion.objects.filter(test=attempt.test).order_by("order"))
    try:
        result = attempt.result
        verdicts = result.verdicts
        ai_map = result.ai_explanations
    except LabResult.DoesNotExist:
        verdicts, ai_map = [], {}
    by_id = {q.id: q for q in questions}
    review = []
    for v in verdicts:
        q = by_id.get(v["question_id"])
        if q is None:
            continue
        exp = ai_map.get(str(q.id), {"text": q.explanation, "ai": False})
        review.append(
            {
                "question_id": q.id,
                "subject": q.subject,
                "topic": q.topic,
                "text": q.text,
                "options": q.options,
                "difficulty": q.difficulty,
                "selected": v["selected"],
                "correct_index": v["correct_index"],
                "verdict": v["verdict"],
                "explanation": exp.get("text", q.explanation),
                "explanation_ai": bool(exp.get("ai", False)),
            }
        )
    percentage = round(100 * attempt.score / max(attempt.total, 1), 1)
    return JsonResponse(
        {
            "attemptId": attempt.pk,
            "testId": attempt.test_id,
            "score": attempt.score,
            "total": attempt.total,
            "percentage": percentage,
            "passed": percentage >= PASS_MARK * 100,
            "pass_mark": PASS_MARK,
            "time_taken_s": attempt.time_taken_s,
            "per_subject": attempt.per_subject,
            "ai_summary": attempt.ai_summary,
            "ai_summary_fallback": attempt.ai_summary_fallback,
            "evaluation_ready": attempt.evaluation_ready,
            "review": review,
        }
    )


@csrf_exempt
@require_POST
def submit_round(request, attempt_id: int):
    """Score one 5-question round now; AI explanations follow in the background."""
    from .jobs import score_round

    try:
        attempt = LabAttempt.objects.get(pk=attempt_id)
    except LabAttempt.DoesNotExist:
        return _err("Attempt not found.", 404)
    if _auto_submit_if_expired(attempt):
        return _err("Time ran out — the attempt was auto-submitted.", 409)
    if attempt.status != LabAttempt.STATUS_IN_PROGRESS:
        return _err("Attempt already submitted.", 409)
    body = _body(request)
    if body is None or not isinstance(body.get("round"), int):
        return _err('Body must be JSON like {"round": 0}.', 400)
    round_no: int = body["round"]
    questions = list(
        LabQuestion.objects.filter(test=attempt.test, round_no=round_no).order_by("order")
    )
    if len(questions) != 5:
        return _err("That round is not generated yet.", 409)
    if round_no in (attempt.submitted_rounds or []):
        cached = (attempt.round_results or {}).get(str(round_no), {})
        return JsonResponse(
            {
                "attemptId": attempt.pk,
                "round": round_no,
                "score": cached.get("score", 0),
                "total": 5,
                "ready": cached.get("ready", False),
            }
        )
    answers = {a.question_id: a.selected for a in attempt.answers.all()}
    score, _ = score_round(questions, answers)
    attempt.submitted_rounds = (attempt.submitted_rounds or []) + [round_no]
    attempt.round_results[str(round_no)] = {"score": score, "total": 5, "ready": False, "explanations": {}}
    attempt.save(update_fields=["submitted_rounds", "round_results"])
    start_round_evaluation(attempt.pk, round_no)
    return JsonResponse({"attemptId": attempt.pk, "round": round_no, "score": score, "total": 5, "ready": False})


@csrf_exempt
@require_POST
def repeat_attempt(request, test_id: int):
    """New attempt on the SAME questions, answers cleared, timer reset."""
    try:
        test = LabTest.objects.get(pk=test_id)
    except LabTest.DoesNotExist:
        return _err("Test not found.", 404)
    if test.status == LabTest.STATUS_FAILED:
        return _err(test.error or "Test failed.", 409)
    body = _body(request) or {}
    minutes = body.get("minutes", DEFAULT_MINUTES)
    if not isinstance(minutes, int) or not 5 <= minutes <= 300:
        return _err("minutes must be an integer between 5 and 300.", 400)
    attempt = LabAttempt.objects.create(test=test, duration_minutes=minutes)
    return JsonResponse({"attemptId": attempt.pk, "testId": test.pk}, status=201)
