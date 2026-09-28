"""Builds the Jev state and the set of parallel questions for one evaluation.

This is the conceptual structure from the spec. The exact wire format must be
adapted to TypeSafe's official SDK/API documentation (see evaluators/jev.py).
Questions in one request are evaluated independently: none may depend on another.
"""

from typing import Any

from .schemas import Case, EvaluationRequest, Juror

SCORE_SCALE_1_TO_5 = ["1", "2", "3", "4", "5"]


def build_state(case: Case, request: EvaluationRequest) -> dict[str, Any]:
    return {
        "situation": case.situation,
        "evidence": [{"id": e.id, "name": e.name, "description": e.description} for e in case.evidence],
        "previous_statements": [
            {"id": f"S{i + 1}", "question": s.question, "answer": s.answer}
            for i, s in enumerate(request.history)
        ],
        "current_question": case.prosecutor_questions[request.question_index],
        "current_answer": request.answer,
    }


def build_questions(case: Case, jurors: list[Juror], request: EvaluationRequest) -> list[dict[str, Any]]:
    evidence_options = [e.id for e in case.evidence] + ["none"]
    statement_options = [f"S{i + 1}" for i in range(len(request.history))] + ["none"]

    questions: list[dict[str, Any]] = [
        {
            "id": "credibility",
            "type": "score",
            "question": "How credible is the defendant's current answer?",
            "scale": [
                "1: implausible",
                "2: barely credible",
                "3: plausible",
                "4: credible",
                "5: very convincing",
            ],
        },
        {
            "id": "statement_contradiction",
            "type": "noul",
            "statement": "The current answer contradicts at least one previous statement by the defendant.",
        },
        {
            "id": "evidence_contradiction",
            "type": "noul",
            "statement": "The current answer is incompatible with at least one piece of evidence in the case file.",
        },
        {
            "id": "contradicted_evidence",
            "type": "choice",
            "question": "Which piece of evidence does the current answer most directly contradict?",
            "options": evidence_options,
        },
        {
            "id": "contradicted_statement",
            "type": "choice",
            "question": "Which previous statement does the current answer most directly contradict?",
            "options": statement_options,
        },
        {
            "id": "evasiveness",
            "type": "score",
            "question": "How much does the defendant avoid answering the question asked?",
            "scale": [
                "1: answers directly",
                "2: mostly answers",
                "3: answers partially",
                "4: mostly dodges",
                "5: dodges completely",
            ],
        },
        {
            "id": "hurts_defense",
            "type": "noul",
            "statement": "This answer weakens the defendant's defense.",
        },
    ]

    for juror in jurors:
        questions.append(
            {
                "id": juror.id,
                "type": "score",
                "question": f"{juror.name}, {juror.description}, is a juror. Does {juror.name} believe this answer?",
                "scale": [
                    "1: not at all",
                    "2: barely",
                    "3: hesitates",
                    "4: mostly",
                    "5: completely convinced",
                ],
            }
        )

    return questions
