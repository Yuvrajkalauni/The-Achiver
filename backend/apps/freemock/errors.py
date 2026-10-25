"""Standard JSON error envelope + request IDs (TRD §6.2)."""
import uuid

from rest_framework import status
from rest_framework.exceptions import APIException
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler


class FreemockError(APIException):
    """Domain error rendered as {"error": {code, message, details, request_id}}."""

    def __init__(self, code: str, message: str, status_code: int = 400, details: dict | None = None):
        super().__init__(detail=message)
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details or {}


def _request_id(request) -> str:
    rid = getattr(request, "request_id", None)
    return rid or f"req_{uuid.uuid4().hex[:12]}"


def exception_handler(exc, context):
    """DRF exception handler -> TRD §6.2 error shape."""
    request = context.get("request")
    response = drf_exception_handler(exc, context)

    if isinstance(exc, FreemockError):
        payload = {
            "error": {
                "code": exc.code,
                "message": exc.message,
                "details": exc.details,
                "request_id": _request_id(request),
            }
        }
        resp = Response(payload, status=exc.status_code)
    elif response is not None:
        # DRF built-ins (validation, auth, throttle, not found)
        code = getattr(exc, "default_code", None) or "error"
        if isinstance(exc.detail, dict):
            message = "Validation failed."
            details = exc.detail
        elif isinstance(exc.detail, list):
            message = exc.detail[0] if exc.detail else "Request failed."
            details = {}
        else:
            message = str(exc.detail)
            details = {}
        payload = {
            "error": {
                "code": str(code).upper(),
                "message": message,
                "details": details,
                "request_id": _request_id(request),
            }
        }
        response.data = payload
        return response
    else:
        payload = {
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "An unexpected server error occurred.",
                "details": {},
                "request_id": _request_id(request),
            }
        }
        resp = Response(payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    if request is not None:
        resp["X-Request-ID"] = _request_id(request)
    return resp
