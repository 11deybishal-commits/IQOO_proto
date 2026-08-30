import os
import time

import httpx
from langchain_groq import ChatGroq

from app.core.config import settings

# Groq model IDs change over time; keep the app pinned to a currently supported model.
_PRIMARY_MODEL = "openai/gpt-oss-20b"
_FALLBACK_MODEL = "openai/gpt-oss-20b"


def get_llm(model: str = _PRIMARY_MODEL) -> ChatGroq:
    """
    Return a fresh Groq chat client configured for a currently supported model.
    """
    selected_model = (model or _PRIMARY_MODEL).strip() or _PRIMARY_MODEL
    if selected_model not in {"openai/gpt-oss-20b"}:
        selected_model = _PRIMARY_MODEL

    api_key = settings.GROQ_API_KEY or os.getenv("GROQ_API_KEY", "")
    return ChatGroq(
        api_key=api_key,
        model_name=selected_model,
        temperature=0.0,
        max_tokens=1024,
        http_client=httpx.Client(verify=False, timeout=90.0),
    )


def invoke_with_retry(llm: ChatGroq, messages: list, max_retries: int = 3) -> str:
    """
    Invoke an LLM while handling transient Groq errors and unsupported model deprecations.
    """
    import groq

    delays = [15, 30, 60]
    for attempt in range(max_retries):
        try:
            response = llm.invoke(messages)
            return response.content
        except groq.RateLimitError as e:
            if attempt < max_retries - 1:
                wait = delays[attempt]
                print(f"[LLM] Rate limit hit. Retrying in {wait}s (attempt {attempt + 1}/{max_retries})...")
                time.sleep(wait)
                if attempt == 1:
                    print(f"[LLM] Switching to fallback model: {_FALLBACK_MODEL}")
                    llm = get_llm(_FALLBACK_MODEL)
            else:
                raise e
        except Exception as e:
            message = str(e).lower()
            if any(token in message for token in ("decommissioned", "not found", "does not exist", "not available")):
                if attempt < max_retries - 1:
                    print(f"[LLM] Model unavailable. Retrying with supported model: {_FALLBACK_MODEL}")
                    llm = get_llm(_FALLBACK_MODEL)
                    continue
            raise e
    raise RuntimeError("LLM invocation failed after all retries")
