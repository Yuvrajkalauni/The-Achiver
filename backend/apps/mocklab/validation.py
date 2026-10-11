"""Pure validation + scoring helpers (unit-tested, no I/O)."""
import random
import re
from typing import Any

DIFFICULTIES = ("easy", "medium", "hard")
LETTERS = "ABCD"


def normalize(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", text.lower())


def validate_question(q: dict[str, Any]) -> list[str]:
    """Return a list of problems; empty means valid."""
    errors: list[str] = []
    text = str(q.get("text", "")).strip()
    if not text:
        errors.append("empty text")
    options = q.get("options")
    if not isinstance(options, list) or len(options) != 4:
        errors.append("must have exactly 4 options")
        return errors
    cleaned = [str(o).strip() for o in options]
    if any(not o for o in cleaned):
        errors.append("empty option")
    lowered = [o.lower() for o in cleaned]
    if len(set(lowered)) != 4:
        errors.append("options must be distinct")
    banned = ("all of the above", "none of the above")
    if any(b in o for o in lowered for b in banned):
        errors.append("ambiguous option (all/none of the above)")
    ci = q.get("correct_index")
    if not isinstance(ci, bool) and isinstance(ci, int) and 0 <= ci <= 3:
        pass
    else:
        errors.append("correct_index must be 0-3")
    if str(q.get("explanation", "")).strip() == "":
        errors.append("empty explanation")
    if str(q.get("difficulty", "")).lower() not in DIFFICULTIES:
        errors.append("difficulty must be easy/medium/hard")
    return errors


def is_duplicate(text: str, seen: set[str]) -> bool:
    return normalize(text) in seen


def randomize_options(
    options: list[str], correct_index: int, rng: random.Random | None = None
) -> tuple[list[str], int]:
    """Shuffle option order so the key is not stuck on one letter."""
    rng = rng or random.Random()
    order = list(range(4))
    rng.shuffle(order)
    shuffled = [options[i] for i in order]
    return shuffled, order.index(correct_index)


def score_attempt(
    answers: dict[int, int | None], keys: dict[int, int]
) -> tuple[int, dict[int, str]]:
    """Deterministic scoring: exact option match only. Returns (score, verdicts)."""
    score = 0
    verdicts: dict[int, str] = {}
    for qid, correct in keys.items():
        chosen = answers.get(qid)
        if chosen is None:
            verdicts[qid] = "unanswered"
        elif chosen == correct:
            verdicts[qid] = "correct"
            score += 1
        else:
            verdicts[qid] = "wrong"
    return score, verdicts
