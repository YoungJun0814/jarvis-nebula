# Architecture Decision Records (ADRs)

This directory captures significant architectural decisions for Jarvis Nebula.

## What goes here

- Anything that is hard to reverse (e.g. choice of runtime, data model, protocol).
- Anything that future contributors will ask "why did you do it this way?" about.
- Decisions that shape multiple modules, not single-file implementation details.

## What does **not** go here

- Routine implementation choices ("use `forEach` vs `for…of`").
- Style / formatting preferences.
- Pure bug fixes.

## Format

Each ADR is a single Markdown file named `NNN-short-slug.md` where `NNN` is the zero-padded sequence number. Use the template below.

```markdown
# NNN — Short, Decisive Title

**Status:** Proposed | Accepted | Deprecated | Superseded by ADR-XXX
**Date:** YYYY-MM-DD
**Deciders:** names / roles

## Context
What situation forced this decision? What constraints apply?

## Decision
The exact decision taken. State it as a single sentence first, then elaborate.

## Consequences
- Positive: …
- Negative: …
- Risks / open questions: …

## Alternatives Considered
- Option A — why rejected
- Option B — why rejected
```

## Index

| # | Title | Status |
|---|---|---|
| 001 | [Shift from file primitive to task primitive](./001-shift-from-file-to-task-primitive.md) | Accepted |
| 002 | [Tauri over Electron for desktop packaging](./002-tauri-over-electron.md) | Accepted |
