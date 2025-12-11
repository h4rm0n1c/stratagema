# Stream Deck Plugin Plan (Stratagema)

This document captures the implementation plan for the Stratagema Stream Deck plugin, incorporating decisions from the latest discussion.

## Key Decisions
- **Distribution/signing**: Provide two builds—an unsigned/developer build (for GitHub distribution) and a signed build for the Elgato store when needed.
- **SDK target**: Target the Stream Deck SDK version with the broadest hardware support (compatible with Stream Deck app 7.0.3/22071 and newer), favoring v6+ manifest format unless compatibility testing forces a fallback.
- **Macro execution path**: Use a single companion executable that receives a stratagem code from the plugin and executes the core stratagem typing algorithm (derived from the existing Rust implementation). The plugin triggers the exe; the exe handles timing/keystrokes.
- **TCP integration**: The plugin hosts a TCP listener for `memen_demon` to connect to. Global settings include an enable/disable toggle, IP whitelist (default `127.0.0.1`), and port. `memen_demon` will handle reconnection aggressively; plugin should be tolerant of reconnects.
- **Cooldown persistence**: If the plugin or Stream Deck app restarts, cooldowns reset to a known default (fresh/ready state) rather than attempting to persist timers.

## Updated Task Breakdown
1. **Create plugin scaffold (unsigned first, signing-ready)**
   - Build initial folder structure with `manifest.json`, plugin main script, Property Inspector assets, and packaged `commands.txt`/icons.
   - Ensure manifest/packaging can produce both unsigned zip and signed submission build.

2. **Populate Property Inspector from `commands.txt`**
   - Parse `commands.txt` at runtime to drive dropdown options (name/code/cooldown) and assign icons.
   - Store per-key settings for selected stratagem, code, and cooldown.

3. **Companion macro executable**
   - Extract the fixed-span stratagem typing algorithm from the Rust stub into a lean helper exe.
   - Define protocol for the plugin to call the exe with a code (and optional flags like WASD/arrows).

4. **Cooldown UI on keys**
   - On press, trigger exe and start cooldown countdown using the configured duration.
   - Overlay timer text/indicator on the key image; reset to base icon after cooldown or on long-press cancel.
   - Reset timers to ready state on plugin reload.

5. **Global TCP broadcast settings**
   - Add global settings UI: enable toggle, whitelist (default `127.0.0.1`), port.
   - Implement TCP listener in the plugin to publish button-press events; tolerate reconnects from `memen_demon`.

6. **Packaging and install flow**
   - Document developer-mode unsigned install steps and signed build path for Elgato store submission.
   - Provide build script to produce `.streamDeckPlugin` bundles for both unsigned and signed outputs.

7. **Testing matrix**
   - Unit tests for `commands.txt` parsing and settings serialization.
   - Manual tests: Property Inspector dropdown, macro execution via companion exe, cooldown overlay behavior, reload/reset handling.
   - Manual tests for TCP listener connectivity/reconnect with `memen_demon` mock.
