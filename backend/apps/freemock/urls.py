from django.urls import path

from . import views

app_name = "freemock"

urlpatterns = [
    # Student (anonymous) API
    path("test/start", views.StartView.as_view(), name="start"),
    path("test/active", views.ActiveView.as_view(), name="active"),
    path("test/attempts/<uuid:attempt_id>", views.AttemptView.as_view(), name="attempt"),
    path(
        "test/attempts/<uuid:attempt_id>/answers",
        views.AnswersView.as_view(),
        name="answers",
    ),
    path("test/submit", views.SubmitView.as_view(), name="submit"),
    path(
        "test/attempts/<uuid:attempt_id>/result",
        views.ResultView.as_view(),
        name="result",
    ),
    path("test/history", views.HistoryView.as_view(), name="history"),
    # Admin API
    path("admin/login", views.AdminLoginView.as_view(), name="admin-login"),
    path("admin/overview", views.AdminOverviewView.as_view(), name="admin-overview"),
    path("admin/upload", views.AdminUploadView.as_view(), name="admin-upload"),
    path("admin/uploads", views.AdminUploadsView.as_view(), name="admin-uploads"),
    path("admin/template", views.AdminTemplateView.as_view(), name="admin-template"),
    path("admin/questions", views.AdminQuestionsView.as_view(), name="admin-questions"),
    path(
        "admin/questions/<uuid:question_id>/toggle",
        views.AdminQuestionToggleView.as_view(),
        name="admin-question-toggle",
    ),
]
