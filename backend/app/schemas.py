"""API and data models. Serialized as camelCase to match the frontend and case files."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


# --- Case data ---------------------------------------------------------------


class Evidence(CamelModel):
    id: str
    name: str
    description: str


class MockHint(CamelModel):
    """Dev-only: keywords that make the mock evaluator flag a contradiction with a piece of evidence."""

    evidence_id: str
    patterns: list[str]


class Case(CamelModel):
    id: str
    title: str
    situation: str
    evidence: list[Evidence]
    prosecutor_questions: list[str]
    jurors: list[str]
    mock_hints: list[MockHint] = Field(default_factory=list)


class Juror(CamelModel):
    id: str
    name: str
    portrait: str
    description: str


class CaseSummary(CamelModel):
    id: str
    title: str


class CaseView(CamelModel):
    """What the frontend receives: the case with juror profiles resolved (no mock hints)."""

    id: str
    title: str
    situation: str
    evidence: list[Evidence]
    prosecutor_questions: list[str]
    jurors: list[Juror]


# --- Evaluation --------------------------------------------------------------


class Statement(CamelModel):
    question: str
    answer: str


class EvaluationRequest(CamelModel):
    case_id: str
    history: list[Statement] = Field(default_factory=list)
    question_index: int
    answer: str
    mode: Literal["preview", "final"] = "final"


class ScoreResult(CamelModel):
    """Result of a Score question on a 1-5 scale."""

    value: float  # expected value over the scale
    probabilities: dict[str, float]  # scale level ("1".."5") -> probability
    confidence: float


class ChoiceResult(CamelModel):
    value: str
    probabilities: dict[str, float]
    confidence: float


class ProbabilityResult(CamelModel):
    """Result of a Noul question: probability that the statement is true."""

    probability: float


class EvaluationResult(CamelModel):
    credibility: ScoreResult
    statement_contradiction: ProbabilityResult
    evidence_contradiction: ProbabilityResult
    contradicted_evidence: ChoiceResult  # "P1".."Pn" or "none"
    contradicted_statement: ChoiceResult  # "S1".."Sn" (1-based history index) or "none"
    evasiveness: ScoreResult
    hurts_defense: ProbabilityResult
    jurors: dict[str, ScoreResult]  # juror id -> score
    evaluator: str
    model: str
    latency_ms: float
