"""Development log of every evaluation request/response, used to tune thresholds."""

import json
from datetime import datetime, timezone

from .config import LOG_DIR
from .schemas import EvaluationRequest, EvaluationResult


def log_evaluation(request: EvaluationRequest, result: EvaluationResult) -> None:
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "request": request.model_dump(by_alias=True),
        "result": result.model_dump(by_alias=True),
    }
    with (LOG_DIR / "evaluations.jsonl").open("a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")
