#!/usr/bin/env bash
# Bifrost Trade Frontend — local UI launcher (Vision V1 satellite inner-loop).
#
# Usage:
#   ./run-local-ui.sh              # default: k3s mode → APIs via bifrost-dev :30882
#   ./run-local-ui.sh --k3s        # same as default
#   ./run-local-ui.sh --local      # all VITE_API_* → localhost:8765–8773
#   ./run-local-ui.sh --port 5173  # Vite port (default 5173)
#   ./run-local-ui.sh --install    # force npm install before start
#
# Env precedence (Vite):
#   .env.development.local  >  .env.development  >  mode templates below
#
# Docs: Ops Console → Architecture → Dual Flywheel / Vision V1
#   Mac thin (Vite + optional 1 API) + K3s thick (bifrost-dev @ :30882)
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

MODE="k3s"
PORT=5173
FORCE_INSTALL=0

usage() {
  sed -n '2,16p' "$0" | sed 's/^# \{0,1\}//'
  exit "${1:-0}"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --k3s) MODE="k3s"; shift ;;
    --local) MODE="local"; shift ;;
    --port)
      PORT="${2:?--port requires a number}"
      shift 2
      ;;
    --install) FORCE_INSTALL=1; shift ;;
    -h|--help) usage 0 ;;
    *)
      echo "Unknown arg: $1" >&2
      usage 1
      ;;
  esac
done

LOCAL_ENV=".env.development.local"
K3S_TEMPLATE=".env.development.k3s"
LOCAL_TEMPLATE=".env.development.example"
BASE_ENV=".env.development"

ensure_env() {
  if [[ -f "$LOCAL_ENV" ]]; then
    echo "✓ Using existing $LOCAL_ENV"
    return
  fi
  case "$MODE" in
    k3s)
      if [[ ! -f "$K3S_TEMPLATE" ]]; then
        echo "ERROR: missing $K3S_TEMPLATE" >&2
        exit 1
      fi
      cp "$K3S_TEMPLATE" "$LOCAL_ENV"
      # Vision V1 template leaves Monitor on localhost for optional --reload;
      # for UI-only Live experience, point Monitor at the same K3s gateway.
      if grep -q '^VITE_API_MONITOR=http://localhost:8765' "$LOCAL_ENV" 2>/dev/null; then
        sed -i.bak 's|^VITE_API_MONITOR=http://localhost:8765|VITE_API_MONITOR=http://192.168.10.73:30882/api/monitor|' "$LOCAL_ENV"
        rm -f "${LOCAL_ENV}.bak"
      fi
      echo "✓ Created $LOCAL_ENV from $K3S_TEMPLATE (Mac thin + K3s bifrost-dev :30882)"
      ;;
    local)
      src="$LOCAL_TEMPLATE"
      [[ -f "$BASE_ENV" ]] && src="$BASE_ENV"
      cp "$src" "$LOCAL_ENV"
      echo "✓ Created $LOCAL_ENV from $src (all APIs on localhost)"
      ;;
  esac
}

# ─── Port cleanup ────────────────────────────────────────────────────────────
if lsof -ti tcp:"$PORT" &>/dev/null; then
  echo "Port $PORT in use — stopping previous process…"
  lsof -ti tcp:"$PORT" | xargs kill -9 2>/dev/null || true
  sleep 0.4
fi

# ─── Light cache clean (keeps node_modules) ──────────────────────────────────
if [[ -d node_modules/.vite ]]; then
  rm -rf node_modules/.vite
  echo "✓ Cleared node_modules/.vite"
fi

ensure_env

# ─── Dependencies ────────────────────────────────────────────────────────────
if [[ "$FORCE_INSTALL" -eq 1 ]] || [[ ! -d node_modules ]]; then
  echo "📦 npm install…"
  npm install
elif [[ package.json -nt node_modules/.package-lock.json ]] 2>/dev/null; then
  echo "📦 package.json newer than install stamp — npm install…"
  npm install
fi

# ─── Banner ──────────────────────────────────────────────────────────────────
MARKET_HINT=""
if grep -q 'VITE_API_MARKET=.*30882' "$LOCAL_ENV" 2>/dev/null; then
  MARKET_HINT="Market API → K3s :30882/api/market"
elif grep -q 'VITE_API_MARKET=.*localhost:8772' "$LOCAL_ENV" 2>/dev/null; then
  MARKET_HINT="Market API → localhost:8772 (start api locally for Live quotes)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Bifrost Trade UI  (mode=$MODE)"
echo "  URL:  http://localhost:$PORT"
echo "  Env:  $LOCAL_ENV"
[[ -n "$MARKET_HINT" ]] && echo "  Tip:  $MARKET_HINT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

exec npx vite --port "$PORT" --strictPort --host 127.0.0.1
