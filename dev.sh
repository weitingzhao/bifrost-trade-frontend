#!/usr/bin/env bash
set -euo pipefail

PORT=${1:-4000}

# Kill any process currently holding the port
if lsof -ti tcp:"$PORT" &>/dev/null; then
  echo "Port $PORT in use — killing existing process..."
  lsof -ti tcp:"$PORT" | xargs kill -9
  sleep 0.5
fi

echo "Starting dev server on http://localhost:$PORT"
npx vite --port "$PORT" --strictPort
