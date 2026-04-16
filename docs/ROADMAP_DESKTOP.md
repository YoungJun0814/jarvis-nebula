# Jarvis Nebula — Desktop Roadmap (Stage 0 → 8)

> What we can build **today**, on a normal computer screen, without BCI.
> Target: a post-code-era developer OS, ready for private beta and seed-round pitching.

---

## Vision Summary

Jarvis Nebula is **not a 3D file explorer**. It is the developer's **operating layer** for an era where:

1. **Code is rarely read line-by-line** — LLM agents write it; humans specify and review.
2. **The primitive is task + system state + agent**, not file + line.
3. **Voice is the main input** today; gesture is supporting; BCI is future.
4. **Spatial UI fits graph-shaped work** (tasks, dependencies, agents, data flow) better than 2D editor tabs do.

This document is the concrete execution plan to reach that vision on current consumer hardware.

---

## Guiding Principles

1. **Tasks and system state are first-class citizens.** Files are a secondary, drillable layer — not the home screen.
2. **Every LLM agent is a spatial entity.** Multi-agent work is only valuable if you can *see* it happening.
3. **The 5% code-reading case must feel excellent.** We lose trust if precise inspection is clumsy.
4. **Local-first.** User files never leave the machine by default. Cloud sync is opt-in.
5. **Measure everything.** Latency, token cost, agent success rate, task completion time — all visible.

---

## Stage Overview

| Stage | Name                                    | Duration | Status |
|-------|-----------------------------------------|----------|--------|
| 0     | Cleanup & Foundation                    | 1 week   | in progress |
| 1     | Kill the Demo — Real Filesystem         | 2–3 wks  | pending |
| 2     | LLM Agent Loop (Gemini → Claude)        | 3–4 wks  | pending |
| 3     | Task Graph as Primary Primitive         | 3–4 wks  | pending |
| 4     | System Observability                    | 4–6 wks  | pending |
| 5     | Voice-First Interaction                 | 3–4 wks  | pending |
| 6     | Drill-In Code Editing                   | 2–3 wks  | pending |
| 7     | Multi-Agent Orchestration               | 3–4 wks  | pending |
| 8     | Beta & Pitch Readiness                  | 2–3 wks  | pending |

**Total realistic:** 9–12 months (solo) / 5–7 months (2 engineers).

---

## Stage 0 — Cleanup & Foundation (1 week)

### Goals
- Archive the current MVP for posterity.
- Establish architecture decision record (ADR) discipline.
- Choose desktop packaging stack (**Tauri**, not Electron).
- Wire up Gemini API as the LLM provider for now (Claude/OpenAI swap later).

### Tasks
- [x] Preserve current MVP state (commit `feat: virtual filesystem MVP...` on `main`).
- [ ] Create `legacy/phase-mvp` tag marking the web-only virtual-FS MVP.
- [ ] Write `docs/ROADMAP_DESKTOP.md` (this file).
- [ ] Write `docs/ROADMAP_BCI_FUTURE.md`.
- [ ] Create `docs/adr/` with first two ADRs:
  - `001-shift-from-file-to-task-primitive.md`
  - `002-tauri-over-electron.md`
- [ ] Update `PROJECT_PLAN.md` to point at these new roadmaps.
- [ ] Scaffold Tauri: `src-tauri/` directory, `tauri.conf.json`, Rust workspace.
- [ ] Create `packages/nebula-core` Rust crate (empty skeleton + lib.rs).
- [x] Move API keys from root `.env` into structured config loader.
- [x] Add Cerebras (`@cerebras/cerebras_cloud_sdk`) and Gemini (`@google/genai`) clients behind a `services/llm/` provider factory with a common `generate({ prompt, system })` surface.
- [ ] Verify Tauri dev server boots the existing Vite frontend with zero feature regressions.

### Deliverables
- Clean branch, tagged legacy version.
- Tauri dev build running the current Nebula UI in a native window.
- Working Gemini smoke test (CLI script that sends a prompt and prints the response).
- ADR 001 + ADR 002 committed.

