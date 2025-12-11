# Stratagema (Restructured)

This branch pivots to a single, configurable macro stub and stream deck plugin planning while preserving the original multi-stub generator as an archive.

## Layout
- `macro_stub/` – Standalone stratagem macro helper with CLI flags.
- `icons/` – Stratagem PNG set retained unchanged for reference builds and documentation.
- `docs/` – Stream Deck plugin design notes and task planning (read these first) plus macro stub compatibility notes.
- `archive/` – Snapshot of the original Rust multi-stub generator and helper scripts.

## Building the macro stub
1. Install Rust (and a Windows toolchain such as `x86_64-pc-windows-gnu` if cross-compiling).
2. From the repository root run:
   ```bash
   cargo build --release -p macro_stub
   ```
3. The Windows executable will be at `target/release/macro_stub.exe`.

Use `macro_stub.exe --help` for argument details. The helper supports WASD or arrow playback, optional cooldown waits, and a JSON logging toggle for integration experiments.
