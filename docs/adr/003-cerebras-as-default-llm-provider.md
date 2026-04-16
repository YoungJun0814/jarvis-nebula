# 003 — Cerebras as the Default LLM Provider

**Status:** Accepted
**Date:** 2026-04-16
**Deciders:** Jun (project lead), engineering

## Context

Stage 0 needs a working LLM behind a provider-agnostic interface. We initially wired Google Gemini (`@google/genai`). During verification the Gemini key in our `.env` came back `400 API_KEY_INVALID` from Google — either expired or revoked — which briefly blocked end-to-end smoke testing.

Meanwhile we had access to a **Cerebras Cloud** key with a generous free tier:

- `llama3.1-8b` — 30 RPM / 60 K TPM / 14.4 K RPD
- `qwen-3-235b-a22b-instruct-2507` — 30 RPM / 30 K TPM / 14.4 K RPD
- OpenAI-compatible `chat.completions` API, official SDK at `@cerebras/cerebras_cloud_sdk`
- Cerebras' custom hardware (WSE-3) delivers substantially faster inference than competing providers for equal-size models

For Stage 0 through Stage 2 (agent loop) our load profile is:
- Dozens of calls per active minute at most, not thousands
- Short prompts (planning, small refactors), not massive contexts
- Latency-sensitive (interactive feel)

Cerebras's profile is a near-ideal match. The 30 K TPM on the larger Qwen model is tight but manageable with careful context hygiene.

## Decision

**Cerebras is the default LLM provider for Jarvis Nebula through Stage 2. The system is architected so providers are swappable via a single env var.**

Concretely:

1. `services/llm/` exports a `createLlmClient(options)` factory plus per-provider modules.
2. Provider selection order: explicit option → `LLM_PROVIDER` env var → first provider with a non-empty API key → default `cerebras`.
3. All providers expose the same shape: `generate({ prompt, system, model? }) -> Promise<string>`, plus `getModel`, `getProvider`, `getApiKeySource`.
4. Default Cerebras model: `qwen-3-235b-a22b-instruct-2507` — strong reasoning for agent work. Low-latency paths can override with `model: 'llama3.1-8b'`.
5. Gemini client remains supported so we can switch back (or run comparisons) without code changes — only `.env`.

## Consequences

### Positive
- End-to-end smoke test works immediately on the Cerebras free tier.
- Inference latency on Cerebras is a clear differentiator we can lean into for the voice loop (Stage 5).
- Provider factory lands in Stage 0 instead of being deferred to Stage 2 — cleanest time to introduce the abstraction is when we have exactly 1-2 providers, not later.
- Downstream code never imports a provider directly, so Stage 2 can add Anthropic Claude / OpenAI without touching consumers.

### Negative
- Cerebras supports fewer models than Gemini / OpenAI. For specialized tasks (vision, embeddings) we will still need to route to another provider.
- Rate limits are lower on the free tier than paid Gemini. Multi-agent work (Stage 7) will likely need either a paid Cerebras tier or routing heavy requests to another backend.
- Every provider we add increases the amount of code that has to preserve the common interface contract. Enforce with tests.

### Risks / open questions
- Cerebras tool-use / function-calling support is newer than OpenAI's. When Stage 2 lands we must verify feature parity or paper over gaps in the client wrapper.
- Free-tier keys may be rate-limited or revoked without warning. Keep Gemini configured as a working fallback.

## Alternatives Considered

**A. Keep Gemini as the only provider.**
Rejected. The current key is dead and Gemini's interactive latency is slower than Cerebras for our expected model sizes. The abstraction cost was marginal.

**B. Use OpenAI directly.**
Rejected for Stage 0. Costs money from request one, and the Stage 0 goal is "free, working, proves the wiring." OpenAI is a good candidate to add in Stage 2 for tool-use fidelity.

**C. Run a local model (Ollama + Llama-3).**
Rejected. Local inference is an important future option (privacy, offline, no rate limits) but the latency and operational complexity are wrong for Stage 0's "prove it works" goal. Revisit in Stage 4+ when observability is mature.

**D. Wait for the Gemini key to be rotated.**
Rejected. Provider-lock-in risk is real. We need the abstraction anyway — better to install it now than fight a key rotation fire.
