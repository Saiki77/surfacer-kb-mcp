#!/usr/bin/env bash
set -euo pipefail

# Knowledge Base Plugin - Unregister Script
# Removes the plugin from Claude Code. Does NOT remove AWS credentials.

CLAUDE_DIR="$HOME/.claude"
PLUGINS_FILE="$CLAUDE_DIR/plugins/installed_plugins.json"
SETTINGS_FILE="$CLAUDE_DIR/settings.json"

echo "=== Unregistering Knowledge Base Plugin ==="
echo ""

# Remove from installed_plugins.json
if [ -f "$PLUGINS_FILE" ]; then
  node -e "
    const fs = require('fs');
    const data = JSON.parse(fs.readFileSync('$PLUGINS_FILE', 'utf8'));
    delete data.plugins['knowledge-base@local'];
    fs.writeFileSync('$PLUGINS_FILE', JSON.stringify(data, null, 2) + '\n');
    console.log('Removed from: $PLUGINS_FILE');
  "
else
  echo "No installed_plugins.json found, skipping."
fi

# Remove from settings.json
if [ -f "$SETTINGS_FILE" ]; then
  node -e "
    const fs = require('fs');
    const data = JSON.parse(fs.readFileSync('$SETTINGS_FILE', 'utf8'));
    if (data.enabledPlugins) {
      delete data.enabledPlugins['knowledge-base@local'];
    }
    fs.writeFileSync('$SETTINGS_FILE', JSON.stringify(data, null, 2) + '\n');
    console.log('Removed from: $SETTINGS_FILE');
  "
else
  echo "No settings.json found, skipping."
fi

# Remove install manifest
MANIFEST_FILE="$CLAUDE_DIR/plugins/.install-manifests/knowledge-base@local.json"
if [ -f "$MANIFEST_FILE" ]; then
  rm "$MANIFEST_FILE"
  echo "Removed: $MANIFEST_FILE"
else
  echo "No install manifest found, skipping."
fi

echo ""
echo "Plugin unregistered. Restart Claude Code to apply changes."
echo "AWS credentials in ~/.aws/credentials were NOT modified."
