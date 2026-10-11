import sys
from django.apps import AppConfig


class MocklabConfig(AppConfig):
    name = "apps.mocklab"
    label = "mocklab"
    verbose_name = "AI MCQ Test Lab"

    def ready(self) -> None:
        # Startup reachability probe (never blocks boot, never crashes).
        if not any(a in ("runserver", "gunicorn") for a in sys.argv):
            return
        try:
            from .ollama import ollama_health

            ok, message = ollama_health(timeout=5)
            if not ok:
                print(f"[mocklab] WARNING: {message}", file=sys.stderr)
        except Exception as exc:  # pragma: no cover - defensive
            print(f"[mocklab] WARNING: startup Ollama probe failed: {exc}", file=sys.stderr)
