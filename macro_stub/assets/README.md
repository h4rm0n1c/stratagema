# Macro stub assets

Place the neutral icon file as `blank.ico` in this directory before building for Windows. The repository omits the binary to avoid PR upload issues; if `blank.ico` is absent, the build script will try to generate it automatically from the repo-wide `icons/blank.png`. Drop a custom `.ico` here to override the generated icon. When no icon sources are available, the build will warn and continue without embedding an icon.
