@echo off
cargo b --release
cd target\release
stratagema.exe
cd generated_commands
build_projects.bat