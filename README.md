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
    evaluators/     mock.py (rule-based, no key) and jev.py (TypeSafe API)
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
    react/            DOM renderer (React components, placeholder art)
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
2. In **Settings → Environment Variables**, set `JEV_API_KEY` to use Jev (leave it out to play with the mock).
3. Deploy. Or from the CLI: `npx vercel` (preview) / `npx vercel --prod`.

Python dependencies for the function come from the root `requirements.txt` (keep it in sync with `backend/requirements.txt`). On Vercel, evaluation logs go to `/tmp/logs`, which is not persistent: use a real log sink if you need them in production.

## Mock vs. Jev

Without an API key the backend uses the **mock evaluator**: simple text rules plus each case's `mockHints` (keywords that trigger an evidence contradiction). This lets you play the whole game without the API.

To use **Jev**, set only the API key — locally in `backend/.env`, on Vercel in the project's environment variables:

```
JEV_API_KEY=your-typesafe-key   # TYPESAFE_API_KEY also works
```

As soon as a key is present the backend calls `POST https://api.typesafe.ai/v1/systemone` with the pinned model `jev-1.13.0` (see `backend/app/evaluators/jev.py`, format from the [API reference](https://docs.typesafe.ai/api)). Optional overrides: `EVALUATOR=mock` to force the mock, `JEV_MODEL`, `JEV_API_URL`, `JEV_TIMEOUT_S`. Check which one is active at `/api/health`.

If Jev fails (bad key, timeout, unexpected response), `/api/evaluate` returns a 502 with the reason and the game shows it under the answer box.

## Roadmap

- [x] Static courtroom UI, characters, answer input, case file
- [x] Question loop with the mock evaluator
- [x] Reactions and objections wired to thresholds
- [x] Typing events with instant reactions, sent to Jev as demeanor
- [x] Verdict and summary screen
- [x] Real Jev call (`evaluators/jev.py`) — needs a real-key test run
- [ ] Threshold tuning with real playthroughs
- [x] Trial screen laid out as a game scene (16:9 desktop, portrait mobile)
- [ ] Character, background and exhibit art to replace the placeholders
- [ ] More cases
