// Prevents an extra console window on Windows in release builds.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

//! Tauri entry point for Jarvis Nebula.
//!
//! Stage 0 shell: one IPC command (`health`) that proves the Rust backend
//! is alive. All feature work lands in Stage 1+ — see `docs/ROADMAP_DESKTOP.md`.

use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
struct HealthPayload {
    core: nebula_core::HealthReport,
    shell_version: &'static str,
}

#[tauri::command]
fn health() -> HealthPayload {
    HealthPayload {
        core: nebula_core::health(),
        shell_version: env!("CARGO_PKG_VERSION"),
    }
}

fn main() {
    // Pipe `RUST_LOG=debug` etc. through the standard env filter so native
    // debug output shows up during `tauri dev`.
    let _ = tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info".into()),
        )
        .try_init();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![health])
        .run(tauri::generate_context!())
        .expect("error while running Jarvis Nebula shell");
}
