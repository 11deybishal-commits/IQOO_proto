import httpx
from langchain_groq import ChatGroq
from app.core.config import settings


def get_llm() -> ChatGroq:
    """
    Returns the primary reasoning LLM using Groq.
    Uses qwen/qwen3.6-27b.
    Called fresh each time to avoid stale connections.
    """
    return ChatGroq(
        api_key=settings.GROQ_API_KEY,
        model_name="qwen/qwen3.6-27b",
        temperature=0.0,
        max_tokens=4096,
        http_client=httpx.Client(verify=False, timeout=60.0),
    )
