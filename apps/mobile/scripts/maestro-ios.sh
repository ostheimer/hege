#!/usr/bin/env bash

set -euo pipefail

flow="${1:-core}"
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
build_tag="${HEGE_EXPECTED_BUILD_TAG:-$(sed -n 's/^export const BUILD_TAG = "\(.*\)";/\1/p' "$repo_root/apps/mobile/lib/build-tag.ts")}"
app_id="${HEGE_APP_ID:-app.hege.revier}"

: "${HEGE_SMOKE_IDENTIFIER:?HEGE_SMOKE_IDENTIFIER muss gesetzt sein.}"
: "${HEGE_SMOKE_PIN:?HEGE_SMOKE_PIN muss gesetzt sein.}"

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
  *)
    echo "Unbekannter Flow '$flow'. Erlaubt: core, roles." >&2
    exit 2
    ;;
esac

exec maestro test \
  -e "APP_ID=$app_id" \
  -e "BUILD_TAG=$build_tag" \
  -e "HEGE_SMOKE_IDENTIFIER=$HEGE_SMOKE_IDENTIFIER" \
  -e "HEGE_SMOKE_PIN=$HEGE_SMOKE_PIN" \
  "$flow_path"
