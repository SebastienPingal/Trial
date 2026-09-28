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
frontend/src/
  main.ts           Composition root: picks the API, typing plugins and renderer
  core/             Headless game engine (no UI code)
    engine.ts         Trial flow state machine, evaluations, verdict
    eventBus.ts       Typed pub/sub used by the engine
    state.ts          GameState + bus events (GameEvents)
    reactions.ts      Thresholds: evaluation -> expressions / objections
    verdict.ts        Juror conviction and final vote
  api/              Backend access behind the CourtApi interface
  typing/           Typing tracker + one plugin file per typing event
    plugins/          heavyDeleting.ts, longHesitation.ts, rushing.ts
  render/           Rendering engines behind the Renderer interface
    react/            DOM renderer (React components, emoji faces)
```

## Architecture

The frontend is split into swappable modules that only meet in `main.ts`:

```
          input()/submit()/next()              state + bus events
Renderer ─────────────────────────► GameEngine ─────────────────────► Renderer
                                      │    ▲
                         evaluate()   │    │ typing events
                                      ▼    │
                                   CourtApi  TypingTracker ◄── plugins
```

- **Rendering engine** — implement `Renderer` (`render/types.ts`): `mount(container, game)` and `destroy()`. Read `game.getState()`, subscribe to `game.bus` (`state:changed`, `typing:event`, `prosecutor:action`, `verdict`…) and call `game.input()`, `game.submit()`, `game.next()`, `game.start()`, `game.restart()`. Then swap `new ReactRenderer()` in `main.ts`.
- **Typing events** — add a file in `typing/plugins/` that returns a `TypingEventPlugin` (detection in `onInput`/`onTick`, its local reaction, whether it triggers an evaluation, and a description sent to Jev), then register it in `typing/plugins/index.ts`. No backend change needed.
- **Backend access** — implement `CourtApi` (`api/types.ts`), e.g. an offline in-browser mock, and pass it to the engine in `main.ts`.
- **Evaluator** (backend) — implement `Evaluator` in `backend/app/evaluators/` and select it with `EVALUATOR`.
- **Game rules** — thresholds live in `core/reactions.ts` and `core/verdict.ts`.

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

## Deploying on Vercel

`vercel.json` deploys everything as one project:

- the frontend is built from `frontend/` and served statically (`frontend/dist`);
- the FastAPI backend runs as a Python serverless function (`api/index.py`), reached at `/api/*` on the same domain, so no CORS setup is needed.

Steps:

1. Import the GitHub repo in Vercel (keep the project root as the repo root; the framework preset stays "Other").
2. In **Settings → Environment Variables**, set `EVALUATOR` (`mock` or `jev`), and for Jev `JEV_API_KEY`, `JEV_API_URL`, `JEV_MODEL`.
3. Deploy. Or from the CLI: `npx vercel` (preview) / `npx vercel --prod`.

Python dependencies for the function come from the root `requirements.txt` (keep it in sync with `backend/requirements.txt`). On Vercel, evaluation logs go to `/tmp/logs`, which is not persistent: use a real log sink if you need them in production.

## Mock vs. Jev

The backend uses the **mock evaluator** by default: simple text rules plus each case's `mockHints` (keywords that trigger an evidence contradiction). This lets you build and play the whole game without the API.

To switch to Jev, set `EVALUATOR=jev`, `JEV_API_KEY`, `JEV_API_URL` and a pinned `JEV_MODEL` in `backend/.env`, then implement the request/response mapping in `backend/app/evaluators/jev.py` against TypeSafe's official docs. Both evaluators return the same `EvaluationResult`, so the frontend doesn't change.

## Roadmap

- [x] Static courtroom UI, characters, answer input, case file
- [x] Question loop with the mock evaluator
- [x] Reactions and objections wired to thresholds
- [x] Typing events with instant reactions, sent to Jev as demeanor
- [x] Verdict and summary screen
- [ ] Real Jev call (`evaluators/jev.py`)
- [ ] Threshold tuning with real playthroughs
- [ ] Character art to replace the emoji placeholders
- [ ] More cases
