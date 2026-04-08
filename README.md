# Jarvis Nebula

Jarvis Nebula is an AI assistant with a 3D spatial interface. The product vision is an English-only desktop experience where the user can explore a live knowledge graph, use mouse and gesture input in parallel, speak commands, and let an agent plan and execute tasks with explicit safety controls.

## Current Status

This repository is currently in the planning stage.

- The main architecture and scope are defined in `PROJECT_PLAN.md`.
- Implementation has not started yet.
- The next step is to complete Phase 0 readiness work before creating the actual frontend and backend scaffolding.

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

## Environment Template

`.env.example` has been aligned to the planning baseline.

Important rules:

- `GEMINI_API_KEY` is backend-only.
- Do not use `VITE_GEMINI_API_KEY`.
- Only non-secret frontend values should use the `VITE_` prefix.

## What Happens Next

Before feature work begins:

1. Complete the Phase 0 checklist.
2. Create the repository structure described in `PROJECT_PLAN.md`.
3. Add dependency manifests, Docker Compose, linting, formatting, and test configuration.
4. Start Phase 1 implementation only after the planning checklist is green.
