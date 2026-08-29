import time
import httpx
from langchain_groq import ChatGroq
from app.core.config import settings

# Primary: llama-3.1-8b-instant has 20K TPM on free tier — much better than qwen 8K TPM
_PRIMARY_MODEL = "llama-3.1-8b-instant"
_FALLBACK_MODEL = "gemma2-9b-it"


def get_llm(model: str = _PRIMARY_MODEL) -> ChatGroq:
    """
    Returns the primary reasoning LLM using Groq.
    Uses llama-3.1-8b-instant (20K TPM free tier).
    Called fresh each time to avoid stale connections.
    """
    return ChatGroq(
        api_key=settings.GROQ_API_KEY,
        model_name=model,
        temperature=0.0,
        max_tokens=1024,
        http_client=httpx.Client(verify=False, timeout=90.0),
    )


def invoke_with_retry(llm: ChatGroq, messages: list, max_retries: int = 3) -> str:
    """
    Invoke LLM with automatic retry on 429 rate-limit errors.
    Uses exponential backoff: 15s, 30s, 60s.
    Falls back to gemma2-9b-it on repeated failures.
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
                # Switch to fallback model on second retry
                if attempt == 1:
                    print(f"[LLM] Switching to fallback model: {_FALLBACK_MODEL}")
                    llm = get_llm(_FALLBACK_MODEL)
            else:
                raise e
        except Exception as e:
            raise e
    raise RuntimeError("LLM invocation failed after all retries")
