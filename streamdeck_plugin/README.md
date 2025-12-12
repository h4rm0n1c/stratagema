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

The script copies the plugin sources plus the `icons/` directory into `dist/com.stratagema.sdPlugin` and creates `dist/com.stratagema.sdPlugin.streamDeckPlugin` for manual installation.
