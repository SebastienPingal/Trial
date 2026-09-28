from abc import ABC, abstractmethod

from ..schemas import Case, EvaluationRequest, EvaluationResult, Juror


class EvaluatorError(Exception):
    """The evaluator could not produce a result (network error, bad response…)."""


class Evaluator(ABC):
    """Common interface for the mock and the real Jev evaluator.

    Both must return the same EvaluationResult shape so swapping them is
    invisible to the rest of the code.
    """

    name: str

    @abstractmethod
    async def evaluate(self, case: Case, jurors: list[Juror], request: EvaluationRequest) -> EvaluationResult: ...
