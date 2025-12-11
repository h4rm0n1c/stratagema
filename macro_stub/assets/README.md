# Macro stub assets

If `blank.ico` is missing, `build.rs` will try to generate it automatically from the repo-wide `icons/blank.png`. Drop a custom `.ico` in this folder before building on Windows to override the generated icon. When no icon sources are available, the build will warn and continue without embedding an icon.
