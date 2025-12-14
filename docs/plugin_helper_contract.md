# Plugin ↔ Helper Contract

This document describes how the Stream Deck plugin locates and invokes the macro helper binary, the CLI arguments it passes, and how output is handled. It also defines the JSON event shape reused by the TCP broadcaster.

## Helper discovery
- **Bundled binary first**: the plugin expects a helper shipped inside the plugin bundle at `helper/stratagema_macro_helper` (with platform extension as needed, e.g., `.exe` on Windows). The path is resolved relative to the plugin root (e.g., `<bundle>/com.stratagema.sdPlugin/helper/stratagema_macro_helper`).
- **User-supplied override**: a global setting `helperPath` allows pointing to an external helper binary. When set, the plugin validates the file exists and is executable before using it.
- **Fallback order**: use the external override if valid; otherwise, fall back to the bundled helper. If neither exists or is executable, the plugin surfaces a clear error in the Stream Deck logs and shows a per-key alert state.

## Invocation
The helper is called per key press with the following CLI contract (all flags optional unless noted):

```
stratagema_macro_helper --code <sequence> [--arrows] [--no-ctrl] [--log-json]
```

- `--code <sequence>` (**required**): stratagem code from `commands.txt` or Property Inspector input.
- `--arrows`: use arrow keys instead of WASD when emitting the combo.
- `--no-ctrl`: suppress the Ctrl modifier for combos that currently rely on Ctrl+<key> bindings.
- `--log-json`: emit structured logs to stdout for debugging.

The plugin passes `--code` and appends `--arrows`/`--no-ctrl` based on per-key settings. It only adds `--log-json` in developer builds or when a global "verbose" toggle is enabled (if implemented).

## Stdout/stderr expectations
- **Stdout**: reserved for structured diagnostic output from `--log-json`. In normal runs (without `--log-json`), stdout should remain empty so the plugin can treat any stdout as optional debug information.
- **Stderr**: human-readable errors (e.g., invalid code, missing keyboard permissions). The plugin captures stderr and surfaces the first line in Stream Deck logs and as a per-key alert tooltip when available.
- **Exit codes**: `0` on success; non-zero triggers the plugin's alert UI and log entry. The plugin also logs when the process cannot be spawned (missing binary/permissions).

## Minimal JSON event shape
Helper invocations are mirrored to the TCP broadcaster using the same structure to keep telemetry aligned:

```json
{"commandId":"machine_gun","code":"saswd","ts":1700000000000}
```

- `commandId`: stable ID from `commands.txt`.
- `code`: the exact code string sent to the helper.
- `ts`: Unix epoch milliseconds when the command was triggered.

Additional fields (e.g., `flags` or `source`) may be added later, but receivers should treat unknown fields as optional to remain forward-compatible.
