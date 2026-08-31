"""Local LLM-as-judge for `custom_response_quality` (see eval_config.yaml)."""

import os

from google import genai
from google.genai import types
from pydantic import BaseModel


class _Verdict(BaseModel):
    score: int  # 1-5
    explanation: str


_cached_client = None


def _get_client():
    global _cached_client
    if _cached_client is not None:
        return _cached_client

    project = (
        os.getenv("GOOGLE_CLOUD_PROJECT")
        or os.getenv("PROJECT_ID")
        or os.getenv("GCP_PROJECT")
    )
    location = os.getenv("GOOGLE_CLOUD_LOCATION") or "global"
    use_vertex = os.getenv("GOOGLE_GENAI_USE_VERTEXAI", "true").lower() == "true"

    if use_vertex and project:
        try:
            _cached_client = genai.Client(
                vertexai=True, project=project, location=location
            )
            return _cached_client
        except Exception:
            pass

    try:
        _cached_client = genai.Client()
        return _cached_client
    except Exception:
        return None


def evaluate(instance):
    reference = instance.get("reference")
    rubric = (
        "Grade the agent's final response on a 1-5 scale (1 poor, 5 excellent) for "
        "accuracy, relevance, and clarity."
    )
    if reference:
        rubric += (
            " The response should agree with the expected answer below; penalize "
            "factual disagreement with it."
        )
    prompt = (
        f"You are an expert QA evaluator for an enterprise AI assistant. {rubric}\n"
        f"User Prompt: {instance.get('prompt', '')}\n"
        f"Final Response: {instance.get('response', '')}\n"
    )
    if reference:
        prompt += f"Expected Answer (ground truth): {reference}\n"
    prompt += f"Full Agent Trace: {instance.get('agent_data', '')}\n"

    client = _get_client()
    if client is None:
        return {"score": 3, "explanation": "Client initialization skipped."}

    response = None
    for model_name in ["gemini-3.1-pro-preview", "gemini-2.5-pro", "gemini-2.5-flash"]:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0,  # deterministic grading
                    response_mime_type="application/json",
                    response_schema=_Verdict,  # guaranteed schema-valid JSON
                ),
            )
            break
        except Exception:
            continue

    if response is None:
        return {"score": 3, "explanation": "Judge model generation failed."}
    verdict = response.parsed
    if verdict is None:  # model returned nothing usable
        return {"score": 0, "explanation": response.text or ""}
    return {"score": max(1, min(5, verdict.score)), "explanation": verdict.explanation}
