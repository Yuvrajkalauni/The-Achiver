"""Minimal Ollama HTTP client (stdlib only): chat with JSON schema, /api/tags health."""
import json
import os
import urllib.request
from typing import Any

OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434").rstrip("/")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "qwen2.5:3b")

TIMEOUT_TAGS = 10
TIMEOUT_GEN = 240
TIMEOUT_VERIFY = 120
TIMEOUT_EXPLAIN = 240
TIMEOUT_SUMMARY = 120


class OllamaError(Exception):
    """Raised for transport errors, timeouts and malformed model output."""

    def __init__(self, message: str, fix: str = "") -> None:
        super().__init__(message)
        self.fix = fix


def _post(path: str, payload: dict[str, Any], timeout: int) -> dict[str, Any]:
    url = f"{OLLAMA_URL}{path}"
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.load(resp)
    except Exception as exc:
        raise OllamaError(
            f"Ollama request to {path} failed: {exc}",
            fix="Make sure Ollama is running (`ollama serve`) and reachable at " + OLLAMA_URL,
        ) from exc


def ollama_health(timeout: int = TIMEOUT_TAGS) -> tuple[bool, str]:
    """Check reachability AND that the configured model exists. Returns (ok, message)."""
    try:
        req = urllib.request.Request(f"{OLLAMA_URL}/api/tags")
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = json.load(resp)
    except Exception as exc:
        return False, (
            f"Ollama is not reachable at {OLLAMA_URL} ({exc}). "
            "Fix: start it with `ollama serve`."
        )
    names = [m.get("name", "") for m in data.get("models", [])]
    if OLLAMA_MODEL not in names and not any(n.startswith(OLLAMA_MODEL.split(":")[0] + ":") for n in names):
        return False, (
            f"Model '{OLLAMA_MODEL}' is not pulled. Fix: run `ollama pull {OLLAMA_MODEL}`. "
            f"Available: {', '.join(names) or 'none'}."
        )
    return True, f"Ollama OK ({OLLAMA_MODEL} available)."


def _extract_json(text: str) -> Any:
    """Parse model output, tolerating surrounding prose: use the first {...} block."""
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end <= start:
        raise OllamaError("Model did not return JSON.", fix="Retry the request; the 3B model is flaky.")
    try:
        return json.loads(text[start : end + 1])
    except json.JSONDecodeError as exc:
        raise OllamaError(f"Model returned malformed JSON: {exc}", fix="Retry the request.") from exc


QUESTION_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "questions": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "text": {"type": "string"},
                    "options": {"type": "array", "items": {"type": "string"}},
                    "correct_index": {"type": "integer"},
                    "explanation": {"type": "string"},
                    "difficulty": {"type": "string"},
                },
                "required": ["text", "options", "correct_index", "explanation", "difficulty"],
            },
        }
    },
    "required": ["questions"],
}

ANSWER_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {"answer": {"type": "string"}},
    "required": ["answer"],
}

EXPLAIN_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "explanations": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {"id": {"type": "integer"}, "text": {"type": "string"}},
                "required": ["id", "text"],
            },
        }
    },
    "required": ["explanations"],
}


def chat_json(
    prompt: str, schema: dict[str, Any], temperature: float, timeout: int
) -> Any:
    data = _post(
        "/api/chat",
        {
            "model": OLLAMA_MODEL,
            "messages": [{"role": "user", "content": prompt}],
            "format": schema,
            "options": {"temperature": temperature},
            "stream": False,
        },
        timeout,
    )
    try:
        content = data["message"]["content"]
    except (KeyError, TypeError) as exc:
        raise OllamaError("Unexpected Ollama response shape.", fix="Retry the request.") from exc
    return _extract_json(content)


def chat_text(prompt: str, temperature: float, timeout: int) -> str:
    data = _post(
        "/api/chat",
        {
            "model": OLLAMA_MODEL,
            "messages": [{"role": "user", "content": prompt}],
            "options": {"temperature": temperature},
            "stream": False,
        },
        timeout,
    )
    try:
        return str(data["message"]["content"]).strip()
    except (KeyError, TypeError) as exc:
        raise OllamaError("Unexpected Ollama response shape.", fix="Retry the request.") from exc
