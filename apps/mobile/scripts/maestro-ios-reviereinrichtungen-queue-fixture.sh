#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
app_id="${HEGE_APP_ID:-app.hege.revier}"
simulator="${HEGE_SIMULATOR_UDID:-booted}"
storage_key="hege.offline-queue"
storage_hash="$(printf '%s' "$storage_key" | md5 -q)"

xcrun simctl terminate "$simulator" "$app_id" 2>/dev/null || true

container="$(xcrun simctl get_app_container "$simulator" "$app_id" data)"
storage="$container/Library/Application Support/$app_id/RCTAsyncLocalStorage_V1"
manifest="$storage/manifest.json"
external_value="$storage/$storage_hash"

if [[ ! -f "$manifest" ]]; then
  echo "AsyncStorage-Manifest nicht gefunden. App zuerst anmelden und schließen." >&2
  exit 1
fi

value_kind="$(jq -r --arg key "$storage_key" 'if has($key) then if .[$key] == null then "external" else "inline" end else "missing" end' "$manifest")"
case "$value_kind" in
  external)
    current_queue="$(cat "$external_value")"
    ;;
  inline)
    current_queue="$(jq -r --arg key "$storage_key" '.[$key]' "$manifest")"
    ;;
  missing)
    current_queue="[]"
    ;;
esac

if [[ "$(printf '%s' "$current_queue" | jq 'length')" != "0" ]]; then
  echo "Der Queue-Smoke überschreibt keine vorhandenen Vormerkungen. Warteschlange zuerst leeren." >&2
  exit 1
fi

cleanup() {
  xcrun simctl terminate "$simulator" "$app_id" 2>/dev/null || true
  sleep 1
  tmp="$(mktemp)"
  if [[ "$value_kind" == "missing" ]]; then
    jq --arg key "$storage_key" 'del(.[$key])' "$manifest" > "$tmp"
  else
    jq --arg key "$storage_key" '.[$key]="[]"' "$manifest" > "$tmp"
  fi
  mv "$tmp" "$manifest"
  rm -f "$external_value"
}
trap cleanup EXIT

fixture="$(jq -cn '[{
  id: "reviereinrichtung-maestro-conflict",
  kind: "reviereinrichtung-create",
  title: "Offline Testkanzel",
  createdAt: "2026-07-13T20:30:00.000Z",
  status: "conflict",
  attemptCount: 1,
  lastAttemptAt: "2026-07-13T20:31:00.000Z",
  lastError: "Kontrollierter Simulator-Konflikt",
  payload: {
    type: "hochstand",
    name: "Offline Testkanzel",
    status: "gut",
    location: {lat: 48.33597, lng: 16.732315, label: "Maestro Offline-Revier"},
    orientationDegrees: 270,
    beschreibung: "Persistierte Offline-Vormerkung",
    details: {capacityPersons: 2, accessNote: "Nur für den Simulator-Smoke"}
  }
}]')"
tmp="$(mktemp)"
jq --arg key "$storage_key" --arg fixture "$fixture" '.[$key]=$fixture' "$manifest" > "$tmp"
mv "$tmp" "$manifest"
rm -f "$external_value"

maestro test \
  -e "APP_ID=$app_id" \
  "$repo_root/.maestro/ios-reviereinrichtungen-offline-queue.yaml"