### Exit Criteria
- `npm run tauri:dev` opens a desktop window showing the existing Nebula scene.
- `node scripts/llmSmoke.js "hello"` prints a real model response (Cerebras by default, Gemini via `LLM_PROVIDER=gemini`).
- All existing tests still pass and new provider tests are green.

---

## Stage 1 — Kill the Demo, Connect Reality (2–3 weeks)

### Goals
Replace the generated virtual filesystem with the **user's actual project**.

### 1.1 Rust Backend (`nebula-core`)
- [ ] `fs` module: recursive directory scan, `.gitignore` parsing, file metadata.
- [ ] `watch` module: `notify` crate for live file change events.
- [ ] `git` module: `git2` crate — branch, HEAD, status, diff summaries.
- [ ] `shell` module: `portable-pty` for running commands, streaming stdout/stderr.
- [ ] Tauri IPC commands exposing each of the above to the frontend.

### 1.2 Frontend Integration
- [ ] Replace `generateDemoGraph.js` with `loadProjectGraph.js` that calls Tauri IPC.
- [ ] "Open Project" flow: native directory picker → scan → build graph.
- [ ] Live reload: subscribe to `watch` events, patch graph without full rebuild.
- [ ] Git overlay: decorate nodes with modified / staged / untracked states.
- [ ] Recent projects list (persisted in app data dir).

### 1.3 Terminal Integration (Primitive)
- [ ] `bash`/`pwsh` command execution exposed as a tool for later agent use.
- [ ] Output stream rendered to a "Terminal" spatial card.

### Deliverables
A user can open a real GitHub repo, navigate it as a 3D stack of cards, see live git status, and execute shell commands through a Terminal card.

### Risks
- **Large repos** (10k+ files): scan time, memory. Mitigate with virtualization and lazy children.
- **File watchers on Windows**: `notify` has known quirks; budget time for debugging.

---

## Stage 2 — LLM Agent Loop (3–4 weeks)

### Goals
Turn Nebula from a UI demo into a **working tool**. Agents can read, edit, test — with Gemini as the initial brain.

### 2.1 LLM Provider Abstraction
- [ ] `services/llm/provider.js` — common interface (stream, tool-use, multi-turn).
- [ ] Gemini implementation (Stage 2 default).
- [ ] Stubs for Claude / OpenAI so we can swap providers without rewriting.

### 2.2 Tool-Use Layer
- [ ] `read_file`, `write_file`, `edit_file` (surgical line edits)
- [ ] `bash`, `grep`, `glob`
- [ ] `git_status`, `git_diff`, `git_commit`
- [ ] `run_tests`
- [ ] **Safety:** every destructive tool routes through a confirmation gate unless pre-approved in the session.

### 2.3 Agent as Spatial Entity
- [ ] `AgentCard` component: rendered as a card in the 3D stage.
- [ ] Contents: goal, plan, current tool call, streaming output, token cost.
- [ ] Spawn an agent → new card flies in from deep z.
- [ ] Multiple agents → separate spatial locations, non-overlapping.

### 2.4 Plan-Then-Execute Pattern
- [ ] Intent → agent produces a plan (subtask tree).
- [ ] User can inspect and approve the plan before execution.
- [ ] During execution: each subtask lights up as it runs, with real-time status.

### Deliverables
> "Add a dark-mode toggle to this project." → agent plans, shows the plan as a task graph, executes each step with live visual feedback, commits when done.

### Risks
- **Gemini tool-use reliability** vs Claude. Keep the provider abstraction clean so we can migrate.
- **Runaway agents** that edit the wrong files. Mandatory auto-checkpoint before every write.

---

## Stage 3 — Task Graph as Primary Primitive (3–4 weeks)

### Goals
Invert the default view. When you open Nebula, you see **active and recent tasks**, not a file tree.

