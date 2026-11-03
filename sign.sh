#!/usr/bin/env bash
# Construit l'add-on Firefox et le fait signer par Mozilla (web-ext sign).
# Usage: ./sign.sh [unlisted|listed] [destination=./build]
# Identifiants AMO : fichier .env (USER=... / SECRET=...) ou WEB_EXT_API_KEY / WEB_EXT_API_SECRET.
# Chaque envoi exige une version jamais envoyée : incrémentez "version" dans src/firefox/manifest.json.
set -euo pipefail
cd "$(dirname "$0")"

channel="${1:-unlisted}"
destination="${2:-./build}"
case "$channel" in unlisted|listed) ;; *) echo "Usage: $0 [unlisted|listed] [destination]" >&2; exit 1;; esac

if [ -z "${WEB_EXT_API_KEY:-}" ] || [ -z "${WEB_EXT_API_SECRET:-}" ]; then
  if [ -f .env ]; then
    WEB_EXT_API_KEY="$(sed -n 's/^USER=//p' .env | tr -d '"\r')"
    WEB_EXT_API_SECRET="$(sed -n 's/^SECRET=//p' .env | tr -d '"\r')"
    echo "Identifiants AMO lus depuis .env"
  fi
fi
[ -n "${WEB_EXT_API_KEY:-}" ] && [ -n "${WEB_EXT_API_SECRET:-}" ] || { echo "Identifiants AMO manquants (.env avec USER et SECRET)." >&2; exit 1; }

command -v web-ext >/dev/null || { echo "web-ext absent. Lancez : npm install --global web-ext" >&2; exit 1; }

./testMode.sh firefox "$destination"

args=(--source-dir "$destination/firefox" --artifacts-dir "$destination/artifacts"
      --channel "$channel" --api-key "$WEB_EXT_API_KEY" --api-secret "$WEB_EXT_API_SECRET")
# En listed, la signature n'arrive qu'après la revue : on rend la main dès l'envoi.
[ "$channel" = listed ] && args+=(--approval-timeout 0)

web-ext sign "${args[@]}"

if [ "$channel" = listed ]; then
  echo "Version envoyée à la fiche publique. Suivi : https://addons.mozilla.org/developers/addons"
else
  echo "Add-on signé : $(ls -t "$destination"/artifacts/*.xpi | head -1)"
fi
