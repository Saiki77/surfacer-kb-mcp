#!/usr/bin/env bash
set -euo pipefail

# Surfacer KB — Pull latest changes and redeploy.
# Your .mcp.json config (bucket, credentials, etc.) is preserved.

PLUGIN_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PLUGIN_DIR"

BOLD='\033[1m'
GREEN='\033[0;32m'
DIM='\033[2m'
RESET='\033[0m'

echo -e "${BOLD}Updating Surfacer KB...${RESET}"
echo ""

# Pull latest
echo -e "${DIM}Pulling latest changes...${RESET}"
git pull
echo ""

# Install deps (only if needed)
echo -e "${DIM}Installing dependencies...${RESET}"
npm install --silent 2>&1 | tail -1
echo ""

# Deploy
bash "$PLUGIN_DIR/scripts/deploy-local.sh"

echo ""
echo -e "${GREEN}${BOLD}Update complete!${RESET} Restart Claude Code to load the new version."
