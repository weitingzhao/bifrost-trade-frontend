#!/usr/bin/env bash
# Bifrost Trade Frontend — dev server launcher with pre-start cleanup.
# Cleans stale caches and residuals, then starts Vite on the given port.
#
# Usage:
#   ./dev.sh [port]   # default 4000
set -euo pipefail

PORT=${1:-4000}
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

# ─── Phase 1: Kill stale processes ────────────────────────────────────────────
if lsof -ti tcp:"$PORT" &>/dev/null; then
  echo "⏹ Port $PORT in use — killing existing process..."
  lsof -ti tcp:"$PORT" | xargs kill -9
  sleep 0.5
fi

# ─── Phase 2: Clean caches and residuals ──────────────────────────────────────
echo "🧹 Cleaning caches..."

cleaned=0

# Vite dependency pre-bundle cache (forces fresh optimization on start)
if [[ -d node_modules/.vite ]]; then
  rm -rf node_modules/.vite
  echo "   ✓ Removed node_modules/.vite/ (dep pre-bundle + temp files)"
  cleaned=1
fi

# TypeScript incremental build info (can become stale after branch switches)
if [[ -f tsconfig.tsbuildinfo ]]; then
  rm -f tsconfig.tsbuildinfo
  echo "   ✓ Removed tsconfig.tsbuildinfo"
  cleaned=1
fi

# Old production build output (irrelevant for dev, wastes disk)
if [[ -d dist ]]; then
  rm -rf dist
  echo "   ✓ Removed dist/"
  cleaned=1
fi

# ESLint cache
if [[ -f .eslintcache ]]; then
  rm -f .eslintcache
  echo "   ✓ Removed .eslintcache"
  cleaned=1
fi

# Vitest coverage output
if [[ -d coverage ]]; then
  rm -rf coverage
  echo "   ✓ Removed coverage/"
  cleaned=1
fi

if [[ $cleaned -eq 0 ]]; then
  echo "   (nothing to clean)"
fi

# ─── Phase 3: Ensure dependencies ────────────────────────────────────────────
if [[ ! -d node_modules ]]; then
  echo "📦 node_modules not found, running npm install..."
  npm install
elif [[ package.json -nt node_modules/.package-lock.json ]] 2>/dev/null; then
  echo "📦 package.json changed since last install, running npm install..."
  npm install
fi

# ─── Phase 4: Start dev server ────────────────────────────────────────────────
echo ""
echo "🚀 Starting dev server on http://localhost:$PORT"
exec npx vite --port "$PORT" --strictPort
