from __future__ import annotations
import json
import re
from openai import OpenAI
from ..config import settings
from .prompts import SYSTEM_PROMPT, ROAST_PROMPT


_client: OpenAI | None = None


def get_client() -> OpenAI:
    global _client
    if _client is None:
        if not settings.OPENAI_API_KEY:
            raise RuntimeError("OPENAI_API_KEY not configured")
        _client = OpenAI(api_key=settings.OPENAI_API_KEY)
    return _client


def _extract_json(text: str) -> dict:
    text = text.strip()
    m = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if m:
        text = m.group(1)
    start = text.find("{")
    if start == -1:
        raise ValueError("No JSON object in LLM response")
    depth = 0
    for i in range(start, len(text)):
        if text[i] == "{":
            depth += 1
        elif text[i] == "}":
            depth -= 1
            if depth == 0:
                return json.loads(text[start:i + 1])
    raise ValueError("Unbalanced JSON in LLM response")


def generate_strategy(description: str, model: str | None = None) -> dict:
    client = get_client()
    mdl = model or settings.OPENAI_MODEL
    resp = client.chat.completions.create(
        model=mdl,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": description},
        ],
        temperature=0.4,
    )
    text = resp.choices[0].message.content or ""
    data = _extract_json(text)
    if "code" not in data or "explanation" not in data:
        raise ValueError("LLM response missing required fields")
    data.setdefault("parameters_schema", {})
    return {
        **data,
        "model": mdl,
        "usage": {
            "prompt_tokens": resp.usage.prompt_tokens if resp.usage else 0,
            "completion_tokens": resp.usage.completion_tokens if resp.usage else 0,
        },
    }


def roast_strategy(code: str, metrics: dict | None = None, model: str | None = None) -> dict:
    """Have the LLM critique a strategy: praise what's good, roast what's risky, suggest improvements."""
    client = get_client()
    mdl = model or settings.OPENAI_ROAST_MODEL
    metrics_blurb = ""
    if metrics:
        keep = {k: metrics.get(k) for k in ["sharpe", "cagr", "max_drawdown", "vol", "win_rate", "n_trades"]}
        metrics_blurb = f"\n\nBacktest stats:\n{json.dumps(keep, indent=2)}"
    user = f"Strategy code:\n```python\n{code}\n```{metrics_blurb}"
    resp = client.chat.completions.create(
        model=mdl,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": ROAST_PROMPT},
            {"role": "user", "content": user},
        ],
        temperature=0.7,
    )
    text = resp.choices[0].message.content or ""
    return _extract_json(text)
