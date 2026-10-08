# Native plugin runtime review — 2026-10-08

The branch is a working prototype with unfinished feature parity. Successful
packaging and parser tests alone did not validate its property inspector.

## Confirmed dropdown failure and repairs

The HTML imported BarRaider EasyPI's JavaScript before pi.js. EasyPI defines global
`var websocket`, `uuid`, and `actionInfo`; pi.js redeclared those names with `let`.
Loading the actual page in Chromium produces `Identifier 'websocket' has already
been declared`, zero dropdown options, and `Waiting for commands...`. The whole
custom script fails before any embedded or live command-loading code executes.
This explains why repeatedly changing fallback mechanisms could not help.

Removed the unused third-party script and remote stylesheet. Styling is local.
The inspector now has one socket implementation. It initializes from registration
settings and uses the action type and inspector registration UUID for requests
and settings writes. Stream Deck resolves that session to the selected key when
notifying the backend. It no longer writes
default settings merely because a catalogue arrived, which could overwrite saved
overrides during asynchronous initialization.

The live commands.txt result replaces the bundled catalogue, even when empty.
Missing files, reload timeouts, and connection failures are explicit. Offline
controls cannot attempt writes through an unopened socket. A missing saved
selection remains visible instead of being silently erased.

Protocol reference: https://docs.elgato.com/streamdeck/sdk/v1/references/websocket/ui/

The first repair incorrectly sent the key context in inspector commands. Real
Windows logs showed the backend running but reporting "No stratagem code
configured", while inspector catalogue requests timed out. Elgato's reference
implementation uses `this.uuid` for inspector `getSettings`, `setSettings`, and
`sendToPlugin`: https://github.com/elgatosf/streamdeck-javascript-sdk/blob/main/js/property-inspector.js
Version 0.1.2.0 follows that implementation. Incoming inspector messages accept
either the registration UUID or the associated key context.

## Validation

`npm test`: nine parser/helper/process/socket tests.

`npm run test:ui`: two Chromium integration scenarios using the actual inspector
HTML and a real plugin child process. A test socket router simulates Elgato and
checks action identifiers and registration UUIDs, translating inspector sessions
to key contexts before notifying the backend. The previous test router accepted
key contexts directly and missed the routing defect. Tests cover
two separate keys, saved overrides, selection defaults, toggles, global settings,
edited/empty/deleted command files, missing backend replies, disconnection, and
button presses reaching helper dispatch with the selected stratagem code.
These checks do not establish that Elgato or the game accepts input.

## Remaining implementation gaps

- There is no key cooldown scheduler, reset, or keyUp/long-press implementation.
- Zero cooldown is treated as absent by the runtime's truthy default logic. This
  needs a defined distinction between an unset value and an explicit zero.
- Repeated presses can spawn overlapping helpers; there is no input queue or
  per-key busy guard. Helpers independently hold/release CTRL.
- Runtime command parsing tolerates malformed rows rather than validating every
  direction/cooldown. The helper accepts characters beyond WASD.
- External helper path selection was described in README but is not implemented;
  the README now describes the actual bundled-helper behavior.
- Catalogue data remains the July 2025 set of 84 commands.
- The Wine client experiment did not yield a usable Elgato UI. After installing
  0.1.2.0, the maintainer confirmed the repaired plugin works in real Stream Deck
  on Windows. The Linux test suite still does not exercise actual game input.

Main's AdvancedLauncher implementation has not been changed. Repair work and CI
release preparation are on `streamdeck-plugin`; nothing has been merged or
published. CI uses Elgato's pinned CLI and prepares draft prereleases only for
matching `streamdeck-v<manifest-version>` tags.
