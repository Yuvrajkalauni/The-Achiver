"""All LLM prompts live here (never inline in job code)."""

SYSTEM_RULES = """Return only valid JSON. Every question has exactly 4 distinct,
non-empty options and exactly one correct answer. Options must be
unambiguous: no "all of the above", no "none of the above", no trick
wording, and must be factually correct. Difficulty must be one of
easy, medium or hard."""

TOPICS: dict[str, list[str]] = {
    "Mathematics": ["algebra", "geometry", "trigonometry", "probability", "calculus basics"],
    "Physics": ["mechanics", "optics", "electricity", "thermodynamics", "waves"],
    "Chemistry": ["periodic table", "bonding", "acids and bases", "organic basics", "stoichiometry"],
    "English": [
        "grammar",
        "vocabulary",
        "synonyms and antonyms",
        "sentence correction",
        "reading comprehension with a short passage",
    ],
}

SUBJECTS = list(TOPICS.keys())
QUESTIONS_PER_SUBJECT = 25
BATCH_SIZE = 5
MAX_RETRIES_PER_SLOT = 3


def batch_prompt(subject: str, topic: str, count: int, avoid: list[str]) -> str:
    avoid_block = ""
    if avoid:
        avoid_block = "Do NOT repeat or closely paraphrase any of these existing questions:\n" + "\n".join(
            f"- {q}" for q in avoid[-40:]
        )
    return f"""{SYSTEM_RULES}

Write {count} multiple-choice questions for high-school level {subject},
topic: {topic}. Aim for a mix of easy, medium and hard difficulty.
{avoid_block}
JSON shape: {{"questions": [{{"text": "...", "options": ["...", "...", "...", "..."],
"correct_index": 0, "explanation": "one or two sentences", "difficulty": "easy"}}]}}
correct_index is the 0-based position of the single correct option."""


def verify_prompt(question_text: str, options: list[str]) -> str:
    listed = "\n".join(f"{chr(65 + i)}. {opt}" for i, opt in enumerate(options))
    return f"""Solve this multiple-choice question step by step, then answer.
Return only valid JSON: {{"answer": "B"}} where answer is the single
correct option letter.

{question_text}
{listed}"""


def explain_batch_prompt(items: list[dict]) -> str:
    lines = []
    for it in items:
        opts = "\n".join(f"{chr(65 + i)}. {o}" for i, o in enumerate(it["options"]))
        chosen = "unanswered" if it["chosen"] is None else f"the student chose {chr(65 + it['chosen'])}"
        lines.append(
            f'ID {it["id"]}: {it["text"]}\n{opts}\nCorrect answer: {chr(65 + it["correct"])}. '
            f'For this question, {chosen}.'
        )
    joined = "\n\n".join(lines)
    return f"""You are a friendly tutor. For EACH question below, write a short
encouragement-free explanation (2-3 sentences): why the correct answer is
right, and if the student chose wrongly, why their choice is wrong. The
student already knows their score; do not repeat it, just teach.
Return only valid JSON: {{"explanations": [{{"id": 123, "text": "..."}}]}}
Include every ID given, in any order.

{joined}"""


def summary_prompt(per_subject: dict, weak_topics: dict[str, list[str]]) -> str:
    lines = [f"- {s}: {v['score']}/{v['total']} correct" for s, v in per_subject.items()]
    weak = [f"- {s}: {', '.join(t[:6]) if t else 'none identified'}" for s, t in weak_topics.items()]
    return f"""You are a friendly tutor writing a short performance summary
(4-6 sentences, plain text, no JSON). Name the student's strengths and the
weak topics per subject, and give one concrete next step.

Scores:
{chr(10).join(lines)}

Missed topics:
{chr(10).join(weak)}"""
