# Stratagema — native Stream Deck plugin

This branch contains the Windows Stream Deck plugin preview. It sends stratagem
sequences directly, without Advanced Launcher, and includes per-key cooldowns
and a separate **Reset Round** action to clear them all.

## Install

Download the `.streamDeckPlugin` installer from the
[native plugin preview release](https://github.com/h4rm0n1c/stratagema/releases/tag/streamdeck-v0.1.7.0)
and double-click it. Requires Windows 10+ and Stream Deck 7.0+.

In Stream Deck's Stratagema action list, drag **Stratagema Stratagem** onto a key
and choose a stratagem. Drag **Reset Round** onto another key for the start of a
new round. Input bindings must match your game settings.

See [plugin setup and build instructions](streamdeck_plugin/README.md) and
[preview features and limitations](docs/streamdeck_release_notes.md).

The [Advanced Launcher version on main](https://github.com/h4rm0n1c/stratagema/tree/main)
remains available. Native preview releases use separate `streamdeck-v…` tags.

## Layout

- `macro_stub/` — Windows keyboard helper bundled with the plugin.
- `streamdeck_plugin/` — Runtime, settings inspector, tests, and packaging scripts.
- `icons/` — Stratagem and Reset Round artwork.
- `docs/` — Design notes, implementation reviews, and release notes.
- `archive/` — Original multi-stub generator and helper scripts.

## Build

See [packaging instructions](streamdeck_plugin/README.md#packaging-unsigned-developer-bundle).
CI runs backend and inspector tests on Windows before packaging the clickable
installer and its checksum. Tag builds prepare a draft prerelease from that
CI-built artifact.
