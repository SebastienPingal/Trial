# Project: courtroom game with a reactive jury powered by Jev

## 1. Concept

The player is a defendant on trial. They are shown a compromising situation and the list of evidence known to the court. The prosecutor asks a series of questions, and the player answers in free text. While they type and when they submit, the jury, their own defense lawyer and the prosecutor react live: trust, doubt, or detection of an inconsistency. At the end, the jury delivers its verdict.

The core of the gameplay is not telling the truth but staying consistent: the player can make up their story, as long as it contradicts neither the evidence nor their own previous statements. The AI's intelligence shows through its ability to spot the flaws and react instantly.

## 2. Why Jev

Jev (TypeSafe AI) is a decision model: it does not generate text, it returns typed answers with probabilities. Choice and Score questions expose the probability distribution behind each answer, along with a confidence value. These probabilities directly become the characters' expressions.

Speed makes evaluation while typing possible: TypeSafe advertises response times of about 70 to 500 milliseconds (vendor figures). A single request can contain several questions, evaluated independently and in parallel on the same state, so the whole courtroom reacts in one call.

The three question types:

- **Choice**: picks one option from a predefined list (with probabilities and confidence).
- **Score**: rates on an ordered scale (with probabilities and confidence).
- **Noul**: gives the probability (between 0 and 1) that a statement is true.

## 3. Game loop

1. Intro screen: presentation of the case.
2. Case file available at any time: the evidence.
3. The prosecutor asks question N (pre-written text).
4. The player types their answer. Typing events (heavy deleting, long hesitation, rushing) make the faces react instantly, and some of them trigger a "preview" evaluation of the partial answer.
5. The player submits. Full evaluation, full reactions, possible "Objection!" moment where the prosecutor brandishes the contradicted evidence.
6. The submitted answer is added to the statement history.
7. Next question. After the last question: deliberation and verdict.

## 4. Case structure (data file)

Each case is a JSON file, so new ones can be added without touching the code. See `data/cases/verdier_manor.json`.

The evidence must leave the player a way out (here, the size 44 footprints and the silhouette in the garden suggest a third party). A good case is ambiguous: neither obviously guilty nor obviously innocent.

## 5. Characters

Each character has at least four expressions: **neutral**, **convinced**, **doubt**, **shocked**.

**The jury**: three jurors with distinct personalities, described in their Jev questions.

- **Marthe**, retiree, sensitive to sincerity and emotions.
- **Karim**, engineer, only believes what fits the facts and the timeline.
- **Léa**, student, suspicious of the prosecution and of stories that are too polished.

Since each is evaluated in parallel, the same sentence can convince one and make another doubt, which gives the player a strategy.

**The defense lawyer** is on the player's side, but visibly panics when the player says something that hurts them.

**The prosecutor** stays impassive until they smell a flaw, then attacks.

## 6. The Jev request

On each evaluation, the **state** sent contains: the situation, the evidence, the history of submitted questions and answers, the current question and the current answer.

