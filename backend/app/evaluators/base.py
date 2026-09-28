from abc import ABC, abstractmethod

from ..schemas import Case, EvaluationRequest, EvaluationResult, Juror


class Evaluator(ABC):
    """Common interface for the mock and the real Jev evaluator.

    Both must return the same EvaluationResult shape so swapping them is
    invisible to the rest of the code.
    """

    name: str

    @abstractmethod
    async def evaluate(self, case: Case, jurors: list[Juror], request: EvaluationRequest) -> EvaluationResult: ...