### 3.1 Data Model
- [ ] `Task { id, intent, status, parent_id, children, agent_id, artifacts, created_at, completed_at }`
- [ ] SQLite persistence via `rusqlite` (bundled with Tauri).
- [ ] Task history, replay, re-run.

### 3.2 Task-Centric UI
- [ ] Home layer = active tasks. File tree demoted to a secondary toggleable layer.
- [ ] Task → file edges (which files did this task touch).
- [ ] Task timeline scrubber (replay how the codebase changed).
- [ ] Failed-task recovery flow.

### 3.3 Interaction
- [ ] Voice or text → "new task" creation anywhere in the UI.
- [ ] Drill into a task to see its subtask tree.
- [ ] Merge / split / re-prioritize tasks with gesture or voice.

### Deliverables
Opening Nebula on an existing project shows recent tasks, ongoing agent work, and a way to launch new tasks — with file navigation relegated to an on-demand overlay.

---

## Stage 4 — System Observability (4–6 weeks)

### Goals
You don't read the code; so you must **see what it's doing**. This is what makes "vibe coding" actually safe at scale.

### 4.1 Test Integration
- [ ] Adapters: Vitest, Jest, Pytest, Go test (start with one, ship one).
- [ ] Test results as spatial nodes (green = pass, red = fail, amber = flaky).
- [ ] Failure → edge to the suspect file/function.

### 4.2 Long-Running Processes
- [ ] Dev servers, build watchers, Docker containers rendered as persistent cards.
- [ ] Live log streaming inside each card.
- [ ] Error extraction → promoted to standalone alert nodes.

### 4.3 Static Analysis
- [ ] `tree-sitter` integration for Python, JS/TS, Go, Rust.
- [ ] Symbol graph (functions, classes, imports).
- [ ] Import graph at package level.
- [ ] Call graph at function level (language-specific, best-effort).

### 4.4 Runtime Tracing (Stretch)
- [ ] OpenTelemetry ingest from local dev server.
- [ ] HTTP requests visualized as animated edges crossing the graph.
- [ ] **Pitch-worthy visual.** Save for last and keep polished.

### Deliverables
A glance at Nebula answers: "what is my app doing right now, and what broke?"

---

## Stage 5 — Voice-First Interaction (3–4 weeks)

### Goals
Replace the current push-to-talk demo with a **continuous, context-aware voice loop**.

### 5.1 ASR
- [ ] Evaluate: `whisper.cpp` (local, free, ~1s latency) vs Deepgram (cloud, <300ms, paid).
- [ ] Ship with local Whisper by default; cloud as opt-in.
- [ ] Voice Activity Detection (VAD) for endpoint detection.

### 5.2 Wake and Modes
- [ ] Wake word: "Nebula" (or configurable).
- [ ] Mode switch: quick command vs dictation vs conversation.
- [ ] Meta-commands: "undo", "cancel", "pause the agent".

### 5.3 Intent Routing
- [ ] Short commands → direct action (navigate, zoom, focus).
- [ ] Long commands → agent task creation.
- [ ] Gemini classifies and extracts parameters.

### 5.4 Audio Feedback
- [ ] TTS for high-signal events (test failed, agent needs confirmation).
- [ ] Ambient audio cues (subtle "agent started", "task complete").
- [ ] Opt-out for silent mode.

### Deliverables
A developer keeps hands off the keyboard, completes a feature end-to-end by voice, with the system running quietly and confirming only at critical junctures.

---

## Stage 6 — Drill-In Code Editing (2–3 weeks)

### Goals
Honor the 5% case: when the human *must* read or edit code directly, it works excellently.

### 6.1 Embedded Editor
- [ ] Host Monaco or CodeMirror 6 inside a Nebula card.
- [ ] Disable Liquid Glass blur in edit mode — readability wins.
- [ ] LSP client (via `tower-lsp` proxy in Rust): diagnostics, go-to-definition, hover.

