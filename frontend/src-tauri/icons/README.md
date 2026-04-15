# App Icons

Tauri expects the files referenced in `tauri.conf.json → bundle.icon` to exist before a production bundle can be built:

- `32x32.png`
- `128x128.png`
- `128x128@2x.png`
- `icon.icns` (macOS)
- `icon.ico` (Windows)

**Stage 0 status:** not yet generated. `tauri dev` does not require these files, so development works without them. They are required for `tauri build`.

## Generating icons

Once a 1024×1024 master PNG exists at `src-tauri/icons/master.png`, Tauri's CLI can expand it into every required format:

```bash
npx @tauri-apps/cli icon src-tauri/icons/master.png --output src-tauri/icons
```

Add this to Stage 8 (pitch / beta packaging). Until then, leave this directory mostly empty.