Questions sent in parallel (conceptual structure, to adapt to the exact format of TypeSafe's official SDK) — see `backend/app/questions.py`:

| id | type | question |
|---|---|---|
| `credibility` | score 1–5 | How credible is the defendant's current answer? |
| `statement_contradiction` | noul | The current answer contradicts at least one previous statement by the defendant. |
| `evidence_contradiction` | noul | The current answer is incompatible with at least one piece of evidence. |
| `contradicted_evidence` | choice | Which piece of evidence does the current answer most directly contradict? (`P1`…`Pn`, `none`) |
| `contradicted_statement` | choice | Which previous statement does the current answer most directly contradict? (`S1`…`Sn`, `none`) |
| `evasiveness` | score 1–5 | How much does the defendant avoid answering the question asked? |
| `hurts_defense` | noul | This answer weakens the defendant's defense. |
| `<juror_id>` | score 1–5 | Does juror X (personality) believe this answer? |

> **Important constraint**: questions in the same request cannot depend on each other. Sequential decisions must go through separate calls linked by application logic. That's why the Choice on the contradicted evidence includes the option "none": it does not know what the contradiction Noul answered. The game code combines both.

## 7. Turning results into reactions

Starting thresholds, to be tuned through testing (see `frontend/src/game/reactions.ts`):

| Signal | Condition | Reaction |
|---|---|---|
| Juror | score ≥ 4 | convinced |
| Juror | score ≤ 2 | doubt |
| Juror | score ≤ 2 and contradiction > 0.7 | shocked |
| Lawyer | hurts_defense > 0.6 | panic |
| Prosecutor | evidence_contradiction > 0.75 and evidence ≠ "none" | "Objection!" + show the evidence |
| Prosecutor | statement_contradiction > 0.75 | "Objection!" + recall the earlier statement |
| Prosecutor | evasiveness ≥ 4 | "Answer the question!" |

Also use the returned **confidence**: if it is low, keep a subdued reaction rather than a clear-cut expression.

Objections only trigger **on submit**, never in preview, otherwise the player gets interrupted mid-sentence.

## 8. Evaluation timing and typing events

There is no evaluation on a timer. Requests are sent:

- **On submit**: the full evaluation, sent instantly when the player answers.
- **On specific typing events**: a "preview" evaluation of the partial answer, only for events configured to do so.

The frontend watches how the player types (`frontend/src/hooks/useTypingTracker.ts`) and emits **typing events**:

| Event | Detection (starting thresholds) | Local reaction | Evaluates? |
|---|---|---|---|
| `heavy-deleting` | ≥ 15 characters erased in one burst | jurors doubt, lawyer panics, prosecutor suspicious | yes |
| `long-hesitation` | 5 s idle mid-answer, or 8 s before the first keystroke | jurors doubt, prosecutor suspicious | no |
| `rushing` | > 7 characters/second over at least 25 characters | prosecutor suspicious | no |

Each event is defined in one place (`TYPING_EVENT_EFFECTS` in `frontend/src/game/typingEvents.ts`): its instant local reaction, how long it lasts, and whether it triggers an evaluation. New events are added there.

Typing behavior is also sent to Jev: every evaluation carries a typing summary (duration, characters typed and erased, longest pause, speed, events), turned into a plain-language `defendant_demeanor` in the state. Juror questions ask them to consider both the answer and the demeanor.

- Number each request and ignore any response arriving after a more recent one (the network does not guarantee ordering).
- Preview reactions are drawn at half strength; objections only happen on submit.
- Published quotas: 250,000 tokens per second and 1,200 requests per minute, plenty for a single player with this system.

## 9. Verdict

Each juror accumulates a **conviction** over the trial: the average of their scores, with more weight for later submitted answers and a penalty for each successful prosecutor objection.

At the end, each juror votes "not guilty" if their conviction exceeds 3. A two-out-of-three majority is needed for acquittal.

A final screen shows each juror's evolution and the moments that made them switch: this is where the AI's intelligence becomes truly evident.

## 10. Technical architecture

- **Frontend** (React + Vite + TypeScript): handles display, input, animations and reaction computation.
- **Backend** (Python + FastAPI, required): receives the state from the game, calls Jev and returns the results. Never put the API key in browser code.
- **Mock evaluator**: start with a fake module (random values or simple rules) to build the whole interface without depending on the API, then swap it for the real Jev call. Keep the same interface between both so the switch is invisible to the rest of the code.

## 11. Watch-outs

- **Language**: English is Jev's best-documented language, which is why the whole game is in English.
- **Model version**: pin a tested version (e.g. `jev-1.13.0`) rather than the `jev-latest` alias, and record the model id returned with each response. Otherwise an update can throw all thresholds off.
- **Logging**: keep a log of each request and response during development, to tune thresholds and spot cases where the AI judges poorly.
- **API format**: check the exact syntax in TypeSafe's official documentation. The structures in this document describe the logic, not the precise syntax.
- **Performance figures**: the advertised speed gains come from TypeSafe itself; measure real latency in your own context.

## 12. Suggested steps

1. Static interface: courtroom, characters, input field, evidence file.
2. Question loop with the mock evaluator.
3. Reaction and objection system wired to the thresholds.
4. Backend and real Jev call, on submit only.
5. Typing events and event-triggered evaluations.
6. Verdict and summary screen.
7. Threshold tuning with real playthroughs, then adding new cases.
8. Later, possibly: an LLM that generates prosecutor follow-up questions based on the flaws detected by Jev.

## Sources

- Jev technical sheet (CometAPI): https://www.cometapi.com/models/typesafe-ai/jev/
- Jev overview (Builder.io): https://www.builder.io/blog/what-is-jev
