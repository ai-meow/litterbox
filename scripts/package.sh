#!/usr/bin/env bash
# Build the Chrome Web Store upload: dist/litterbox-<version>.zip
set -euo pipefail
cd "$(dirname "$0")/.."

version=$(node -p "require('./manifest.json').version")
out="dist/litterbox-${version}.zip"

mkdir -p dist
rm -f "$out"
zip -qr "$out" manifest.json content.js content.css icons -x '.*'
echo "$out"
