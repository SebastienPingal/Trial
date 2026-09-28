"""Loads case files and juror profiles from the data directory."""

import json
from functools import lru_cache

from .config import DATA_DIR
from .schemas import Case, CaseView, Juror


@lru_cache
def load_jurors() -> dict[str, Juror]:
    raw = json.loads((DATA_DIR / "jurors.json").read_text(encoding="utf-8"))
    jurors = [Juror.model_validate(j) for j in raw]
    return {j.id: j for j in jurors}


@lru_cache
def load_cases() -> dict[str, Case]:
    cases: dict[str, Case] = {}
    for path in sorted((DATA_DIR / "cases").glob("*.json")):
        case = Case.model_validate(json.loads(path.read_text(encoding="utf-8")))
        cases[case.id] = case
    return cases


def get_case(case_id: str) -> Case | None:
    return load_cases().get(case_id)


def get_case_jurors(case: Case) -> list[Juror]:
    jurors = load_jurors()
    return [jurors[juror_id] for juror_id in case.jurors]


def to_view(case: Case) -> CaseView:
    return CaseView(
        id=case.id,
        title=case.title,
        situation=case.situation,
        evidence=case.evidence,
        prosecutor_questions=case.prosecutor_questions,
        jurors=get_case_jurors(case),
    )
