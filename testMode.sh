#!/usr/bin/env bash
# Assemble une extension décompressée dans <destination>/<browser>.
# Usage: ./testMode.sh chrome|firefox [destination=./build]
set -euo pipefail
cd "$(dirname "$0")"

browser="${1:-}"
destination="${2:-./build}"
case "$browser" in chrome|firefox) ;; *) echo "Usage: $0 chrome|firefox [destination]" >&2; exit 1;; esac

target="$destination/$browser"
rm -rf "$target"
mkdir -p "$target/images"

# Sources partagées d'abord, puis celles du navigateur qui écrasent les fichiers homonymes.
cp src/*.js src/*.css src/*.html src/*.png "$target"
cp src/images/logo.png "$target/images"
cp -r "src/$browser/." "$target"

echo "Extension $browser prête dans $(realpath "$target")"
if [ "$browser" = firefox ]; then
  echo "Chargez-la via about:debugging#/runtime/this-firefox -> Charger un module complémentaire temporaire -> manifest.json"
else
  echo "Chargez-la via chrome://extensions -> Mode développeur -> Charger l'extension non empaquetée"
fi
