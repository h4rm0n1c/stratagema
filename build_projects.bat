@echo off
setlocal enabledelayedexpansion

:: Set the root folder where the Rust projects are located
set ROOT_DIR="%cd%"

:: Loop through all directories in ROOT_DIR
for /d %%D in (%ROOT_DIR%\*) do (
    if exist "%%D\Cargo.toml" (
        echo Building project in %%D...
        pushd %%D
        cargo build --release
        popd
    )
)

echo All projects have been built.
pause