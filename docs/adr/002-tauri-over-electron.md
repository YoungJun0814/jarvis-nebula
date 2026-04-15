# 002 — Tauri Over Electron for Desktop Packaging

**Status:** Accepted
**Date:** 2026-04-16
**Deciders:** Jun (project lead), engineering

## Context

Stage 1 of the desktop roadmap requires the Nebula UI to ship as a **native desktop app** with access to the local filesystem, processes, and eventually hardware (camera, BCI devices). The two mainstream options are:

- **Electron** — ships a full Chromium + Node.js runtime; mature ecosystem; large install size (~150 MB baseline); Node.js in the main process gives easy access to OS APIs.
- **Tauri** — uses the OS-native webview (WebView2 on Windows, WKWebView on macOS, WebKitGTK on Linux); Rust in the main process; much smaller installer (~10 MB); much smaller memory footprint.

Additional context:

- We expect heavy filesystem scanning, process spawning, and eventually real-time signal processing (voice VAD, BCI decoding). These are CPU/memory sensitive; Rust is a significantly better host than Node.js for that work.
- The frontend is vanilla JS + Vite, so we are not tied to any Node-specific build chain in the renderer.
- Security: giving an LLM agent filesystem access is inherently risky. Tauri's permissions model (explicit capability allowlists per command) is dramatically better than Electron's "full Node.js everywhere" default.

## Decision

**Use Tauri 2.x as the desktop packaging stack. Rust crates live in `packages/` (workspace members). The main Tauri app lives in `src-tauri/` inside the frontend directory.**

Concrete choices:

1. Tauri 2.x (current stable at 2026-04).
2. Rust workspace at repository root (`Cargo.toml` workspace manifest).
3. Core OS-interface crate: `packages/nebula-core` — filesystem, git, shell, watcher.
4. Tauri app crate: `frontend/src-tauri` — wires `nebula-core` to the frontend via IPC commands.
5. `@tauri-apps/api` consumed by the frontend as a thin IPC helper.
6. Ship **macOS first** (smaller support matrix while we validate the product), then Windows, then Linux.

## Consequences

### Positive
- ~10× smaller installer and memory footprint than Electron.
- Native Rust gives us zero-cost integration for future heavy subsystems (audio ring buffers, BCI decoders, tree-sitter parsers).
- Capability-based permissions reduce the blast radius of a misbehaving LLM agent.
- Single Rust codebase between desktop shell and future CLI / headless tools.

### Negative
- Tauri's ecosystem is smaller than Electron's. Some plugins we want (screen capture, global shortcuts) may need custom Rust implementations.
- Team needs Rust fluency for backend work; we budget learning time in Stage 1.
- WebView differences across platforms (WebKit on macOS, Chromium-based WebView2 on Windows) require cross-browser testing.

### Risks / open questions
- If we find Tauri blocks on a must-have feature (e.g. specific BCI driver requires Node APIs), we revisit this decision.
- macOS-first means Windows users can't try the desktop build until Stage 1.5 — we accept this to keep scope tight.

## Alternatives Considered

**A. Electron.**
Rejected. Chromium baggage, Node-in-main-process security surface, and memory footprint are all wrong for our requirements. The mature ecosystem is tempting but insufficient to justify the cost.

**B. Neutralinojs / other lightweight webview wrappers.**
Rejected. Smaller community and unclear long-term support; Tauri is the converged industry choice for the "webview + native core" category.

**C. Stay web-only indefinitely.**
Rejected. We cannot reach the filesystem or process APIs we need for Stage 1+ without a desktop shell.

**D. Ship a Rust GUI (egui / iced) with no webview.**
Rejected. The Liquid Glass aesthetic, MediaPipe hand tracking, and SVG-heavy rendering already work well on web and would require rebuilding from scratch in a Rust GUI framework. Not a good use of time.
