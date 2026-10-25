"""Finalize every expired in-progress attempt (TRD §7.5 expiry worker).

Run periodically, e.g. every minute:
    python manage.py freemock_expire
"""
from django.core.management.base import BaseCommand

from apps.freemock.services import expire_stale_attempts


class Command(BaseCommand):
    help = "Finalize Free Mock Test attempts whose deadline has passed."

    def handle(self, *args, **options):
        count = expire_stale_attempts()
        self.stdout.write(
            self.style.SUCCESS(f"Finalized {count} expired attempt(s).")
        )
