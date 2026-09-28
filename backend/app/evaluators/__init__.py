from functools import lru_cache

from .. import config
from .base import Evaluator


@lru_cache
def get_evaluator() -> Evaluator:
    if config.EVALUATOR == "jev":
        from .jev import JevEvaluator

        return JevEvaluator()
    from .mock import MockEvaluator

    return MockEvaluator()
