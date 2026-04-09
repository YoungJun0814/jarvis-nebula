# Jarvis Nebula

Jarvis Nebula is an AI assistant with a 3D spatial interface. The product vision is an English-only desktop experience where the user can explore a live knowledge graph, use mouse and gesture input in parallel, speak commands, and let an agent plan and execute tasks with explicit safety controls.

## Current Status

This repository now includes the full Phase 0 scaffold, the Phase 1 frontend shell, the Phase 2 graph query flow, the Phase 3 hand-tracking gesture layer, the Phase 4 adaptive pose sensitivity layer, and the Phase 5 holographic hand overlay.

- The main architecture and scope are defined in `PROJECT_PLAN.md`.
- Frontend and backend manifests are in place.
- Neo4j local infrastructure config is in place.
- Lint, format, unit test, and end-to-end test configs are in place.
- Phase 1 renders the 3D nebula with mouse navigation, node inspection, and a command bar.
- Phase 2 loads graph data from Neo4j, seeds the local database on first run, and routes read-only text queries through the backend.
- Phase 3 adds optional webcam-based hand gestures for orbit, hover/select, confirm, zoom, swipe dismiss, and gesture lifecycle tracking while keeping mouse and keyboard active.
- Phase 4 adds pose-based distance sensitivity, gesture idle detection, and automatic fixed-sensitivity fallback when pose performance drops.
- Phase 5 adds a transparent hand skeleton overlay, gesture labels, and a 3D pointing laser that locks onto hovered nodes.
- The next step is Phase 6: add voice command capture, routing, and spoken responses.

## Locked Decisions

These decisions are already fixed for the MVP:

- Frontend: Vite + Vanilla JavaScript
- Backend: Python + FastAPI
- LLM access: Gemini from the backend only
- Database: Neo4j Community via Docker Compose
- Speech-to-text: faster-whisper
- Text-to-speech: edge-tts primary, pyttsx3 fallback
- Product language: English only

## Planning Documents

- `PROJECT_PLAN.md`
- `docs/PHASE_0_CHECKLIST.md`

The authoritative implementation baseline lives in Section 11 of `PROJECT_PLAN.md`.

## Runtime Baseline

- Node.js: `>=20 <25`
- npm: `>=10`
- Python: `>=3.11`
- Docker Desktop with Compose v2

Note: the current local machine may have a newer Python installed, but the backend target is still Python 3.11 because MediaPipe and related native dependencies are planned around that baseline.

## Environment Template

`.env.example` has been aligned to the planning baseline.

Important rules:

- `GEMINI_API_KEY` is backend-only.
- Do not use `VITE_GEMINI_API_KEY`.
- Only non-secret frontend values should use the `VITE_` prefix.

## Local Setup

### Fastest Way To Preview The Current UI

From the project root:

```powershell
npm run dev
```

This starts the frontend dev server and opens the browser automatically. If the backend is not running yet, the app stays usable with the local fallback demo graph and shows a warning in the status panel.

### Full Local Launch

If you want the frontend plus Neo4j and the backend graph service together:

```powershell
npm run dev:full
```

This opens new PowerShell windows for the running services.

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

### Backend

```powershell
cd backend
py -3.11 -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -e .[dev,tracking,voice]
python -m app.main
```

### Neo4j

```powershell
docker compose --env-file .env -f infra/docker-compose.yml up -d
```

## Available Commands

### Frontend

- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run lint`
- `npm run format`
- `npm run format:check`
- `npm run test`
- `npm run test:watch`
- `npm run test:coverage`
- `npm run test:e2e`

### Backend

- `python -m app.main`
- `pytest`
- `ruff check .`
- `ruff format .`

## What Happens Next

Phase 5 is now implemented locally. The next implementation step is:

1. Start Phase 6 by adding voice capture, command routing, and spoken feedback on top of the current input stack.
2. Keep gesture, mouse, keyboard, and text active together while voice becomes a fourth input lane.
3. Preserve the Neo4j-backed graph query flow while multimodal command routing becomes richer.
