# Jarvis Nebula — BCI Future Roadmap

> What happens when **brain–computer interfaces** become consumer-ready.
> Not fantasy — a concrete plan for how Nebula plugs into that world once the hardware arrives.

This document complements [`ROADMAP_DESKTOP.md`](./ROADMAP_DESKTOP.md), which covers everything we build **before** BCI is available. Think of this as the "Phase 9+" — the endgame.

---

## Why BCI Belongs in the Plan

The desktop roadmap's vision — voice + gesture + spatial UI + LLM agents — is already sound without BCI. But the **strongest weakness** of voice is its bandwidth ceiling (~150 WPM, human thought runs ~400 WPM) and its semantic ambiguity.

BCI removes the linguistic middle layer:

- **Intent → action** without translation through spoken/typed language.
- **Cursor-level precision** proven by Neuralink's N1 trials (2024) — paralysed patients moving cursors *faster* than able-bodied mouse users.
- **No gorilla-arm fatigue.** Developers sit still, hands relaxed.
- **Accessibility-first.** Same interface works for people who can't type or speak.

Nebula's architecture is **the right shape** for BCI output because thought-level commands need a canvas that can absorb high-dimensional, rapidly-issued intents — and that canvas is a spatial graph, not a text editor.

---

## Timeline Reality Check

| Modality                       | Consumer-ready ETA | Bandwidth today           | Notes                                             |
|--------------------------------|--------------------|---------------------------|---------------------------------------------------|
| Invasive BCI (Neuralink et al) | ~2030–2035         | ~8 WPM → ~50 WPM trending | Surgery required; early adopters medical patients |
| Non-invasive EEG               | Available now      | <10 bits/sec              | Low bandwidth; latency issues                     |
| fNIRS / hybrid                 | ~2027–2030         | Moderate                  | Helmet form factor; research-stage                |
| Ultrasound-based (Forest Neurotech etc.) | ~2028–2032 | TBD                       | Less invasive than electrodes                     |

**Planning horizon:** assume non-invasive BCI becomes useful for real developer work around **2030**, invasive becomes mainstream around **2035**. Nebula's architecture should be *ready to absorb* BCI input before then.

---

## Core Architectural Principle: BCI as Another Input Adapter

The single most important design decision: **BCI is not special.** It is one more entry in the input-adapter interface, alongside voice, gesture, and keyboard.

```
                  ┌─────────────────┐
  Voice (ASR) ───►│                 │
  Gesture ────────►│  Intent Bus    │──► Agent / UI
  Keyboard ──────►│                 │
  BCI ────────────►│                 │
                  └─────────────────┘
```

This means everything built in `ROADMAP_DESKTOP.md` Stages 0–8 remains valid when BCI arrives. The intent-bus abstraction created in Stage 5 (voice-first) must be designed generously enough to accept neural-decoded signals later without rewriting the downstream stack.

---

## Phase 9 — BCI Input Adapter (when hardware arrives)

### 9.1 Device Abstraction
- Support OpenBCI, NeuroSky, Muse, Emotiv for non-invasive EEG (research / beta use).
- Plugin interface for commercial BCI APIs (Neuralink, Precision, Synchron) when they publish SDKs.
- Unified `BciInputAdapter` emitting normalized events: `cursor_delta`, `select`, `command_intent`.

### 9.2 Signal Decoding
- **On-device ML model** decodes raw neural signal → discrete intents.
- Retrainable per user (calibration session like Apple Vision Pro eye tracking).
- Confidence score attached to every decoded intent — low-confidence triggers confirmation.

### 9.3 Cursor & Focus Control
- BCI drives the 3D camera orbit / focus target directly.
- Replaces mouse drag and head tilt with thought-level focus shifts.
- Fallback to gesture / voice when confidence drops.

### 9.4 Command Intent Channel
- High-level commands ("run tests", "summarize this file", "spawn reviewer agent").
- Vocabulary starts small (~50 commands), grows with user's cortical pattern library.
- Reuses the same intent router as voice — no new agent plumbing required.

---

## Phase 10 — Thought-Level Task Creation

