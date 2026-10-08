# Stratagema native Stream Deck plugin (preview)

This Windows plugin runs stratagem macros without Advanced Launcher. The repaired
plugin has been confirmed working in Stream Deck by the maintainer. It is still
a preview with outstanding feature work listed in `docs/plugin_feature_ux_review.md`.

## Cooldowns and new rounds

A successful sequence starts the configured per-key countdown. Presses during the
countdown are ignored. Additional presses while any sequence is being sent are
also ignored; they are never queued. Failed sends do not start a cooldown.

Drag **Reset Round** from the Stratagema actions list onto a spare key. Press it
at the start of a round to clear all cooldowns across pages and profiles. It
requires no configuration and does not cancel input already being sent.

## Layout
- `manifest.json` – SDK v2 manifest with the Node 20 runtime for the `com.stratagema.sdplugin.stratagem` key. Windows only; the macro helper does not implement macOS input.
- `plugin.js` – Plugin runtime script that connects to the Stream Deck websocket, hydrates settings, and relays stratagem metadata to the Property Inspector.
- `property-inspector/` – HTML/CSS/JS for the per-key and global settings UI.
- `shared/commands.js` – Shared parser for `commands.txt` with a blank-icon fallback.
- `commands.txt` – Stratagem list (copied from the archived generator) used by the Property Inspector dropdown.
- `icons/blank.png` – Default icon placeholder stored in the repo-wide icons set and copied in at build time.
- `scripts/package.ps1` / `scripts/package.sh` – Windows and cross-compilation scripts that create the installer using Elgato's pinned CLI.

## commands.txt format
Each stratagem is one line: `id|code|cooldownSeconds`, e.g.:

```
machine_gun|saswd|410
```

Icons are expected to match the `id` (for example `icons/machine_gun.png`).

## Packaging (unsigned developer bundle)
Install runtime dependencies and run the protocol tests:

```
cd streamdeck_plugin
npm ci
npm test
npx playwright install chromium
npm run test:ui
```

When Elgato launches `plugin.js`, it supplies `-port`, `-pluginUUID`,
`-registerEvent`, and `-info` arguments. The entry point connects to the local
WebSocket, registers the plugin, and requests global settings. The bundled `ws`
dependency supplies WebSockets on Node 20.

The inspector uses bundled HTML/CSS/JavaScript with no CDN dependencies. The browser
tests load that actual HTML in Chromium and connect it to the real plugin process
through a simulated Stream Deck socket router. They cover dropdown selection,
saved overrides, separate keys, global settings, edited/empty/missing commands.txt,
and a missing plugin response. They do not exercise Elgato itself or game input.
On Linux, tests use `/usr/bin/chromium` if present; `STREAMDECK_TEST_BROWSER` can
specify another browser executable.

The dropdown starts with a clearly labelled bundled catalogue while connecting.
The plugin's live commands.txt response replaces it, including an empty result.
Reload reports a timeout or file error instead of claiming the fallback was loaded
from commands.txt. Existing selections missing from the file remain visible.

On Windows, install source dependencies once, then run from the repository root
in PowerShell 7 (as used by GitHub Actions):

```
npm ci --prefix streamdeck_plugin
./streamdeck_plugin/scripts/package.ps1
```

On Linux, install the Rust Windows target and MinGW first, then use:

```
rustup target add x86_64-pc-windows-gnu
HELPER_TARGET=x86_64-pc-windows-gnu bash streamdeck_plugin/scripts/package.sh
```

Packaging rejects non-Windows helper targets because those builds are placeholders.

Packaging builds the Windows helper and generates catalogue data, then stages
only runtime files and production dependencies. Elgato's CLI validates the
manifest and creates `dist/com.stratagema.sdplugin-<manifest-version>.streamDeckPlugin`
plus `dist/SHA256SUMS.txt`. Double-click the installer to install or update it.
The unversioned installer is also retained locally. Tests, browser binaries,
packaging scripts, and the CLI are not shipped in the plugin.

## CI and preview releases

Pull requests and pushes to `streamdeck-plugin` run the Node 20 backend and
Chromium inspector tests on Windows, build the helper, and upload the installer
and checksum as the `stratagema-streamdeck-plugin` Actions artifact. GitHub wraps
Actions artifact downloads in a ZIP; the installer inside is the clickable
`.streamDeckPlugin` file. The eventual release attaches that installer directly.

To prepare a release once the remaining concerns are addressed:

1. Update the four-part `Version` in `manifest.json` and the matching three-part
   version in `package.json` / `package-lock.json`. Update
   `docs/streamdeck_release_notes.md` with the preview's actual behavior and limits.
2. Commit the changes to `streamdeck-plugin` and push the branch. Check the
   **Build Stream Deck plugin** workflow and test its installer in Stream Deck.
3. Tag the tested commit as `streamdeck-v<manifest-version>` and push that tag,
   e.g. `streamdeck-v0.1.7.0`. CI rejects a tag that differs from the manifest.
4. CI rebuilds and tests that commit, then creates a **draft prerelease** with the
   installer and SHA-256 checksum. Review the draft and publish it when ready.

Branch pushes do not create releases. Tags use the `streamdeck-v` prefix to keep the native preview separate
from the Advanced Launcher releases on `main`.

## Manual test checklist
These steps mirror the validation matrix in the Stream Deck plugin design docs:

- **Property Inspector dropdown** – Open the Property Inspector, ensure the stratagem dropdown populates from `commands.txt`, and verify custom code/cooldown fields sync back to the key when changed.
- **Keypress → helper** – Press a configured key and confirm the helper launches with the expected code/flags (WASD vs. arrows, control toggle) and the key starts its cooldown without a green checkmark.
- **Cooldown and Reset Round** – After successful playback, the key displays remaining time and ignores presses until ready. Change pages and return to confirm tracking continues. Add the separate Reset Round action and press it to clear every cooldown, including hidden keys. Resetting during playback lets that sequence finish without restoring its old cooldown. A zero-second override disables cooldown for that key. Plugin restart clears timers.
- **TCP listener reconnect** – Run a listener for helper JSON events, trigger a stratagem, then restart the listener to ensure subsequent keypresses are still delivered after reconnecting.

## Helper lookup and errors
- The plugin uses the bundled Windows helper at `helper/stratagema_macro_helper.exe`. External helper path overrides are not implemented.
- If the bundled helper is missing or fails to spawn/exit cleanly, the plugin logs the failure to the Stream Deck log and shows the standard alert state on the key that was pressed.
- See `docs/plugin_helper_contract.md` for the complete invocation contract and stdout/stderr expectations.
