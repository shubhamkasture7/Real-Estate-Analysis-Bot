import os
import logging
from typing import Optional, List

from dotenv import load_dotenv
from google import genai

# Load .env locally; on Render, env vars are injected anyway.
load_dotenv()

logger = logging.getLogger(__name__)

_client: Optional[genai.Client] = None


def _get_client() -> Optional[genai.Client]:
    """
    Create and cache a configured Gemini client.

    Uses GEMINI_API_KEY or GOOGLE_API_KEY from environment.
    Returns None if the client cannot be created.
    """
    global _client

    if _client is not None:
        return _client

    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        logger.warning("No Gemini API key found. Set GEMINI_API_KEY or GOOGLE_API_KEY.")
        return None

    try:
        _client = genai.Client(api_key=api_key)
        logger.info("Gemini client initialized successfully.")
        return _client
    except Exception as e:
        logger.error("Failed to create Gemini client: %s", e, exc_info=True)
        _client = None
        return None


def _extract_text_from_response(response) -> Optional[str]:
    """
    Safely extract text from a Gemini response object WITHOUT using response.text,
    which may throw if no Parts exist.
    """
    # 1) Preferred: candidates -> content -> parts -> text
    try:
        candidates = getattr(response, "candidates", []) or []
        for cand in candidates:
            content = getattr(cand, "content", None)
            parts = getattr(content, "parts", None) if content else None
            if not parts:
                continue

            texts: List[str] = []
            for part in parts:
                t = getattr(part, "text", None)
                if t:
                    texts.append(t)

            if texts:
                return " ".join(texts).strip()
    except Exception as e:
        logger.warning("Failed to parse candidates/parts: %s", e, exc_info=True)

    # 2) Fallback: try content as a simple string if present
    try:
        cand0 = (getattr(response, "candidates", []) or [None])[0]
        if cand0:
            content = getattr(cand0, "content", None)
            if content:
                maybe_text = getattr(content, "text", None) or getattr(
                    content, "value", None
                )
                if isinstance(maybe_text, str) and maybe_text.strip():
                    return maybe_text.strip()
    except Exception:
        pass

    # No usable text found
    return None


def generate_summary_with_gemini(prompt: str) -> str:
    """
    Generate a short real-estate summary using Gemini.

    - Uses gemini-2.5-flash
    - Returns a safe mock summary if the client is unavailable, filtered,
      or if any error occurs, so that the Django API never crashes.
    """
    client = _get_client()
    if client is None:
        return "(Mock Summary: Gemini unavailable) " + prompt[:250]

    try:
        # SIMPLE call: no generation_config / safety_settings,
        # to be compatible with your current google-genai version
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )

        text = _extract_text_from_response(response)

        if not text:
            # Log finish reasons for debugging but keep response stable
            try:
                frs = [
                    getattr(c, "finish_reason", None)
                    for c in (getattr(response, "candidates", []) or [])
                ]
                logger.warning(
                    "Gemini returned empty or filtered result. finish_reasons=%s",
                    frs,
                )
            except Exception:
                logger.warning("Gemini returned empty or filtered result.")
            return "(Mock Summary: Gemini safety filtered text) " + prompt[:250]

        return text

    except Exception as e:
        logger.error("Gemini API failure: %s", e, exc_info=True)
        return "(Mock Summary: Gemini call failed) " + prompt[:250]
