#!/usr/bin/env bash

set -euo pipefail

device="${HEGE_IOS_DEVICE_ID:?HEGE_IOS_DEVICE_ID muss auf das gekoppelte Testgerät zeigen.}"
app_id="${HEGE_APP_ID:-app.hege.revier}"
wait_seconds="${HEGE_SMOKE_WAIT_SECONDS:-15}"
expect_queue_sync="${HEGE_EXPECT_QUEUE_SYNC:-0}"
storage_key="hege.mobile.deviceUnlock"
queue_key="hege.offline-queue"
queue_hash="$(printf '%s' "$queue_key" | md5 -q)"
storage_dir="Library/Application Support/$app_id/RCTAsyncLocalStorage_V1"
manifest_path="$storage_dir/manifest.json"
work_dir="$(mktemp -d)"
original_manifest="$work_dir/manifest-original.json"
smoke_manifest="$work_dir/manifest-smoke.json"
latest_manifest="$work_dir/manifest-latest.json"
processes_json="$work_dir/processes.json"
restored=0
override_applied=0
original_unlock_kind="missing"
original_unlock_value=""

copy_from_device() {
  local source="$1"
  local destination="$2"

  rm -rf "$destination"
  xcrun devicectl device copy from \
    --device "$device" \
    --domain-type appDataContainer \
    --domain-identifier "$app_id" \
    --source "$source" \
    --destination "$destination" \
    >/dev/null
}

copy_manifest_to_device() {
  local source="$1"

  xcrun devicectl device copy to \
    --device "$device" \
    --domain-type appDataContainer \
    --domain-identifier "$app_id" \
    --source "$source" \
    --destination "$manifest_path" \
    >/dev/null
}

terminate_app() {
  rm -f "$processes_json"
  xcrun devicectl device info processes \
    --device "$device" \
    --json-output "$processes_json" \
    >/dev/null

  while IFS= read -r pid; do
    [[ -z "$pid" ]] && continue
    xcrun devicectl device process terminate --device "$device" --pid "$pid" >/dev/null || true
  done < <(
    jq -r '.result.runningProcesses[]
      | select(.executable | contains("hegeRevier.app/hegeRevier"))
      | .processIdentifier' "$processes_json"
  )
}

read_queue() {
  local manifest="$1"
  local suffix="$2"
  local queue_file
  local value_kind

  value_kind="$(jq -r --arg key "$queue_key" 'if has($key) then if .[$key] == null then "external" else "inline" end else "missing" end' "$manifest")"
  case "$value_kind" in
    external)
      queue_file="$work_dir/queue-$suffix.json"
      copy_from_device "$storage_dir/$queue_hash" "$queue_file"
      cat "$queue_file"
      ;;
    inline)
      jq -r --arg key "$queue_key" '.[$key]' "$manifest"
      ;;
    missing)
      printf '[]'
      ;;
  esac
}

restore_device_unlock() {
  local exit_status=$?
  local restore_source
  local tmp

  trap - EXIT INT TERM
  [[ "$restored" == "1" ]] && return
  restored=1
  set +e

  if [[ "$override_applied" != "1" ]]; then
    rm -rf "$work_dir"
    exit "$exit_status"
  fi

  terminate_app
  if copy_from_device "$manifest_path" "$latest_manifest"; then
    restore_source="$latest_manifest"
  else
    restore_source="$original_manifest"
    exit_status=1
    echo "Warnung: Aktuelles Manifest nicht lesbar; ursprüngliches Manifest wird wiederhergestellt." >&2
  fi

  tmp="$work_dir/manifest-restored.json"
  if [[ "$original_unlock_kind" == "missing" ]]; then
    jq --arg key "$storage_key" 'del(.[$key])' "$restore_source" > "$tmp"
  else
    jq --arg key "$storage_key" --arg value "$original_unlock_value" '.[$key]=$value' "$restore_source" > "$tmp"
  fi

  if ! copy_manifest_to_device "$tmp"; then
    exit_status=1
    echo "Fehler: Die ursprüngliche App-Sperre konnte nicht wiederhergestellt werden." >&2
  fi

  rm -rf "$work_dir"
  exit "$exit_status"
}
trap restore_device_unlock EXIT INT TERM

copy_from_device "$manifest_path" "$original_manifest"

session_kind="$(jq -r 'if has("hege.mobile.session") then "present" else "missing" end' "$original_manifest")"
if [[ "$session_kind" != "present" ]]; then
  echo "Keine gespeicherte Sitzung gefunden. Auf dem Testgerät zuerst regulär anmelden." >&2
  exit 1
fi

original_unlock_kind="$(jq -r --arg key "$storage_key" 'if has($key) then "inline" else "missing" end' "$original_manifest")"
original_unlock_value="$(jq -r --arg key "$storage_key" '.[$key] // ""' "$original_manifest")"
queue_before="$(read_queue "$original_manifest" before)"

if [[ "$expect_queue_sync" == "1" && "$(printf '%s' "$queue_before" | jq 'length')" == "0" ]]; then
  echo "HEGE_EXPECT_QUEUE_SYNC=1 verlangt mindestens einen vorhandenen Queue-Eintrag." >&2
  exit 1
fi

terminate_app
jq --arg key "$storage_key" '.[$key]="disabled"' "$original_manifest" > "$smoke_manifest"
copy_manifest_to_device "$smoke_manifest"
override_applied=1

xcrun devicectl device process launch --device "$device" "$app_id" >/dev/null
sleep "$wait_seconds"

if [[ "$expect_queue_sync" == "1" ]]; then
  copy_from_device "$manifest_path" "$latest_manifest"
  queue_after="$(read_queue "$latest_manifest" after)"

  if [[ "$(printf '%s' "$queue_after" | jq 'length')" != "0" ]]; then
    echo "Die Warteschlange wurde während des Smoke-Laufs nicht geleert." >&2
    exit 1
  fi

  echo "queue_sync=passed"
fi

echo "authenticated_launch=passed"
