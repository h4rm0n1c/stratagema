# Macro stub notes

These notes capture how the single macro helper maps to the archived generated stubs so future changes stay compatible with the Stream Deck plugin plan.

## What stayed the same
- **Control handling** – Holds `Ctrl` before typing and releases it after unless `--no-ctrl` is passed.
- **Timing window** – Default `--cast-time` of 500 ms split across the control press/release and each key’s down/up pair. Extremely short cast windows are clamped to 1 ms slices to avoid skipped events.
- **Arrow toggle** – `--arrows` swaps WASD to arrow keys with the same mapping as the generated stubs (`w→Up`, `a→Left`, `s→Down`, `d→Right`, `c→Ctrl`).
- **Cooldown wait** – If `--cooldown` is provided, the helper prints the wait line and sleeps for the given seconds before exiting, mirroring the baked-in cooldown of each generated exe.

## What changed (intentionally)
- **Single binary** – Instead of ~70 executables with hardcoded codes/cooldowns, callers supply `--code` and optionally `--cooldown` at runtime.
- **Argument parsing** – Uses `clap` for explicit flags (`--no-ctrl` replaces `no_ctrl`, `--arrows` replaces `arrows`).
- **JSON logging** – `--log-json` outputs a one-line payload that the upcoming Stream Deck plugin can capture for telemetry or TCP broadcasts.

## Quick reference examples
- WASD with cooldown: `macro_stub.exe --code saswd --cooldown 45`
- Arrows without Control: `macro_stub.exe --code saswd --arrows --no-ctrl`
- Minimal log-only run (no cooldown wait): `macro_stub.exe --code saswd --log-json`

See `macro_stub/README.md` for full argument descriptions and build steps.
