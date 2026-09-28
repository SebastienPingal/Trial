"""Real evaluator calling Jev (TypeSafe AI).

TODO: the request/response format below is a placeholder. Check the exact
syntax in TypeSafe's official documentation / SDK and adapt `_build_payload`
and `_parse_response`. The rest of the game only depends on EvaluationResult.
"""

import time
from typing import Any

import httpx

from .. import config
from ..questions import build_questions, build_state
from ..schemas import Case, EvaluationRequest, EvaluationResult, Juror
from .base import Evaluator


class JevEvaluator(Evaluator):
    name = "jev"

    def __init__(self) -> None:
        if not config.JEV_API_KEY or not config.JEV_API_URL:
            raise RuntimeError("EVALUATOR=jev requires JEV_API_KEY and JEV_API_URL to be set")
        self._client = httpx.AsyncClient(
            base_url=config.JEV_API_URL,
            headers={"Authorization": f"Bearer {config.JEV_API_KEY}"},
            timeout=5.0,
        )

    async def evaluate(self, case: Case, jurors: list[Juror], request: EvaluationRequest) -> EvaluationResult:
        payload = self._build_payload(case, jurors, request)
        started = time.perf_counter()
        response = await self._client.post("", json=payload)
        response.raise_for_status()
        latency_ms = (time.perf_counter() - started) * 1000
        return self._parse_response(response.json(), jurors, latency_ms)

    def _build_payload(self, case: Case, jurors: list[Juror], request: EvaluationRequest) -> dict[str, Any]:
        # Placeholder shape: one state + all questions, evaluated in parallel by Jev.
        return {
            "model": config.JEV_MODEL,
            "state": build_state(case, request),
            "questions": build_questions(case, jurors, request),
        }

    def _parse_response(self, data: dict[str, Any], jurors: list[Juror], latency_ms: float) -> EvaluationResult:
        # Map Jev's answers (by question id) to EvaluationResult. Record the
        # model id returned by the API (not the requested one) so threshold
        # drift after a model update can be traced in the logs.
        raise NotImplementedError("Adapt to the official Jev response format")
