"""Builds the Jev state and the set of parallel questions for one evaluation.

Format follows TypeSafe's API reference (https://docs.typesafe.ai/api).
Questions in one request are evaluated independently: none may depend on another.
Instructions refer to state fields with backticks, as TypeSafe recommends.
"""

from typing import Any

from .schemas import Case, EvaluationRequest, Juror


def describe_demeanor(request: EvaluationRequest) -> str | None:
    """Plain-language summary of how the answer was typed, for Jev to factor in."""
    typing = request.typing
    if typing is None:
        return None
    parts = [
        f"took {typing.duration_ms / 1000:.0f} seconds to answer",
        f"typed {typing.chars_typed} characters and erased {typing.chars_deleted}",
        f"longest pause was {typing.longest_pause_ms / 1000:.1f} seconds",
    ]
    parts += list(dict.fromkeys(e.description for e in typing.events))
    return "While answering, the defendant " + "; ".join(parts) + "."


def build_state(case: Case, request: EvaluationRequest) -> dict[str, Any]:
    state = {
        "situation": case.situation,
        "evidence": [{"id": e.id, "name": e.name, "description": e.description} for e in case.evidence],
        "previous_statements": [
            {"id": f"S{i + 1}", "question": s.question, "answer": s.answer}
            for i, s in enumerate(request.history)
        ],
        "current_question": case.prosecutor_questions[request.question_index],
        "current_answer": request.answer,
    }
    demeanor = describe_demeanor(request)
    if demeanor:
        state["defendant_demeanor"] = demeanor
    return state


def build_questions(case: Case, jurors: list[Juror], request: EvaluationRequest) -> dict[str, dict[str, Any]]:
    """Question map in Jev's format: {id: {type, instructions, criteria}}.

    Score criteria are ordered low to high; Jev numbers the levels from 0,
    so our 1-5 scales come back as 0-4 (see evaluators/jev.py).
    """
    evidence_criteria: dict[str, str | None] = {e.id: f"{e.name}: {e.description}" for e in case.evidence}
    evidence_criteria["none"] = "The answer contradicts none of the evidence"

    questions: dict[str, dict[str, Any]] = {
        "credibility": {
            "type": "score",
            "instructions": "How credible is `current_answer` as a reply to `current_question`?",
            "criteria": ["Implausible", "Barely credible", "Plausible", "Credible", "Very convincing"],
        },
        "statement_contradiction": {
            "type": "noul",
            "instructions": "`current_answer` contradicts at least one of the defendant's `previous_statements`",
        },
        "evidence_contradiction": {
            "type": "noul",
            "instructions": "`current_answer` is incompatible with at least one item of `evidence`",
        },
        "contradicted_evidence": {
            "type": "choice",
            "instructions": "Which item of `evidence` does `current_answer` most directly contradict?",
            "criteria": evidence_criteria,
        },
        "evasiveness": {
            "type": "score",
            "instructions": "How much does `current_answer` avoid answering `current_question`?",
            "criteria": [
                "Answers directly",
                "Mostly answers",
                "Answers partially",
                "Mostly dodges",
                "Dodges completely",
            ],
        },
        "hurts_defense": {
            "type": "noul",
            "instructions": "`current_answer` weakens the defendant's defense",
        },
    }

    # A Choice needs real options: only ask once there are previous statements.
    if request.history:
        statement_criteria: dict[str, str | None] = {
            f"S{i + 1}": f'Answer to "{s.question}"' for i, s in enumerate(request.history)
        }
        statement_criteria["none"] = "The answer contradicts none of the previous statements"
        questions["contradicted_statement"] = {
            "type": "choice",
            "instructions": "Which of the `previous_statements` does `current_answer` most directly contradict?",
            "criteria": statement_criteria,
        }

    for juror in jurors:
        questions[juror.id] = {
            "type": "score",
            "instructions": (
                f"{juror.name}, {juror.description}, is a juror. Considering both `current_answer` "
                f"and `defendant_demeanor`, does {juror.name} believe this answer?"
            ),
            "criteria": ["Not at all", "Barely", "Hesitates", "Mostly", "Completely convinced"],
        }

    return questions
