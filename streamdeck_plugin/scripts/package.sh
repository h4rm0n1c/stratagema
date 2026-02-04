#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DIST_DIR="$ROOT_DIR/../dist"
PLUGIN_UUID="com.stratagema.sdplugin"
PLUGIN_ID="$PLUGIN_UUID.sdPlugin"
ARCHIVE_NAME="$PLUGIN_UUID.streamDeckPlugin"
BUILD_DIR="$DIST_DIR/$PLUGIN_ID"
HELPER_TARGET="${HELPER_TARGET:-}"
HELPER_BUILD_DIRS=(
  "$ROOT_DIR/../macro_stub/target${HELPER_TARGET:+/}$HELPER_TARGET/release"
  "$ROOT_DIR/../target${HELPER_TARGET:+/}$HELPER_TARGET/release"
)
HELPER_OUTPUT_NAME="stratagema_macro_helper"
HELPER_BASENAMES=(
  "stratagema_macro_helper"
  "macro_stub"
)

pushd "$ROOT_DIR/../macro_stub" >/dev/null
if [[ -n "$HELPER_TARGET" ]]; then
  echo "Building helper for target $HELPER_TARGET"
  cargo build --release --target "$HELPER_TARGET"
else
  echo "Building helper for host target"
  cargo build --release
fi
popd >/dev/null

rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

rsync -a "$ROOT_DIR/" "$BUILD_DIR/"
rsync -a "$ROOT_DIR/../icons/" "$BUILD_DIR/icons/"

mkdir -p "$BUILD_DIR/helper"

HELPER_COPIED=false
for BUILD_DIR_CANDIDATE in "${HELPER_BUILD_DIRS[@]}"; do
  for BASENAME in "${HELPER_BASENAMES[@]}"; do
    for EXT in "" ".exe"; do
      CANDIDATE="$BUILD_DIR_CANDIDATE/${BASENAME}${EXT}"
      if [[ -f "$CANDIDATE" ]]; then
        DESTINATION="$BUILD_DIR/helper/${HELPER_OUTPUT_NAME}${EXT}"
        cp "$CANDIDATE" "$DESTINATION"
        echo "Bundled helper: $CANDIDATE -> $DESTINATION"
        HELPER_COPIED=true
        break 3
      fi
    done
  done
done

if [[ "$HELPER_COPIED" != true ]]; then
  echo "Error: helper executable not found under any of: ${HELPER_BUILD_DIRS[*]}; bundle would be missing the required helper." >&2
  exit 1
fi

pushd "$DIST_DIR" >/dev/null
zip -r "$ARCHIVE_NAME" "$PLUGIN_ID" >/dev/null
popd >/dev/null

echo "Created $DIST_DIR/$ARCHIVE_NAME"