### 6.2 Diff Review
- [ ] Agent changes shown as inline diffs.
- [ ] Line-level accept / reject.
- [ ] "Why did you do this?" expands into an agent rationale panel.

### 6.3 Spatial Symbol Navigation
- [ ] Reuse Stage 4.3 call graph inside the editor context.
- [ ] "Show callers of this function" → spatial expansion, not a flat list.

### Deliverables
A senior can do a careful code review inside Nebula without reaching for VS Code.

---

## Stage 7 — Multi-Agent Orchestration (3–4 weeks)

### Goals
The **real** differentiation. Claude Code / Codex are single-agent CLIs. Nebula manages a **team** of agents spatially.

### 7.1 Branching and Merging
- [ ] One task → multiple parallel agents trying different approaches.
- [ ] Side-by-side result comparison.
- [ ] Select winner → merge into main task output.

### 7.2 Specialized Roles
- [ ] Explorer, Implementer, Tester, Reviewer (different system prompts + tool sets).
- [ ] Agents can send messages to each other (visualized as edges).

### 7.3 Human-in-the-Loop Checkpoints
- [ ] Agents halt for confirmation at configurable gates.
- [ ] Pending approvals accumulate as a visible notification cluster.
- [ ] Voice approval: "approve all", "reject the last two", etc.

### Deliverables
"Build this feature, test it, document it." → three agents running simultaneously in separate spatial regions, visible at a glance, producing a merged result.

---

## Stage 8 — Beta & Pitch Readiness (2–3 weeks)

### 8.1 Onboarding
- [ ] First-run tutorial using Nebula's own repo as the tour project.
- [ ] Real-project onboarding: scan → summary → first suggested task.

### 8.2 Performance
- [ ] Target 60 fps on 10k+ file projects.
- [ ] Level-of-detail for deep stacks; virtualization for large graphs.
- [ ] Memory profile and leak audit.

### 8.3 Pitch Assets
- [ ] 3-minute demo video with narration.
- [ ] Landing page (Vercel static).
- [ ] Comparison matrix: Nebula vs Cursor vs Claude Code vs Devin.
- [ ] Technical blog post: "Why post-code development needs spatial UI."

### 8.4 Private Beta
- [ ] Waitlist form.
- [ ] 20–50 invited testers.
- [ ] Feedback channel (Discord or Linear Portal).
- [ ] Weekly iteration cadence.

### Deliverables
A seed-round-pitchable product with real users producing testimonials.

---

## Cross-Cutting Concerns

### Technical Risks (Ranked)
1. **Agent file-safety.** An LLM deleting the wrong file must be impossible, not unlikely. Auto-checkpoint, sandboxed writes, undo stack.
2. **3D performance under real scale.** Run stress tests with synthetic 5k/10k/50k node graphs at the end of Stage 1.
3. **Voice latency.** If round-trip exceeds ~1s, adoption dies. Local Whisper is the insurance policy.
4. **Gemini → Claude migration cost.** Keep the provider abstraction pristine.

### Out of Scope (through Stage 8)
- Mobile or tablet support.
- Plugin / extension system.
- Custom LLM fine-tuning.
- Cloud sync of user projects.
- Multi-OS day-one support (ship **macOS first**, then Windows, then Linux).

### Success Metrics
- Agent task completion rate ≥ 70% on first try by end of Stage 2.
- Average "intent to first diff" latency ≤ 10s by end of Stage 5.
- Beta NPS ≥ 40 from developers using Nebula ≥ 4 hours/week.
- 3 public testimonials by end of Stage 8.

---

## Immediate Next Actions

1. Finish Stage 0 this week.
2. Start Stage 1.1 (Rust FS adapter) immediately after.
3. Write ADR 003 (Gemini-first, Claude-compatible) when we hit the first provider-specific workaround.

When BCI becomes commercially viable, see [`ROADMAP_BCI_FUTURE.md`](./ROADMAP_BCI_FUTURE.md) for how it plugs into this architecture.
