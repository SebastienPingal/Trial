# Jev Courtroom

A courtroom game where you play the defendant. The prosecutor questions you, you answer in free text, and the jury, your lawyer and the prosecutor react live — powered by [Jev](https://www.builder.io/blog/what-is-jev) (TypeSafe AI), a decision model that returns typed answers with probabilities.

You don't have to tell the truth. You just have to stay consistent with the evidence and with everything you've already said.

Full design spec: [`docs/SPEC.md`](docs/SPEC.md).

## Structure

```
data/
  cases/            One JSON file per case (add cases without touching code)
  jurors.json       Juror profiles (personality text is sent to Jev)
backend/            Python + FastAPI — holds the Jev API key, never the browser
  app/
    main.py         API: /api/cases, /api/cases/{id}, /api/evaluate
    questions.py    Jev state + parallel question set
    evaluators/     mock.py (rule-based, default) and jev.py (real API, TODO)
    request_log.py  JSONL log of every evaluation (backend/logs/)
frontend/           React + Vite + TypeScript
  src/
    game/reactions.ts   Thresholds: evaluation -> expressions / objections
    game/verdict.ts     Juror conviction and final vote
    hooks/useLivePreview.ts  Debounced preview evaluation while typing
    screens/            Intro, Trial, Verdict
```

## Running locally

Backend (port 8000):

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # EVALUATOR=mock by default
uvicorn app.main:app --reload
```

Frontend (port 5173, proxies `/api` to the backend):

```bash
cd frontend
npm install
npm run dev
```

## Mock vs. Jev

The backend uses the **mock evaluator** by default: simple text rules plus each case's `mockHints` (keywords that trigger an evidence contradiction). This lets you build and play the whole game without the API.

To switch to Jev, set `EVALUATOR=jev`, `JEV_API_KEY`, `JEV_API_URL` and a pinned `JEV_MODEL` in `backend/.env`, then implement the request/response mapping in `backend/app/evaluators/jev.py` against TypeSafe's official docs. Both evaluators return the same `EvaluationResult`, so the frontend doesn't change.

## Roadmap

- [x] Static courtroom UI, characters, answer input, case file
- [x] Question loop with the mock evaluator
- [x] Reactions and objections wired to thresholds
- [x] Live preview evaluation while typing
- [x] Verdict and summary screen
- [ ] Real Jev call (`evaluators/jev.py`)
- [ ] Threshold tuning with real playthroughs
- [ ] Character art to replace the emoji placeholders
- [ ] More cases
