"""Background jobs: test generation and AI evaluation. Thread-based, progress in DB."""
import logging
import random
import threading
import time
from typing import Any

from django.db import close_old_connections, transaction
from django.utils import timezone

from . import prompts
from .models import LabAttempt, LabQuestion, LabResult, LabTest
from .ollama import (
    ANSWER_SCHEMA,
    EXPLAIN_SCHEMA,
    QUESTION_SCHEMA,
    TIMEOUT_EXPLAIN,
    TIMEOUT_GEN,
    TIMEOUT_SUMMARY,
    TIMEOUT_VERIFY,
    OllamaError,
    chat_json,
    chat_text,
    ollama_health,
)
from .validation import LETTERS, is_duplicate, normalize, randomize_options, score_attempt, validate_question

logger = logging.getLogger(__name__)

STALE_JOB_SECONDS = 5 * 60


def _update_progress(test_id: int) -> None:
    test = LabTest.objects.get(pk=test_id)
    counts: dict[str, int] = {s: 0 for s in prompts.SUBJECTS}
    for q in LabQuestion.objects.filter(test_id=test_id).only("subject"):
        counts[q.subject] = counts.get(q.subject, 0) + 1
    test.generated_count = sum(counts.values())
    test.per_subject = counts
    test.save(update_fields=["generated_count", "per_subject", "updated_at"])


def _fail(test_id: int, message: str) -> None:
    LabTest.objects.filter(pk=test_id).update(status=LabTest.STATUS_FAILED, error=message)


def _verify(options: list[str], text: str) -> int | None:
    """Ask the model to solve without the key. Returns option index or None."""
    try:
        data = chat_json(prompts.verify_prompt(text, options), ANSWER_SCHEMA, 0.0, TIMEOUT_VERIFY)
        letter = str(data.get("answer", "")).strip().upper()[:1]
        if letter in LETTERS:
            return LETTERS.index(letter)
    except OllamaError as exc:
        logger.warning("verify call failed: %s", exc)
    return None


def _fill_slots(
    test: LabTest,
    subject: str,
    topic: str,
    needed: int,
    seen: set[str],
    rng: random.Random,
    order_start: int,
) -> tuple[int, bool]:
    """Generate `needed` verified questions. Returns (accepted, ok)."""
    accepted = 0
    attempts = 0
    while accepted < needed:
        attempts += 1
        if attempts > needed * prompts.MAX_RETRIES_PER_SLOT + 2:
            return accepted, False
        batch_n = min(prompts.BATCH_SIZE, needed - accepted)
        try:
            existing = list(
                LabQuestion.objects.filter(test=test).values_list("text", flat=True)[:200]
            )
            data = chat_json(
                prompts.batch_prompt(subject, topic, batch_n, existing),
                QUESTION_SCHEMA,
                0.7,
                TIMEOUT_GEN,
            )
        except OllamaError as exc:
            logger.warning("generate call failed (%s/%s): %s", subject, topic, exc)
            time.sleep(2)
            continue
        raw = data.get("questions", [])
        if not isinstance(raw, list):
            continue
        for q in raw:
            if accepted >= needed:
                break
            if not isinstance(q, dict) or validate_question(q):
                continue
            if is_duplicate(str(q["text"]), seen):
                continue
            options, correct = randomize_options(
                [str(o).strip() for o in q["options"]], int(q["correct_index"]), rng
            )
            solved = _verify(options, str(q["text"]).strip())
            if solved is None or solved != correct:
                continue  # verification failed: discard, slot retried by loop
            with transaction.atomic():
                LabQuestion.objects.create(
                    test=test,
                    subject=subject,
                    topic=topic,
                    text=str(q["text"]).strip(),
                    options=options,
                    correct_index=correct,
                    explanation=str(q.get("explanation", "")).strip(),
                    difficulty=str(q.get("difficulty", "medium")).lower(),
                    order=order_start + accepted,
                )
            seen.add(normalize(str(q["text"])))
            accepted += 1
            _update_progress(test.pk)
    return accepted, True


def run_generation(test_id: int) -> None:
    close_old_connections()
    try:
        test = LabTest.objects.get(pk=test_id)
    except LabTest.DoesNotExist:
        return
    ok, message = ollama_health()
    if not ok:
        _fail(test_id, message)
        return
    try:
        LabTest.objects.filter(pk=test_id).update(status=LabTest.STATUS_GENERATING)
        seen: set[str] = set()
        for row in LabQuestion.objects.values_list("text", flat=True):
            seen.add(normalize(row))
        rng = random.Random()
        order = 0
        per_subject_target = prompts.QUESTIONS_PER_SUBJECT
        for subject in prompts.SUBJECTS:
            have = LabQuestion.objects.filter(test=test, subject=subject).count()
            topics = prompts.TOPICS[subject]
            # Spread remaining slots across the 5 topics.
            remaining = per_subject_target - have
            ti = 0
            while remaining > 0:
                topic = topics[ti % len(topics)]
                take = min(prompts.BATCH_SIZE, remaining)
                got, ok_slots = _fill_slots(test, subject, topic, take, seen, rng, order)
                order += got
                remaining -= got
                if not ok_slots:
                    _fail(
                        test_id,
                        f"Generation stalled on {subject}/{topic} after retries. "
                        "The 3B model kept failing validation/verification — try again later.",
                    )
                    return
                ti += 1
        LabTest.objects.filter(pk=test_id).update(status=LabTest.STATUS_READY, error="")
    except Exception as exc:  # never leave a test stuck in generating
        logger.exception("generation job crashed")
        _fail(test_id, f"Generation crashed: {exc}")
    finally:
        close_old_connections()


