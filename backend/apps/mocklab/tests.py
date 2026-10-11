"""Unit tests: validator, scoring, and the one-answer-per-question rule."""
import random

from django.test import TestCase

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
