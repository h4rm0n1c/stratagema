# Stream Deck Plugin: Initial Implementation Tasks

This checklist translates the planning decisions into concrete early tasks to port the existing Stratagema helper into a Stream Deck plugin.

## Context Recap
- Build two variants: unsigned/developer build for GitHub distribution and a signed build for the Elgato store when needed. Target SDK v6+ compatible with Stream Deck app 7.0.3 while keeping compatibility risk in mind.
- The plugin calls a single companion executable that runs the stratagem typing algorithm derived from the current Rust helper; cooldowns reset on plugin reload.
- The plugin hosts a TCP listener for `memen_demon`, with global settings (enable toggle, IP whitelist defaulting to `127.0.0.1`, configurable port) and tolerance for reconnect attempts.

## Tasks
1. **Create companion macro helper (Rust)**
   - Extract the fixed-span stratagem typing loop from `src/main.rs` into a standalone binary crate (e.g., `stratagema_macro_helper`).
   - CLI contract: `macro-helper --code saswd [--arrows] [--no-ctrl] [--log-json]`; exit immediately after emitting keystrokes without internal cooldown waits.
   - Validate WASD vs. arrow key mapping parity with the current implementation and add a short README on Windows/Wine dependencies (`enigo`, 32-bit target if needed).

2. **Define plugin ↔ helper invocation contract**
   - Document how the plugin locates/ships the helper (bundled binary vs. external path) and what arguments it passes when a key is pressed in `docs/plugin_helper_contract.md`.
   - Capture the helper CLI (`--code <sequence> [--arrows] [--no-ctrl] [--log-json]`), stdout/stderr expectations, and the JSON event shape used by the TCP broadcaster (e.g., `{"commandId":"machine_gun","code":"saswd","ts":<unix_ms>}`).

3. **Parse `commands.txt` for Property Inspector and runtime**
   - Implement a parser that reads `commands.txt` at plugin startup to populate the Property Inspector dropdown (label, code, cooldown) and to supply the helper invocation data.
   - Define behavior for malformed lines (skip with log) and for missing icons (fallback to `icons/blank.png` or similar).
   - Cache parsed data per session; reload when the file changes during development builds to avoid plugin restart.

4. **Plugin scaffold and settings plumbing**
   - Create the Stream Deck plugin structure (`manifest.json`, plugin main script, Property Inspector HTML/JS/CSS) targeting SDK v6+.
   - Per-key settings: selected stratagem ID, code, cooldown, arrows/no-ctrl flags.
   - Global settings UI: TCP enable toggle, whitelist IP, port; default whitelist `127.0.0.1` and disabled listener.

5. **Cooldown overlay and lifecycle handling**
   - On key press: trigger helper, start countdown using the cooldown from `commands.txt`, and render remaining seconds on the key.
   - Reset cooldown state to "ready" on plugin reload or Stream Deck app restart (no persistence of in-flight timers).
   - Handle Stream Deck sleep/wake events gracefully (pause/resume timers or reset to ready depending on feasibility; document chosen behavior).

6. **TCP listener stub for `memen_demon`**
   - Implement a lightweight TCP listener inside the plugin (or a small sidecar if SDK constraints require) that publishes button press events using the agreed message format.
   - Enforce whitelist filtering and cleanly handle reconnects/timeouts; ensure toggling the feature stops the listener.

7. **Packaging and developer install flow**
   - Provide a build script to generate `.streamDeckPlugin` bundles for unsigned (developer) and signed (store) builds; document how to load unsigned plugins in developer mode.
   - Note platform-specific steps for Windows/macOS (e.g., notarization/skipping) and how the helper executable is included for each platform.

8. **Test matrix for early milestones**
   - Unit tests: `commands.txt` parsing, helper CLI argument parsing, WASD-to-arrow translation parity with current helper.
   - Manual tests: select stratagem in PI, press key → helper types sequence, cooldown overlay counts down; plugin reload resets timers; TCP listener receives events and tolerates reconnects.
