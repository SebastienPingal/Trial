"""Real evaluator calling Jev (TypeSafe AI).

API reference: https://docs.typesafe.ai/api
  POST https://api.typesafe.ai/v1/systemone
  body:     {"model", "state", "questions": {id: {"type", "instructions", "criteria"}}}
  response: {"model", "answers": {id: {...}}, "usage": {...}}
Answer shapes:
  noul   -> {"type": "noul", "noul": 0.92}
  choice -> {"type": "choice", "choice": "P1", "probabilities": {...}, "confidence": 0.82}
  score  -> {"type": "score", "score": 1.6, "legend": {"0": ...}, "probabilities": {"0": ...}, "confidence": 0.78}
Score levels are numbered from 0; the game uses 1-5, so everything is shifted by +1.
"""

import time
from typing import Any

import httpx

from .. import config
from ..questions import build_questions, build_state
from ..schemas import (
    Case,
    ChoiceResult,
    EvaluationRequest,
    EvaluationResult,
    Juror,
    ProbabilityResult,
    ScoreResult,
)
from .base import Evaluator, EvaluatorError


def _score(answer: dict[str, Any]) -> ScoreResult:
    # Shift Jev's 0-based levels onto the game's 1-5 scale.
    probabilities = {str(int(level) + 1): p for level, p in answer.get("probabilities", {}).items()}
    return ScoreResult(
        value=float(answer["score"]) + 1,
        probabilities=probabilities,
        confidence=float(answer.get("confidence", 1.0)),
    )


def _choice(answer: dict[str, Any]) -> ChoiceResult:
    return ChoiceResult(
        value=answer["choice"],
        probabilities=answer.get("probabilities", {}),
        confidence=float(answer.get("confidence", 1.0)),
    )


def _noul(answer: dict[str, Any]) -> ProbabilityResult:
    return ProbabilityResult(probability=float(answer["noul"]))


NO_STATEMENT = ChoiceResult(value="none", probabilities={"none": 1.0}, confidence=1.0)


class JevEvaluator(Evaluator):
    name = "jev"

    def __init__(self) -> None:
        if not config.JEV_API_KEY:
            raise RuntimeError("EVALUATOR=jev requires JEV_API_KEY (or TYPESAFE_API_KEY) to be set")
        self._client = httpx.AsyncClient(
            headers={"Authorization": f"Bearer {config.JEV_API_KEY}"},
            timeout=config.JEV_TIMEOUT_S,
        )

    async def evaluate(self, case: Case, jurors: list[Juror], request: EvaluationRequest) -> EvaluationResult:
        payload = {
            "model": config.JEV_MODEL,
            "state": build_state(case, request),
            "questions": build_questions(case, jurors, request),
        }
        started = time.perf_counter()
        try:
            response = await self._client.post(config.JEV_API_URL, json=payload)
        except httpx.HTTPError as e:
            raise EvaluatorError(f"Could not reach Jev: {e}") from e
        latency_ms = (time.perf_counter() - started) * 1000

        if response.status_code != 200:
            raise EvaluatorError(f"Jev responded {response.status_code}: {response.text[:500]}")

        try:
            return self._parse(response.json(), jurors, latency_ms)
        except (KeyError, TypeError, ValueError) as e:
            raise EvaluatorError(f"Unexpected Jev response: {e!r}") from e

    def _parse(self, data: dict[str, Any], jurors: list[Juror], latency_ms: float) -> EvaluationResult:
        answers = data["answers"]
        return EvaluationResult(
            credibility=_score(answers["credibility"]),
            statement_contradiction=_noul(answers["statement_contradiction"]),
            evidence_contradiction=_noul(answers["evidence_contradiction"]),
            contradicted_evidence=_choice(answers["contradicted_evidence"]),
            # Only asked once there are previous statements.
            contradicted_statement=(
                _choice(answers["contradicted_statement"]) if "contradicted_statement" in answers else NO_STATEMENT
            ),
            evasiveness=_score(answers["evasiveness"]),
            hurts_defense=_noul(answers["hurts_defense"]),
            jurors={juror.id: _score(answers[juror.id]) for juror in jurors},
            evaluator=self.name,
            # The exact version that answered (even when an alias was sent): logged to trace threshold drift.
            model=data.get("model", config.JEV_MODEL),
            latency_ms=round(latency_ms, 1),
        )