Once BCI reliably transmits command intents at >20 per minute, the interaction model shifts again.

### 10.1 Silent Dictation
- User "thinks" an intent → it appears in Nebula as a draft task.
- No speech, no typing.
- User confirms or edits with gesture/voice.

### 10.2 Ambient Context Capture
- Passive reading of attention signals (what the user is focusing on in the graph).
- System pre-fetches context for the likely next task before the user commits.
- "Nebula anticipates" — task cards materialize the moment a user's attention locks onto a region.

### 10.3 Emotional / Cognitive-Load Gating
- Detect high cognitive load → automatically dim non-essential UI, pause notifications, slow agent output rate.
- Detect frustration → agent offers to back out the last change.
- Strictly opt-in, fully local, never transmitted.

---

## Phase 11 — Bidirectional BCI (Output Feedback)

Far-future: when BCI can **write** signals back into cortex (stimulation or ultrasound-based), not just read them.

- Haptic-equivalent feedback for virtual interactions.
- Direct-attention cues ("agent needs confirmation") without audio/visual interruption.
- Shared-attention experiences between paired developers.

This is **post-2040 speculation.** We flag it so the data-model/eventing layer doesn't preclude it.

---

## What This Means for Stages 0–8 (Desktop Roadmap)

Every stage we build today should satisfy the following constraints so that the BCI transition is a *plugin swap*, not a rewrite:

| Stage        | BCI-Readiness Requirement                                                  |
|--------------|----------------------------------------------------------------------------|
| Stage 1 (FS) | Rust backend clean separation — BCI hardware will live in the same layer. |
| Stage 2 (Agent) | Agents consume intents, not keystrokes. Already BCI-ready.               |
| Stage 3 (Task) | Task creation API must accept intents from any source with metadata.   |
| Stage 4 (Observability) | No changes required — BCI reads the same visual output.         |
| Stage 5 (Voice) | **Critical.** Design the intent bus to accept neural-decoded events.    |
| Stage 6 (Edit) | Precise editing must have a non-verbal path — BCI will drive this.     |
| Stage 7 (Multi-agent) | Agent dispatch API must accept low-latency intent streams.       |
| Stage 8 (Beta) | Telemetry schema should reserve fields for future BCI event types.    |

The single most load-bearing design decision is **Stage 5's intent bus.** Get it right, and BCI slots in with one adapter class.

---

## Research Anchors (Track These)

- Neuralink product updates (cursor throughput, WPM benchmarks).
- OpenBCI hardware releases + community decoders.
- Emerging BCI SDKs (Synchron Switch, Precision Neuroscience Layer 7).
- Academic work on **imagined speech decoding** (Willett et al. 2023, Stanford; Metzger et al. 2023, UCSF).
- Motor-cortex typing benchmarks (Facebook / Meta's old CTRL-labs work; now Reality Labs).

Revisit this document every 6 months. Adjust Phase 9 activation timing based on the bandwidth benchmarks.

---

## Honest Constraints

Even with mature BCI, these problems remain:

- **Code reading is still visual.** BCI doesn't help you understand a 200-line function faster.
- **LLM interpretation is still lossy.** High-bandwidth intent still needs grounding in precise specs.
- **Mass-market BCI adoption will take a decade past technical readiness.** Cultural inertia, regulation, health-data concerns.
- **Surgery is a very high barrier.** Non-invasive must reach useful bandwidth or adoption stays niche.

We build Nebula to be the obvious home for BCI-equipped developers **when** they exist, without betting the company on a specific timeline.

---

## Summary

BCI is not a bolt-on; it is the natural extension of an architecture that already treats intent as the primitive. Every design choice in the desktop roadmap has a line in the "how does this handle BCI later" column. Get the intent bus right in Stage 5, keep the Rust core clean in Stage 1, and Phase 9 becomes a 2–4 month integration project rather than a rearchitecture.

The bet: **in 2030, every developer tool will need to accept intents from multiple modalities including neural signals. Nebula is designed to be that tool from day one, with BCI support already shaped-out in the architecture.**
