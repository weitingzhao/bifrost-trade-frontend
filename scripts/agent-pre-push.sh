#!/usr/bin/env bash
# Vision V2 — Dev Agent pre-push gate (trade-frontend).
# Run before git push when Agent/Owner changed frontend code.
set -euo pipefail
cd "$(dirname "$0")/.."
echo "==> agent-pre-push: lint"
npm run lint
echo "==> agent-pre-push: build"
npm run build
echo "==> agent-pre-push: check:legacy-css"
npm run check:legacy-css
echo "agent-pre-push OK"
