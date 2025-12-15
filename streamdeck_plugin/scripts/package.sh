#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DIST_DIR="$ROOT_DIR/../dist"
PLUGIN_UUID="com.stratagema.sdplugin"
PLUGIN_ID="$PLUGIN_UUID.sdPlugin"
BUILD_DIR="$DIST_DIR/$PLUGIN_ID"
HELPER_TARGET="${HELPER_TARGET:-}"
HELPER_BUILD_DIRS=(
  "$ROOT_DIR/../macro_stub/target${HELPER_TARGET:+/}$HELPER_TARGET/release"
  "$ROOT_DIR/../target${HELPER_TARGET:+/}$HELPER_TARGET/release"
)
HELPER_BASENAME="stratagema_macro_helper"

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
  for EXT in "" ".exe"; do
    CANDIDATE="$BUILD_DIR_CANDIDATE/${HELPER_BASENAME}${EXT}"
    if [[ -f "$CANDIDATE" ]]; then
      cp "$CANDIDATE" "$BUILD_DIR/helper/"
      echo "Bundled helper: $CANDIDATE"
      HELPER_COPIED=true
      break 2
    fi
  done
done

if [[ "$HELPER_COPIED" != true ]]; then
  echo "Error: helper executable not found under any of: ${HELPER_BUILD_DIRS[*]}; bundle would be missing the required helper." >&2
  exit 1
fi

pushd "$DIST_DIR" >/dev/null
zip -r "$PLUGIN_ID.streamDeckPlugin" "$PLUGIN_ID" >/dev/null
popd >/dev/null

echo "Created $DIST_DIR/$PLUGIN_ID.streamDeckPlugin"
