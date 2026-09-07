#!/usr/bin/env bash
set -euo pipefail

: "${FOUNDRY_APP_PATH:?Set FOUNDRY_APP_PATH to the Foundry application directory}"
: "${FOUNDRY_DATA_PATH:?Set FOUNDRY_DATA_PATH to the Foundry data directory}"
: "${FOUNDRY_WORLD:?Set FOUNDRY_WORLD to a dedicated smoke-test world with this module enabled}"

foundry_node="${FOUNDRY_NODE:-node}"
if [[ -f "${FOUNDRY_APP_PATH%/}/main.js" ]]; then
  foundry_main="${FOUNDRY_APP_PATH%/}/main.js"
else
  foundry_main="${FOUNDRY_APP_PATH%/}/resources/app/main.js"
fi
if [[ ! -f "$foundry_main" ]]; then
  echo "Foundry server entry point not found under: $FOUNDRY_APP_PATH" >&2
  exit 1
fi

smoke_port="${FOUNDRY_SMOKE_PORT:-30001}"
smoke_log="$(mktemp)"
foundry_pid=""
cleanup() {
  if [[ -n "$foundry_pid" ]] && kill -0 "$foundry_pid" 2>/dev/null; then
    kill "$foundry_pid" 2>/dev/null || true
    wait "$foundry_pid" 2>/dev/null || true
  fi
  rm -f "$smoke_log"
}
trap cleanup EXIT

"$foundry_node" "$foundry_main" --dataPath="$FOUNDRY_DATA_PATH" --world="$FOUNDRY_WORLD" --port="$smoke_port" --noupdate >"$smoke_log" 2>&1 &
foundry_pid=$!

for _ in $(seq 1 60); do
  if ! kill -0 "$foundry_pid" 2>/dev/null; then
    cat "$smoke_log" >&2
    echo "Foundry stopped before becoming ready." >&2
    exit 1
  fi
  if curl --fail --silent "http://127.0.0.1:${smoke_port}/" >/dev/null 2>&1; then
    if grep -Eiq "(error|failed).*fallout2d20-compendium|fallout2d20-compendium.*(error|failed)|embedded (items|effects) records.*undefined" "$smoke_log"; then
      cat "$smoke_log" >&2
      echo "Foundry reported a module startup error or missing embedded records." >&2
      exit 1
    fi
    echo "Foundry v14 answered with world '$FOUNDRY_WORLD'; no module startup error was logged."
    exit 0
  fi
  sleep 1
done

cat "$smoke_log" >&2
echo "Foundry did not answer within 60 seconds." >&2
exit 1
