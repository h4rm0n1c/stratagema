# Macro Stub

A single executable that reuses the original stratagem macro behavior with command-line flags instead of per-stratagem binaries. It preserves the old timing defaults (500 ms cast window, Control held unless explicitly disabled) while letting callers pick any stratagem code at runtime.

## Quick start
Run the helper from a shell or from the future Stream Deck plugin:

```bash
macro_stub.exe --code saswd --cooldown 45
```

Examples:
- Arrow keys instead of WASD: `macro_stub.exe --code saswd --arrows`
- Skip holding Control: `macro_stub.exe --code saswd --no-ctrl`
- Emit a log line for debugging/telemetry: `macro_stub.exe --code saswd --log-json`

## Arguments
- `--code <CODE>` / `-c <CODE>` – Required WASD code to send (e.g., `saswd`).
- `--cooldown <SECONDS>` – Optional cooldown wait after sending the sequence. Omit it if the caller is tracking cooldowns elsewhere.
- `--arrows` – Send arrow keys instead of WASD.
- `--no-ctrl` – Skip the initial Control key hold/release that the legacy stubs performed by default.
- `--cast-time <MILLISECONDS>` – Total time budget for dispatching key presses (default: 500ms). The helper divides this window evenly across the control hold/release and each keypress.
- `--log-json` – Print a JSON payload describing the invocation (e.g., `{"code":"saswd","cooldown":45,"arrows":false,"ctrl":true,"cast_time_ms":500}`).

## Behavior parity with the archived per-stratagem stubs
- **Control key** – Held before the sequence and released after unless `--no-ctrl` is provided.
- **Timing** – Keeps the 500 ms cast window and evenly spaces down/up events just like the generated stubs. A short `--cast-time` is clamped to 1 ms slices so no key press is skipped.
- **Arrow mapping** – `--arrows` switches WASD to arrow keys (`W→Up`, `S→Down`, `A→Left`, `D→Right`, `C→Ctrl`).
- **Cooldown printing** – If `--cooldown` is set, the helper prints the wait message and sleeps for that duration before exiting, matching how each generated stub baked in its own cooldown.

## Assets
The compiled Windows binary can embed a neutral blank icon (`assets/blank.ico`) so it is visually distinct from the archived per-stratagem executables. The repository intentionally omits the icon file to avoid binary attachment issues; drop a suitable `.ico` at that path before building. If the file is missing, `build.rs` will warn and continue without embedding an icon.
