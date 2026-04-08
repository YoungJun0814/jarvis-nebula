# Jarvis Nebula

Jarvis Nebula is an AI assistant with a 3D spatial interface. The product vision is an English-only desktop experience where the user can explore a live knowledge graph, use mouse and gesture input in parallel, speak commands, and let an agent plan and execute tasks with explicit safety controls.

## Current Status

This repository now includes the full Phase 0 scaffold.

- The main architecture and scope are defined in `PROJECT_PLAN.md`.
- Frontend and backend manifests are in place.
- Neo4j local infrastructure config is in place.
- Lint, format, unit test, and end-to-end test configs are in place.
- The next step is Phase 1 implementation: the static nebula and basic UI.

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
- Python: `3.11.x`
- Docker Desktop with Compose v2

Note: the current local machine may have a newer Python installed, but the backend target is still Python 3.11 because MediaPipe and related native dependencies are planned around that baseline.

## Environment Template

`.env.example` has been aligned to the planning baseline.

Important rules:

- `GEMINI_API_KEY` is backend-only.
- Do not use `VITE_GEMINI_API_KEY`.
- Only non-secret frontend values should use the `VITE_` prefix.

## Local Setup

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

Phase 0 is now scaffolded. The next implementation step is:

1. Start Phase 1 in `frontend/` by building the static nebula scene and UI shell.
2. Keep the backend in stub mode until Phase 2 begins.
3. Use the health endpoint and WebSocket stub as the smoke-test foundation for the first implementation pass.
