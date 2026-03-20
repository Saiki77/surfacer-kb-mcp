#!/bin/bash
# Deploy the Lore plugin to the local Claude Code plugin cache.
# Run this after making changes, then restart Claude Code.

set -euo pipefail

PLUGIN_SRC="$(cd "$(dirname "$0")/.." && pwd)"
CACHE_DIR="$HOME/.claude/plugins/cache/lore-plugins/lore/1.0.0"

echo "Building TypeScript..."
cd "$PLUGIN_SRC"
npm run build

echo "Deploying to plugin cache..."
rm -rf "$CACHE_DIR"
mkdir -p "$CACHE_DIR"

# Copy plugin files (skip src, scripts, .git, node_modules internals)
cp -R "$PLUGIN_SRC/.claude-plugin" "$CACHE_DIR/"
cp -R "$PLUGIN_SRC/dist" "$CACHE_DIR/"
cp -R "$PLUGIN_SRC/skills" "$CACHE_DIR/"
cp -R "$PLUGIN_SRC/commands" "$CACHE_DIR/"
cp -R "$PLUGIN_SRC/hooks" "$CACHE_DIR/"
cp -R "$PLUGIN_SRC/node_modules" "$CACHE_DIR/"
cp "$PLUGIN_SRC/package.json" "$CACHE_DIR/"
cp "$PLUGIN_SRC/tsconfig.json" "$CACHE_DIR/"

# Read env values from .mcp.json if it exists, otherwise use defaults
if [ -f "$PLUGIN_SRC/.mcp.json" ]; then
  S3_BUCKET=$(python3 -c "import json; d=json.load(open('$PLUGIN_SRC/.mcp.json')); print(list(d['mcpServers'].values())[0]['env'].get('KB_S3_BUCKET',''))" 2>/dev/null || echo "")
  AWS_REGION=$(python3 -c "import json; d=json.load(open('$PLUGIN_SRC/.mcp.json')); print(list(d['mcpServers'].values())[0]['env'].get('KB_AWS_REGION','us-east-1'))" 2>/dev/null || echo "us-east-1")
  AWS_PROFILE=$(python3 -c "import json; d=json.load(open('$PLUGIN_SRC/.mcp.json')); print(list(d['mcpServers'].values())[0]['env'].get('KB_AWS_PROFILE','default'))" 2>/dev/null || echo "default")
  S3_PREFIX=$(python3 -c "import json; d=json.load(open('$PLUGIN_SRC/.mcp.json')); print(list(d['mcpServers'].values())[0]['env'].get('KB_S3_PREFIX','knowledge-base/'))" 2>/dev/null || echo "knowledge-base/")
  USER_NAME=$(python3 -c "import json; d=json.load(open('$PLUGIN_SRC/.mcp.json')); print(list(d['mcpServers'].values())[0]['env'].get('KB_USER_NAME',''))" 2>/dev/null || echo "")
  DATA_SOURCE_ID=$(python3 -c "import json; d=json.load(open('$PLUGIN_SRC/.mcp.json')); print(list(d['mcpServers'].values())[0]['env'].get('KB_DATA_SOURCE_ID',''))" 2>/dev/null || echo "")
  BEDROCK_KB_ID=$(python3 -c "import json; d=json.load(open('$PLUGIN_SRC/.mcp.json')); print(list(d['mcpServers'].values())[0]['env'].get('KB_BEDROCK_KB_ID',''))" 2>/dev/null || echo "")
  BEDROCK_ROLE_ARN=$(python3 -c "import json; d=json.load(open('$PLUGIN_SRC/.mcp.json')); print(list(d['mcpServers'].values())[0]['env'].get('KB_BEDROCK_ROLE_ARN',''))" 2>/dev/null || echo "")
else
  S3_BUCKET=""
  AWS_REGION="us-east-1"
  AWS_PROFILE="default"
  S3_PREFIX="knowledge-base/"
  USER_NAME=""
  DATA_SOURCE_ID=""
  BEDROCK_KB_ID=""
  BEDROCK_ROLE_ARN=""
fi

# Write .mcp.json with absolute paths (required for running from any working directory)
cat > "$CACHE_DIR/.mcp.json" << EOF
{
  "mcpServers": {
    "lore": {
      "command": "node",
      "args": ["$CACHE_DIR/dist/index.js"],
      "env": {
        "KB_S3_BUCKET": "$S3_BUCKET",
        "KB_BEDROCK_KB_ID": "$BEDROCK_KB_ID",
        "KB_AWS_PROFILE": "$AWS_PROFILE",
        "KB_AWS_REGION": "$AWS_REGION",
        "KB_S3_PREFIX": "$S3_PREFIX",
        "KB_USER_NAME": "$USER_NAME",
        "KB_DATA_SOURCE_ID": "$DATA_SOURCE_ID",
        "KB_BEDROCK_ROLE_ARN": "$BEDROCK_ROLE_ARN"
      }
    }
  }
}
EOF

echo "Generating install manifest..."
python3 -c "
import hashlib, os, json

files = {}
base = '$CACHE_DIR'
for root, dirs, filenames in os.walk(base):
    if 'node_modules' in root.split(os.sep):
        continue
    for f in filenames:
        path = os.path.join(root, f)
        rel = os.path.relpath(path, base)
        if rel.startswith('.DS_Store') or '.DS_Store' in rel:
            continue
        try:
            with open(path, 'rb') as fh:
                h = hashlib.sha256(fh.read()).hexdigest()
            files[rel] = h
        except:
            pass

manifest = {
    'pluginId': 'lore@lore-plugins',
    'createdAt': '2026-03-20T10:00:00.000Z',
    'files': dict(sorted(files.items()))
}

manifest_dir = os.path.expanduser('~/.claude/plugins/.install-manifests')
os.makedirs(manifest_dir, exist_ok=True)
out = os.path.join(manifest_dir, 'lore@lore-plugins.json')
with open(out, 'w') as f:
    json.dump(manifest, f, indent=2)
print(f'Manifest written: {len(files)} files')
"

echo "Updating Claude desktop app config (for Chat/Cowork tabs)..."
DESKTOP_CONFIG="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
if [ -f "$DESKTOP_CONFIG" ]; then
  python3 -c "
import json
config = json.load(open('$DESKTOP_CONFIG'))
config['mcpServers'] = config.get('mcpServers', {})
# Remove old key if present
config['mcpServers'].pop('knowledge-base', None)
config['mcpServers']['lore'] = {
    'command': 'node',
    'args': ['$CACHE_DIR/dist/index.js'],
    'env': {
        'KB_S3_BUCKET': '$S3_BUCKET',
        'KB_BEDROCK_KB_ID': '$BEDROCK_KB_ID',
        'KB_AWS_PROFILE': '$AWS_PROFILE',
        'KB_AWS_REGION': '$AWS_REGION',
        'KB_S3_PREFIX': '$S3_PREFIX',
        'KB_USER_NAME': '$USER_NAME',
        'KB_DATA_SOURCE_ID': '$DATA_SOURCE_ID',
        'KB_BEDROCK_ROLE_ARN': '$BEDROCK_ROLE_ARN'
    }
}
with open('$DESKTOP_CONFIG', 'w') as f:
    json.dump(config, f, indent=2)
print('Desktop config updated')
"
fi

echo ""
echo "Done! Restart the Claude app to pick up the changes."
echo "  - Code tab: loads from plugin cache"
echo "  - Chat/Cowork tabs: loads from claude_desktop_config.json"
