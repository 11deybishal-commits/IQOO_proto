from langchain_groq import ChatGroq
from app.core.config import settings

def get_llm() -> ChatGroq:
    """
    Returns the primary reasoning LLM using Groq.
    Model: Llama-3.3-70b-versatile is recommended for complex agentic reasoning.
    """
    return ChatGroq(
        api_key=settings.GROQ_API_KEY,
        model_name="qwen/qwen3.6-27b",
        temperature=0.0,
        max_tokens=4096,
        model_kwargs={"top_p": 0.9},
    )
