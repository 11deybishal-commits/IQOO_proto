"""
JSON extraction utilities for LLM responses.
Handles models that emit <think>...</think> reasoning blocks (e.g. Qwen3.x)
before the actual JSON payload.
"""
import re
import json
from typing import Any


def extract_json_from_llm(content: str) -> Any:
    """
    Robustly extract JSON from an LLM response that may contain:
    - <think>...</think> reasoning blocks (Qwen3.x, DeepSeek-R1)
    - ```json ... ``` or ``` ... ``` markdown fences
    - Leading/trailing whitespace or prose

    Returns parsed Python object (dict or list).
    Raises json.JSONDecodeError if no valid JSON is found.
    """
    # 1. Strip <think>...</think> blocks (including nested or multi-line)
    text = re.sub(r"<think>.*?</think>", "", content, flags=re.DOTALL | re.IGNORECASE)

    # 2. Strip markdown code fences (```json ... ``` or ``` ... ```)
    text = re.sub(r"```(?:json)?\s*(.*?)\s*```", r"\1", text, flags=re.DOTALL)

    # 3. Strip any remaining whitespace
    text = text.strip()

    # 4. Try direct parse first
    if text:
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass

    # 5. Try extracting the first JSON object {...} or array [...]
    # This handles cases where prose surrounds the JSON
    json_match = re.search(r"(\{.*\}|\[.*\])", text, flags=re.DOTALL)
    if json_match:
        candidate = json_match.group(1).strip()
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            pass

    # 6. Last resort: try the original stripped content
    raise json.JSONDecodeError("No valid JSON found in LLM response", content, 0)
