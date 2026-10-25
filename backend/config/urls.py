from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path

def health(_request):
    return JsonResponse({"status": "ok", "api": "v1", "app": "the-achievers"})

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/health/", health, name="health"),
    path("api/v1/freemock/", include("apps.freemock.urls")),
]
