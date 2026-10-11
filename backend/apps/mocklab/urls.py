from django.urls import path

from . import views

urlpatterns = [
    path("health/", views.health, name="mocklab-health"),
    path("tests/generate", views.generate_test, name="mocklab-generate"),
    path("tests/latest", views.latest_test, name="mocklab-latest"),
    path("tests/<int:test_id>/status", views.test_status, name="mocklab-status"),
    path("tests/<int:test_id>/attempts", views.start_attempt, name="mocklab-start"),
    path("tests/<int:test_id>/repeat", views.repeat_attempt, name="mocklab-repeat"),
    path("attempts/<int:attempt_id>", views.get_attempt, name="mocklab-attempt"),
    path(
        "attempts/<int:attempt_id>/answers/<int:question_id>",
        views.save_answer,
        name="mocklab-answer",
    ),
    path("attempts/<int:attempt_id>/submit", views.submit_attempt, name="mocklab-submit"),
    path("attempts/<int:attempt_id>/result", views.get_result, name="mocklab-result"),
]
