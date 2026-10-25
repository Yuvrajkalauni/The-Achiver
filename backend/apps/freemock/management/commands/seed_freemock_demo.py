"""Seed demo questions so the test flow can be exercised before the real
100-question CSV is imported.

    python manage.py seed_freemock_demo           # add 25 demo questions
    python manage.py seed_freemock_demo --clear   # remove demo data

Demo rows are tagged with a "[DEMO]" prefix in the explanation field so
--clear can identify them safely.
"""
from django.core.management.base import BaseCommand

from apps.freemock.models import AttemptQuestion, Question, TestAttempt, UserAnswer

DEMO = {
    "ENGLISH": [
        ("Choose the correctly spelled word.", "Accomodation", "Accommodation", "Acommodation", "Accommmodation", "B"),
        ("What is the synonym of 'rapid'?", "Slow", "Quick", "Silent", "Heavy", "B"),
        ("Identify the noun: 'The dog barked loudly.'", "barked", "loudly", "dog", "the", "C"),
        ("Choose the correct passive form: 'She writes a letter.'", "A letter is written by her.", "A letter writes her.", "A letter was write by her.", "Her letter is writing.", "A"),
        ("Which word is an adjective?", "Run", "Beautiful", "Quickly", "And", "B"),
    ],
    "MATHEMATICS": [
        ("What is 15% of 200?", "15", "25", "30", "45", "C"),
        ("Solve for x: 2x + 4 = 10", "2", "3", "4", "5", "B"),
        ("What is the square root of 144?", "10", "11", "12", "14", "C"),
        ("The sum of angles in a triangle is:", "90°", "180°", "270°", "360°", "B"),
        ("What is 7 × 8?", "54", "56", "63", "58", "B"),
    ],
    "PHYSICS": [
        ("What is the SI unit of force?", "Joule", "Watt", "Newton", "Pascal", "C"),
        ("Speed is defined as:", "Distance × Time", "Distance ÷ Time", "Time ÷ Distance", "Displacement × Time", "B"),
        ("Which law states every action has an equal and opposite reaction?", "Newton's first law", "Newton's second law", "Newton's third law", "Law of gravitation", "C"),
        ("The acceleration due to gravity is approximately:", "8.9 m/s²", "9.8 m/s²", "10.8 m/s²", "7.6 m/s²", "B"),
        ("Light travels fastest in:", "Vacuum", "Water", "Glass", "Steel", "A"),
    ],
    "CHEMISTRY": [
        ("What is the chemical formula of water?", "HO", "H2O", "H3O", "O2H", "B"),
        ("The pH of a neutral solution is:", "0", "7", "10", "14", "B"),
        ("Which gas is known as laughing gas?", "NO", "NO2", "N2O", "N2O5", "C"),
        ("Sodium chloride is commonly known as:", "Baking soda", "Table salt", "Washing soda", "Slaked lime", "B"),
        ("The atomic number of carbon is:", "4", "6", "8", "12", "B"),
    ],
    "BIOLOGY": [
        ("Which organelle is the powerhouse of the cell?", "Nucleus", "Ribosome", "Mitochondria", "Golgi body", "C"),
        ("Photosynthesis mainly occurs in:", "Roots", "Leaves", "Stem", "Flower", "B"),
        ("The basic unit of life is:", "Tissue", "Organ", "Cell", "Organ system", "C"),
        ("Which blood cells fight infection?", "Red blood cells", "White blood cells", "Platelets", "Plasma", "B"),
        ("Human heart has how many chambers?", "2", "3", "4", "5", "C"),
    ],
}


class Command(BaseCommand):
    help = "Seed (or clear) demo Free Mock Test questions."

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear", action="store_true", help="Remove demo questions and their attempts."
        )

    def handle(self, *args, **options):
        if options["clear"]:
            demo_ids = Question.objects.filter(explanation__startswith="[DEMO]").values_list(
                "id", flat=True
            )
            attempt_ids = AttemptQuestion.objects.filter(question_id__in=list(demo_ids)).values_list(
                "attempt_id", flat=True
            )
            UserAnswer.objects.filter(attempt_id__in=list(attempt_ids)).delete()
            TestAttempt.objects.filter(id__in=list(attempt_ids)).delete()
            deleted, _ = Question.objects.filter(explanation__startswith="[DEMO]").delete()
            self.stdout.write(self.style.SUCCESS(f"Removed {deleted} demo record(s)."))
            return

        created = 0
        for subject, items in DEMO.items():
            for text, a, b, c, d, correct in items:
                Question.objects.get_or_create(
                    subject=subject,
                    question_text=text,
                    defaults={
                        "options": {"A": a, "B": b, "C": c, "D": d},
                        "correct_option": correct,
                        "explanation": "[DEMO] Seeded demo question.",
                        "difficulty": 2,
                    },
                )
                created += 1
        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded {created} demo questions across {len(DEMO)} subjects."
            )
        )
