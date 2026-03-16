"""
Shared OpenAI client wrapper for AI summary and simulation recommendations.
Uses gpt-4o-mini by default. Centralizes timeout and error handling.
Logs only lengths/IDs, never full prompt or response content.
"""

import logging
import re

from app.core.config import settings

logger = logging.getLogger(__name__)


def chat_completion(
    system_message: str,
    user_message: str,
    *,
    model: str | None = None,
    timeout_seconds: float | None = None,
) -> str | None:
    """
    Call OpenAI chat completions with system + user message.
    Returns the assistant message content, or None on any failure.
    Logs only message lengths and optional context_id for debugging.
    """
    api_key = getattr(settings, "openai_api_key", None) or settings.openai_api_key
    if not api_key:
        logger.warning("OPENAI_API_KEY not set; skipping LLM call.")
        return None

    model = model or settings.openai_model
    timeout = timeout_seconds if timeout_seconds is not None else settings.openai_timeout_seconds

    # Safe logging: lengths only
    logger.debug(
        "openai_request model=%s system_len=%d user_len=%d",
        model,
        len(system_message),
        len(user_message),
    )

    try:
        from openai import OpenAI

        client = OpenAI(api_key=api_key, timeout=timeout)
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": user_message},
            ],
        )
        choice = response.choices[0] if response.choices else None
        if not choice or not getattr(choice, "message", None):
            logger.warning("openai_response empty choices")
            return None
        content = (choice.message.content or "").strip()
        logger.debug("openai_response content_len=%d", len(content))
        return content
    except Exception as e:  # noqa: BLE001
        logger.warning("openai_request failed: %s", type(e).__name__, exc_info=False)
        return None


def normalize_text(text: str) -> str:
    """Strip and collapse whitespace; optional single-line cleanup."""
    if not text:
        return ""
    s = re.sub(r"\s+", " ", text.strip())
    return s.strip()
