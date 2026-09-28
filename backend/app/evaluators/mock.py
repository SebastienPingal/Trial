"""Fake evaluator based on simple text rules, to build the game without the Jev API.

Results are deterministic for a given answer (seeded by its text) so the UI
doesn't flicker when the same text is evaluated twice.
"""

import asyncio
import hashlib
import math
import random
import re
import time

from ..schemas import (
    Case,
    ChoiceResult,
    EvaluationRequest,
    EvaluationResult,
    Juror,
    ProbabilityResult,
    ScoreResult,
)
from .base import Evaluator

EVASIVE_MARKERS = [
    "i don't remember",
    "i don't know",
    "no comment",
    "why does it matter",
    "i'd rather not",
    "irrelevant",
    "none of your business",
]
SELF_HARM_MARKERS = ["i hated him", "i wanted him dead", "i killed", "i lied", "he deserved"]
BACKTRACK_MARKERS = ["actually", "i mean", "i said that but", "that's not what", "i was wrong"]
EMOTION_MARKERS = ["scared", "sorry", "afraid", "friend", "loved", "panicked", "cried", "shock"]
TIME_PATTERN = re.compile(r"\b\d{1,2}([:h]\d{2})?\s*(am|pm)?\b|\bo'clock\b|\bminutes?\b")

# Per-juror personality tweaks for the mock only (the real Jev reads the juror description).
# The last three keys react to typing events (demeanor); unknown events have no effect.
JUROR_BIAS = {
    "juror_marthe": {
        "emotion": 0.7, "time": 0.0, "evidence": -1.0, "polish": 0.0,
        "heavy-deleting": -0.2, "long-hesitation": 0.2, "rushing": -0.2,
    },
    "juror_karim": {
        "emotion": -0.2, "time": 0.7, "evidence": -2.5, "polish": 0.0,
        "heavy-deleting": -0.5, "long-hesitation": -0.3, "rushing": 0.0,
    },
    "juror_lea": {
        "emotion": 0.2, "time": 0.0, "evidence": -1.2, "polish": -0.8,
        "heavy-deleting": -0.2, "long-hesitation": 0.0, "rushing": -0.5,
    },
}
DEFAULT_BIAS = {
    "emotion": 0.0, "time": 0.0, "evidence": -1.5, "polish": 0.0,
    "heavy-deleting": -0.3, "long-hesitation": -0.2, "rushing": -0.2,
}


def _clamp(x: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, x))


def _score(mean: float, spread: float = 0.9) -> ScoreResult:
    """Turns a target mean on a 1-5 scale into a probability distribution."""
    mean = _clamp(mean, 1.0, 5.0)
    weights = [math.exp(-((k - mean) ** 2) / (2 * spread**2)) for k in range(1, 6)]
    total = sum(weights)
    probs = {str(k): w / total for k, w in zip(range(1, 6), weights)}
    value = sum(k * probs[str(k)] for k in range(1, 6))
    return ScoreResult(value=round(value, 3), probabilities=probs, confidence=round(max(probs.values()), 3))


def _choice(options: list[str], picked: str, strength: float) -> ChoiceResult:
    rest = (1 - strength) / max(1, len(options) - 1)
    probs = {o: (strength if o == picked else rest) for o in options}
    return ChoiceResult(value=picked, probabilities=probs, confidence=round(strength, 3))


class MockEvaluator(Evaluator):
    name = "mock"

    async def evaluate(self, case: Case, jurors: list[Juror], request: EvaluationRequest) -> EvaluationResult:
        started = time.perf_counter()
        seed = int(hashlib.sha256(request.answer.encode("utf-8")).hexdigest()[:8], 16)
        rng = random.Random(seed)
        # Simulate network latency in the advertised 70-500 ms range.
        await asyncio.sleep(rng.uniform(0.07, 0.3))

        text = request.answer.lower()
        words = len(text.split())

        # Evasiveness
        if any(m in text for m in EVASIVE_MARKERS):
            evasive_mean = 4.5
        elif words < 4:
            evasive_mean = 3.5
        else:
            evasive_mean = 1.5

        # Evidence contradiction, driven by the case's mock hints
        contradicted = "none"
        for hint in case.mock_hints:
            if any(p in text for p in hint.patterns):
                contradicted = hint.evidence_id
                break
        evidence_p = rng.uniform(0.8, 0.95) if contradicted != "none" else rng.uniform(0.02, 0.2)

        # Statement contradiction: backtracking phrases, only once there is a history
        contradicted_statement = "none"
        statement_p = rng.uniform(0.02, 0.15)
        if request.history and any(m in text for m in BACKTRACK_MARKERS):
            contradicted_statement = f"S{len(request.history)}"
            statement_p = rng.uniform(0.78, 0.92)

        hurts_p = 0.85 if any(m in text for m in SELF_HARM_MARKERS) else _clamp(
            0.1 + 0.6 * max(evidence_p, statement_p) + 0.1 * (evasive_mean - 1) / 4, 0, 1
        )

        has_emotion = any(m in text for m in EMOTION_MARKERS)
        has_time = bool(TIME_PATTERN.search(text))
        is_polished = words > 40
        detail_bonus = 0.5 if words > 12 else 0.0

        credibility_mean = (
            3.3 + detail_bonus - 2.0 * evidence_p - 1.5 * statement_p - 0.6 * (evasive_mean - 1) / 4 * 2
        ) + rng.uniform(-0.3, 0.3)

        # Each distinct typing event counts once per answer.
        typing_events = {e.kind for e in request.typing.events} if request.typing else set()

        juror_scores: dict[str, ScoreResult] = {}
        for juror in jurors:
            bias = JUROR_BIAS.get(juror.id, DEFAULT_BIAS)
            mean = (
                3.3
                + detail_bonus
                + bias["emotion"] * has_emotion
                + bias["time"] * has_time
                + bias["polish"] * is_polished
                + bias["evidence"] * evidence_p
                - 1.5 * statement_p
                - 0.5 * (evasive_mean - 1) / 4 * 2
                + sum(bias.get(event, 0.0) for event in typing_events)
                + rng.uniform(-0.4, 0.4)
            )
            juror_scores[juror.id] = _score(mean)

        evidence_options = [e.id for e in case.evidence] + ["none"]
        statement_options = [f"S{i + 1}" for i in range(len(request.history))] + ["none"]

        return EvaluationResult(
            credibility=_score(credibility_mean),
            statement_contradiction=ProbabilityResult(probability=round(statement_p, 3)),
            evidence_contradiction=ProbabilityResult(probability=round(evidence_p, 3)),
            contradicted_evidence=_choice(evidence_options, contradicted, rng.uniform(0.6, 0.9)),
            contradicted_statement=_choice(statement_options, contradicted_statement, rng.uniform(0.6, 0.9)),
            evasiveness=_score(evasive_mean, spread=0.7),
            hurts_defense=ProbabilityResult(probability=round(hurts_p, 3)),
            jurors=juror_scores,
            evaluator=self.name,
            model="mock-1",
            latency_ms=round((time.perf_counter() - started) * 1000, 1),
        )
