//! nebula-core — OS-interface primitives for Jarvis Nebula.
//!
//! Stage 0 ships an intentionally minimal surface: a version string and a
//! health check. Stage 1 will introduce the real modules (`fs`, `git`,
//! `shell`, `watch`). We expose the module outlines here so downstream code
//! (Tauri shell, tests) can already import the final module paths.
//!
//! See `docs/ROADMAP_DESKTOP.md` for the staged build plan.

use serde::Serialize;

/// Semantic version of the `nebula-core` crate, made available to the shell
/// for diagnostics ("About Nebula" panel, bug reports, etc.).
pub const VERSION: &str = env!("CARGO_PKG_VERSION");

/// A tiny health payload the Tauri shell can call during startup to confirm
/// the Rust backend is alive. Intentionally trivial — this becomes a real
/// readiness probe once Stage 1 modules exist.
#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct HealthReport {
    pub crate_name: &'static str,
    pub version: &'static str,
    pub stage: &'static str,
}

/// Return a health report describing the current build.
///
/// The `stage` field is hard-coded today and moves forward as we ship the
/// roadmap. Treat it as a coarse, human-readable capability marker rather
/// than a semver-like guarantee.
pub fn health() -> HealthReport {
    HealthReport {
        crate_name: "nebula-core",
        version: VERSION,
        stage: "stage-0",
    }
}

// --- Module placeholders (Stage 1) --------------------------------------
// These are intentionally empty today. They exist so Stage 1 PRs can fill
// them in without renaming anything or updating consumer imports.

/// Filesystem scanning, gitignore-aware tree builds, file reads. Stage 1.
pub mod fs {}

/// Git integration (branch, status, diff, commit). Stage 1.
pub mod git {}

/// Shell / PTY command execution. Stage 1.
pub mod shell {}

/// File-change watcher powered by `notify`. Stage 1.
pub mod watch {}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn health_reports_stage_zero() {
        let report = health();
        assert_eq!(report.crate_name, "nebula-core");
        assert_eq!(report.stage, "stage-0");
        assert!(!report.version.is_empty());
    }
}
