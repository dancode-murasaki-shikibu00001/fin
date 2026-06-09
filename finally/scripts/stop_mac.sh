#!/usr/bin/env bash
set -euo pipefail

CONTAINER_NAME="finally"

if docker ps --filter "name=^${CONTAINER_NAME}$" --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "Stopping container '$CONTAINER_NAME'..."
  docker stop "$CONTAINER_NAME" >/dev/null
  docker rm "$CONTAINER_NAME" >/dev/null
  echo "Container stopped. Data volume preserved."
else
  echo "Container '$CONTAINER_NAME' is not running."
fi
