#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DIST_DIR="$ROOT_DIR/../dist"
PLUGIN_ID="com.stratagema.sdPlugin"
BUILD_DIR="$DIST_DIR/$PLUGIN_ID"

rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

rsync -a "$ROOT_DIR/" "$BUILD_DIR/"
rsync -a "$ROOT_DIR/../icons/" "$BUILD_DIR/icons/"

pushd "$DIST_DIR" >/dev/null
zip -r "$PLUGIN_ID.streamDeckPlugin" "$PLUGIN_ID" >/dev/null
popd >/dev/null

echo "Created $DIST_DIR/$PLUGIN_ID.streamDeckPlugin"
