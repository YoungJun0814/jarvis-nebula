# 001 — Shift from File Primitive to Task Primitive

**Status:** Accepted
**Date:** 2026-04-16
**Deciders:** Jun (project lead), engineering

## Context

The MVP treats **files and folders** as the dominant data primitive. The 3D layered card stack renders the virtual filesystem; drill-in navigates folder children; tab labels show `L{depth} · {name} · {count}`. This mirrors the VS Code / Finder paradigm.

However, the underlying thesis of Jarvis Nebula is that we are building for a **post-code-reading era**: developers increasingly express intent through prompts and review agent-produced diffs rather than writing lines by hand. In that world:

- The unit of progress is the **task**, not the file.
- The source of truth about "what is happening" is the **system's behavior** (tests, processes, logs), not the source tree.
- LLM agents are persistent workers, not one-shot completions — they deserve first-class representation.

If we keep files as the home-screen primitive we will reinforce the wrong mental model for our users and build UI that points them at the least-valuable representation of their work.

## Decision

**Tasks, system state, and LLM agents are first-class citizens in the Nebula data model and the primary view. Files become a secondary, drillable layer accessible on demand.**

Concretely:

1. The default home layer rendered on project open shows **active and recent tasks**, not the file tree.
2. The data model gains a `Task` entity (with status, parent-child decomposition, artifacts, agent ownership) that is persisted to SQLite.
3. LLM agent instances are rendered as spatial `AgentCard` entities in the same 3D stage as task nodes.
4. File graphs remain available via an explicit "Files" layer toggle or drill-in from a task that touched files.
5. All existing file-tree navigation code stays functional, but it is architecturally demoted — wrapped behind a layer abstraction, not the default entry point.

## Consequences

### Positive
- Users are pointed at the representation that matches their actual workflow in the Agent era.
- Observability (Stage 4) and multi-agent orchestration (Stage 7) have a natural home — they are peers of tasks, not awkward overlays on a file tree.
- BCI integration (future) targets intent → task creation directly, skipping the "pretend we are editing a file" fiction.

### Negative
- We have to resist the temptation to show the file tree by default, even though it is the most visually complete thing we have today.
- Until Stage 2 (agent loop) ships, the task layer will feel empty; users may be confused during the transition.
- Existing MVP gesture wiring (`pinch → drill into folder`) gets re-targeted to drill into tasks, requiring careful onboarding.

### Risks / open questions
- How do we render tasks meaningfully before we have real agents producing them? Stage 1 must seed tasks from git history and recent edits to avoid a blank canvas.
- Task persistence across project switches — per-project SQLite vs global — resolve in Stage 3.
- What happens when the user really just wants to browse files (e.g. reading docs)? The "Files" toggle must be one keystroke / voice command away.

## Alternatives Considered

**A. Keep files as the home primitive, add tasks as a sidebar.**
Rejected. This is the VS Code pattern. It preserves the wrong mental model: it tells users "you are here to browse files, and tasks are a side concern." The whole bet of Nebula is the inverse.

**B. Unify everything under a generic "Node" type, no first-class task concept.**
Rejected. Generic nodes without semantic types make the UI feel like a toy knowledge-graph explorer. We need strong types so rendering, gestures, and agent behavior can specialize.

**C. Build a parallel task UI in a separate window.**
Rejected. Splits attention between two surfaces; defeats the point of a unified spatial workspace.