def start_generation(test_id: int) -> None:
    t = threading.Thread(target=run_generation, args=(test_id,), daemon=True)
    t.start()


def mark_stale_jobs_failed() -> None:
    """A restart kills threads: flip long-silent 'generating' tests to failed."""
    cutoff = timezone.now().timestamp() - STALE_JOB_SECONDS
    for test in LabTest.objects.filter(status=LabTest.STATUS_GENERATING):
        if test.updated_at.timestamp() < cutoff:
            test.status = LabTest.STATUS_FAILED
            test.error = "Server restarted during generation. Start a new test to retry."
            test.save(update_fields=["status", "error"])


def _evaluate_attempt(attempt_id: int) -> None:
    close_old_connections()
    try:
        attempt = LabAttempt.objects.select_related("test").get(pk=attempt_id)
        questions = list(LabQuestion.objects.filter(test=attempt.test).order_by("order"))
        answers = {a.question_id: a.selected for a in attempt.answers.all()}
        keys = {q.id: q.correct_index for q in questions}
        score, verdicts = score_attempt(answers, keys)

        per_subject: dict[str, dict[str, int]] = {}
        weak: dict[str, list[str]] = {}
        for q in questions:
            cell = per_subject.setdefault(q.subject, {"score": 0, "total": 0})
            cell["total"] += 1
            if verdicts[q.id] == "correct":
                cell["score"] += 1
            else:
                weak.setdefault(q.subject, [])
                if q.topic and q.topic not in weak[q.subject]:
                    weak[q.subject].append(q.topic)

        # AI explanations in batches of 5; fall back to stored text per question.
        need = [q for q in questions if verdicts[q.id] != "correct"]
        ai_text: dict[int, dict[str, Any]] = {}
        for i in range(0, len(need), 5):
            chunk = need[i : i + 5]
            payload = [
                {
                    "id": q.id,
                    "text": q.text,
                    "options": q.options,
                    "correct": q.correct_index,
                    "chosen": answers.get(q.id),
                }
                for q in chunk
            ]
            try:
                data = chat_json(prompts.explain_batch_prompt(payload), EXPLAIN_SCHEMA, 0.4, TIMEOUT_EXPLAIN)
                for item in data.get("explanations", []):
                    if isinstance(item, dict) and item.get("id") in keys:
                        ai_text[int(item["id"])] = {"text": str(item.get("text", "")), "ai": True}
            except OllamaError as exc:
                logger.warning("explain batch failed: %s", exc)
            for q in chunk:
                ai_text.setdefault(q.id, {"text": q.explanation, "ai": False})

        try:
            summary = chat_text(prompts.summary_prompt(per_subject, weak), 0.5, TIMEOUT_SUMMARY)
            summary_fallback = False
        except OllamaError as exc:
            logger.warning("summary call failed: %s", exc)
            best = max(per_subject.items(), key=lambda kv: kv[1]["score"] / max(kv[1]["total"], 1))
            summary = (
                f"You scored {score}/{len(questions)}. Strongest area: {best[0]} "
                f"({best[1]['score']}/{best[1]['total']}). Review the explanations below, "
                "especially the topics you missed, and try another test."
            )
            summary_fallback = True

        with transaction.atomic():
            LabResult.objects.update_or_create(
                attempt=attempt,
                defaults={
                    "score": score,
                    "total": len(questions),
                    "verdicts": [
                        {
                            "question_id": q.id,
                            "selected": answers.get(q.id),
                            "correct_index": q.correct_index,
                            "verdict": verdicts[q.id],
                        }
                        for q in questions
                    ],
                    "ai_explanations": {str(k): v for k, v in ai_text.items()},
                },
            )
            attempt.score = score
            attempt.total = len(questions)
            attempt.per_subject = per_subject
            attempt.ai_summary = summary
            attempt.ai_summary_fallback = summary_fallback
            attempt.evaluation_ready = True
            attempt.save()
    except Exception:
        logger.exception("evaluation job crashed")
    finally:
        close_old_connections()


def start_evaluation(attempt_id: int) -> None:
    t = threading.Thread(target=_evaluate_attempt, args=(attempt_id,), daemon=True)
    t.start()
