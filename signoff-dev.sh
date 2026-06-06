#!/usr/bin/env bash
# Phase 2B — start New Frontend on :4000 (side-by-side vs Prod http://192.168.10.70/)
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

if [[ ! -f .env.development ]]; then
  echo "Missing .env.development"
  exit 1
fi

echo "New API endpoints (from .env.development):"
grep '^VITE_API_' .env.development || true
echo ""
echo "Prod compare URL: http://192.168.10.70/"
echo "New UI will be: http://localhost:4000"
echo ""

exec ./dev.sh 4000
