#!/usr/bin/env bash
set -euo pipefail

# Surfacer Knowledge Base Plugin - Registration & Setup Script
# Run this once after cloning to configure AWS credentials and register
# the plugin with Claude Code.

PLUGIN_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CLAUDE_DIR="$HOME/.claude"
PLUGINS_FILE="$CLAUDE_DIR/plugins/installed_plugins.json"
SETTINGS_FILE="$CLAUDE_DIR/settings.json"
AWS_CREDS_FILE="$HOME/.aws/credentials"
PROFILE="${KB_AWS_PROFILE:-default}"

echo "=== Surfacer Knowledge Base Plugin Setup ==="
echo ""
echo "Plugin directory: $PLUGIN_DIR"
echo ""

# --- Step 1: AWS Credentials ---
echo "--- Step 1: AWS Credentials ---"
echo ""

setup_creds=true
if [ -f "$AWS_CREDS_FILE" ] && grep -q "\\[$PROFILE\\]" "$AWS_CREDS_FILE" 2>/dev/null; then
  echo "AWS profile '$PROFILE' already exists in $AWS_CREDS_FILE."
  read -rp "Overwrite it? (y/N): " overwrite
  if [[ ! "$overwrite" =~ ^[Yy]$ ]]; then
    setup_creds=false
    echo "Keeping existing credentials."
  fi
fi

if [ "$setup_creds" = true ]; then
  read -rp "AWS Access Key ID: " aws_key
  read -rsp "AWS Secret Access Key: " aws_secret
  echo ""

  mkdir -p "$HOME/.aws"

  if [ -f "$AWS_CREDS_FILE" ] && grep -q "\\[$PROFILE\\]" "$AWS_CREDS_FILE" 2>/dev/null; then
    # Replace existing profile block using a temp file
    node -e "
      const fs = require('fs');
      let content = fs.readFileSync('$AWS_CREDS_FILE', 'utf8');
      const profileRegex = new RegExp('\\\\[$PROFILE\\\\][\\\\s\\\\S]*?(?=\\\\n\\\\[|$)');
      const newBlock = '[$PROFILE]\naws_access_key_id = $aws_key\naws_secret_access_key = $aws_secret\n';
      content = content.replace(profileRegex, newBlock);
      fs.writeFileSync('$AWS_CREDS_FILE', content);
    "
  else
    # Append new profile
    {
      [ -f "$AWS_CREDS_FILE" ] && [ -s "$AWS_CREDS_FILE" ] && echo ""
      echo "[$PROFILE]"
      echo "aws_access_key_id = $aws_key"
      echo "aws_secret_access_key = $aws_secret"
    } >> "$AWS_CREDS_FILE"
  fi

  chmod 600 "$AWS_CREDS_FILE"
  echo "AWS credentials saved to $AWS_CREDS_FILE (profile: $PROFILE)."
fi
echo ""

# --- Step 2: Build Plugin ---
echo "--- Step 2: Building Plugin ---"
echo ""
cd "$PLUGIN_DIR"
npm install --silent
npm run build --silent
echo "Build complete."
echo ""

# --- Step 3: Test Connection ---
echo "--- Step 3: Testing AWS Connection ---"
echo ""

# Source env from .mcp.json for the test
export KB_S3_BUCKET="${KB_S3_BUCKET:-}"
export KB_AWS_REGION="${KB_AWS_REGION:-us-east-1}"
export KB_AWS_PROFILE="$PROFILE"
export KB_S3_PREFIX="${KB_S3_PREFIX:-surfacer-kb/}"

if npx tsx "$PLUGIN_DIR/scripts/test-connection.ts"; then
  echo ""
  echo "Connection test passed."
else
  echo ""
  echo "Connection test failed. Check your AWS credentials and try again."
  echo "You can re-run this script after fixing the issue."
  exit 1
fi
echo ""

# --- Step 4: Register with Claude Code ---
echo "--- Step 4: Registering Plugin with Claude Code ---"
echo ""

# Ensure directories exist
mkdir -p "$CLAUDE_DIR/plugins"
mkdir -p "$CLAUDE_DIR/plugins/.install-manifests"

# Update installed_plugins.json
node -e "
  const fs = require('fs');
  const path = '$PLUGINS_FILE';
  let data = { version: 2, plugins: {} };
  try { data = JSON.parse(fs.readFileSync(path, 'utf8')); } catch {}
  data.plugins['surfacer-kb@local'] = [{
    scope: 'user',
    installPath: '$PLUGIN_DIR',
    version: '1.0.0',
    installedAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString()
  }];
  fs.writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
  console.log('  Updated: ' + path);
"

# Update settings.json
node -e "
  const fs = require('fs');
  const path = '$SETTINGS_FILE';
  let data = {};
  try { data = JSON.parse(fs.readFileSync(path, 'utf8')); } catch {}
  if (!data.enabledPlugins) data.enabledPlugins = {};
  data.enabledPlugins['surfacer-kb@local'] = true;
  fs.writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
  console.log('  Updated: ' + path);
"

# Generate install manifest with file hashes
MANIFEST_FILE="$CLAUDE_DIR/plugins/.install-manifests/surfacer-kb@local.json"
node -e "
  const fs = require('fs');
  const path = require('path');
  const crypto = require('crypto');

  const pluginDir = '$PLUGIN_DIR';
  const files = {};

  // Hash only the files Claude Code needs to load the plugin
  const pluginFiles = [
    '.claude-plugin/plugin.json',
    '.mcp.json',
    'skills/lore-advisor/SKILL.md',
    'commands/kb-search.md',
    'commands/kb-sync.md'
  ];

  for (const f of pluginFiles) {
    const full = path.join(pluginDir, f);
    if (fs.existsSync(full)) {
      const hash = crypto.createHash('sha256')
        .update(fs.readFileSync(full))
        .digest('hex');
      files[f] = hash;
    }
  }

  const manifest = {
    pluginId: 'surfacer-kb@local',
    createdAt: new Date().toISOString(),
    files
  };

  fs.writeFileSync('$MANIFEST_FILE', JSON.stringify(manifest, null, 2) + '\n');
  console.log('  Created: $MANIFEST_FILE');
"

echo ""
echo "=== Setup Complete! ==="
echo ""
echo "Restart Claude Code to activate the plugin."
echo "You should then see:"
echo "  - Skill: knowledge-base-advisor"
echo "  - Commands: /kb-search, /kb-sync, /handoff"
echo "  - Tools: search_knowledge, read_document, write_document, etc."
