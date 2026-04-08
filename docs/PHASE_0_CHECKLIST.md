# Phase 0 Checklist

This checklist is for pre-implementation readiness only. It exists to make sure Jarvis Nebula starts from a stable, non-contradictory baseline before any app code is written.

## Goal

Phase 0 is complete when the project is ready to begin Phase 1 without re-deciding core architecture, scope, safety boundaries, or environment conventions.

## Architecture Lock

- [x] Product language is fixed to English-only.
- [x] Frontend is fixed to Vite + Vanilla JavaScript.
- [x] Backend is fixed to Python + FastAPI.
- [x] Gemini usage is fixed to backend-only.
- [x] Neo4j Community is fixed as the local graph database.
- [x] STT/TTS baseline is fixed to faster-whisper and edge-tts.

## Security And Trust Boundary

- [x] Backend-only secret handling is defined.
- [x] `VITE_GEMINI_API_KEY` is explicitly disallowed.
- [x] Dangerous actions require explicit confirmation.
- [x] Tool execution rules require an allowlisted workspace root.
- [x] Secret leakage to browser, logs, or TTS is forbidden by plan.

## Contracts

- [x] Public backend API surface is defined.
- [x] WebSocket envelope and message types are defined.
- [x] Graph labels, relationships, required properties, and constraints are defined.
- [x] Phase exit criteria are defined.
- [x] Planning done criteria are defined.

## Repository Preparation

- [x] Create the repository layout described in `PROJECT_PLAN.md`.
- [x] Add frontend dependency manifest and base scripts.
- [x] Add backend dependency manifest and base scripts.
- [x] Add Docker Compose for Neo4j.
- [x] Add formatter and linter configuration.
- [x] Add Vitest, pytest, and Playwright configuration.
- [x] Add a minimal startup-oriented `README.md`.

## Environment Preparation

- [x] `.env.example` matches the planning baseline.
- [x] Local `.env` is reviewed against the new variable names.
- [x] `GEMINI_API_KEY` is set locally on the backend side.
- [x] Neo4j credentials are set locally.
- [x] Optional frontend WebSocket override is confirmed or left at default.

## Implementation Start Gate

Do not start Phase 1 until all unchecked items above are complete or explicitly deferred with a written reason in `PROJECT_PLAN.md`.
