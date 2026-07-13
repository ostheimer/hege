#!/usr/bin/env bash

set -euo pipefail

flow="${1:-core}"
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
build_tag="${HEGE_EXPECTED_BUILD_TAG:-$(sed -n 's/^export const BUILD_TAG = "\(.*\)";/\1/p' "$repo_root/apps/mobile/lib/build-tag.ts")}"
app_id="${HEGE_APP_ID:-app.hege.revier}"

if [[ -z "${JAVA_HOME:-}" ]] && command -v brew >/dev/null 2>&1; then
  java_prefix="$(brew --prefix openjdk@17 2>/dev/null || brew --prefix openjdk)"
  export JAVA_HOME="$java_prefix/libexec/openjdk.jdk/Contents/Home"
fi

export PATH="$JAVA_HOME/bin:$PATH"

case "$flow" in
  core)
    flow_path="$repo_root/.maestro/ios-core-smoke.yaml"
    ;;
  roles)
    flow_path="$repo_root/.maestro/ios-contacts-management.yaml"
    ;;
  reviereinrichtungen)
    flow_path="$repo_root/.maestro/ios-reviereinrichtungen-smoke.yaml"
    simulator="${HEGE_SIMULATOR_UDID:-booted}"
    latitude="${HEGE_SMOKE_LATITUDE:-48.335970}"
    longitude="${HEGE_SMOKE_LONGITUDE:-16.732315}"
    xcrun simctl location "$simulator" set "$latitude,$longitude"
    ;;
  queue)
    HEGE_APP_ID="$app_id" exec "$repo_root/apps/mobile/scripts/maestro-ios-queue-fixture.sh"
    ;;
  reviereinrichtungen-queue)
    HEGE_APP_ID="$app_id" exec "$repo_root/apps/mobile/scripts/maestro-ios-reviereinrichtungen-queue-fixture.sh"
    ;;
  *)
    echo "Unbekannter Flow '$flow'. Erlaubt: core, queue, reviereinrichtungen, reviereinrichtungen-queue, roles." >&2
    exit 2
    ;;
esac

: "${HEGE_SMOKE_IDENTIFIER:?HEGE_SMOKE_IDENTIFIER muss gesetzt sein.}"
: "${HEGE_SMOKE_PIN:?HEGE_SMOKE_PIN muss gesetzt sein.}"

exec maestro test \
  -e "APP_ID=$app_id" \
  -e "BUILD_TAG=$build_tag" \
  -e "HEGE_SMOKE_IDENTIFIER=$HEGE_SMOKE_IDENTIFIER" \
  -e "HEGE_SMOKE_PIN=$HEGE_SMOKE_PIN" \
  "$flow_path"
