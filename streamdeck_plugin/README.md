# Stratagema Stream Deck Plugin (scaffold)

This folder contains the initial scaffold for the Stratagema Stream Deck plugin described in the design docs (`docs/streamdeck_plugin_plan.md`). The structure is ready for Property Inspector wiring, helper invocation, and packaging into a `.streamDeckPlugin` bundle.

## Layout
- `manifest.json` – SDK v6 manifest for the `com.stratagema.stratagem.action` key.
- `plugin.js` – Plugin runtime script that connects to the Stream Deck websocket, hydrates settings, and relays stratagem metadata to the Property Inspector.
- `property-inspector/` – HTML/CSS/JS for the per-key and global settings UI.
- `shared/commands.js` – Shared parser for `commands.txt` with a blank-icon fallback.
- `commands.txt` – Stratagem list (copied from the archived generator) used by the Property Inspector dropdown.
- `icons/blank.png` – Default icon placeholder stored in the repo-wide icons set and copied in at build time.
- `scripts/package.sh` – Helper script to assemble an unsigned developer bundle.

## commands.txt format
Each stratagem is one line: `id|code|cooldownSeconds`, e.g.:

```
machine_gun|saswd|410
```

Icons are expected to match the `id` (for example `icons/machine_gun.png`).

## Packaging (unsigned developer bundle)
Run from the repository root:

```
bash streamdeck_plugin/scripts/package.sh
```

The script copies the plugin sources, `commands.txt`, and the repo-wide `icons/` directory into `dist/com.stratagema.sdPlugin`. If a built helper exists under `macro_stub/target/release/stratagema_macro_helper[.exe]`, it is bundled into `helper/` before creating `dist/com.stratagema.sdPlugin.streamDeckPlugin` for manual installation.

## Manual test checklist
These steps mirror the validation matrix in the Stream Deck plugin design docs:

- **Property Inspector dropdown** – Open the Property Inspector, ensure the stratagem dropdown populates from `commands.txt`, and verify custom code/cooldown fields sync back to the key when changed.
- **Keypress → helper** – Press a configured key and confirm the helper launches with the expected code/flags (WASD vs. arrows, control toggle) and the key shows the standard OK indicator.
- **Cooldown overlay/reset** – After a keypress, watch the countdown overlay decrease per the `commands.txt` cooldown; reload the plugin and confirm the countdown resets.
- **TCP listener reconnect** – Run a listener for helper JSON events, trigger a stratagem, then restart the listener to ensure subsequent keypresses are still delivered after reconnecting.

## Helper lookup and errors
- The plugin prefers a bundled helper at `helper/stratagema_macro_helper` inside the plugin bundle (platform extension applied as needed). A global setting `helperPath` can point to an external binary; if valid, it overrides the bundled copy.
- If neither path is usable or the process fails to spawn/exit cleanly, the plugin logs the failure to the Stream Deck log and shows the standard alert state on the key that was pressed.
- See `docs/plugin_helper_contract.md` for the complete invocation contract and stdout/stderr expectations.
