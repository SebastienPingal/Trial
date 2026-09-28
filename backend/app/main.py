from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from . import config
from .cases import get_case, get_case_jurors, load_cases, to_view
from .evaluators import get_evaluator
from .evaluators.base import EvaluatorError
from .request_log import log_evaluation
from .schemas import CaseSummary, CaseView, EvaluationRequest, EvaluationResult

app = FastAPI(title="Jev Courtroom API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health() -> dict[str, str]:
    evaluator = get_evaluator().name
    return {"status": "ok", "evaluator": evaluator, "model": config.JEV_MODEL if evaluator == "jev" else "mock-1"}


@app.get("/api/cases", response_model=list[CaseSummary])
async def list_cases() -> list[CaseSummary]:
    return [CaseSummary(id=c.id, title=c.title) for c in load_cases().values()]


@app.get("/api/cases/{case_id}", response_model=CaseView)
async def read_case(case_id: str) -> CaseView:
    case = get_case(case_id)
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")
    return to_view(case)


@app.post("/api/evaluate", response_model=EvaluationResult)
async def evaluate(request: EvaluationRequest) -> EvaluationResult:
    case = get_case(request.case_id)
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")
    if not 0 <= request.question_index < len(case.prosecutor_questions):
        raise HTTPException(status_code=422, detail="Invalid question index")

    try:
        result = await get_evaluator().evaluate(case, get_case_jurors(case), request)
    except EvaluatorError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e
    log_evaluation(request, result)
    return result
