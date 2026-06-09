#!/usr/bin/env bash
set -euo pipefail

CONTAINER_NAME="finally"
IMAGE_NAME="finally"
PORT=8000
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Parse flags
FORCE_BUILD=false
for arg in "$@"; do
  case $arg in
    --build) FORCE_BUILD=true ;;
  esac
done

# Build image if missing or --build flag passed
if $FORCE_BUILD || ! docker image inspect "$IMAGE_NAME" &>/dev/null; then
  echo "Building Docker image..."
  docker build -t "$IMAGE_NAME" "$PROJECT_ROOT"
fi

# Check if container already running
if docker ps --filter "name=^${CONTAINER_NAME}$" --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "Container '$CONTAINER_NAME' is already running at http://localhost:${PORT}"
  exit 0
fi

# Remove stopped container with same name if it exists
if docker ps -a --filter "name=^${CONTAINER_NAME}$" --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  docker rm "$CONTAINER_NAME" >/dev/null
fi

# Create .env if missing
if [ ! -f "$PROJECT_ROOT/.env" ]; then
  echo "No .env found — copying from .env.example"
  cp "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/.env"
fi

docker run -d \
  --name "$CONTAINER_NAME" \
  -v finally-data:/app/db \
  -p "${PORT}:8000" \
  --env-file "$PROJECT_ROOT/.env" \
  "$IMAGE_NAME"

echo "FinAlly is running at http://localhost:${PORT}"

# Open browser if possible
if command -v open &>/dev/null; then
  sleep 1
  open "http://localhost:${PORT}"
fi
