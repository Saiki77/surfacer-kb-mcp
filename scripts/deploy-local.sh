#!/bin/bash
# Deploy the knowledge-base plugin to the local Claude Code plugin cache.
# Run this after making changes, then restart Claude Code.

set -euo pipefail

PLUGIN_SRC="/Users/justus/claude_plugin"
CACHE_DIR="/Users/justus/.claude/plugins/cache/surfacer-plugins/knowledge-base/1.0.0"

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
cp -R "$PLUGIN_SRC/node_modules" "$CACHE_DIR/"
cp "$PLUGIN_SRC/package.json" "$CACHE_DIR/"
cp "$PLUGIN_SRC/tsconfig.json" "$CACHE_DIR/"

# Write .mcp.json with absolute paths (required for running from any working directory)
cat > "$CACHE_DIR/.mcp.json" << 'EOF'
{
  "mcpServers": {
    "knowledge-base": {
      "command": "node",
      "args": ["/Users/justus/.claude/plugins/cache/surfacer-plugins/knowledge-base/1.0.0/dist/index.js"],
      "env": {
        "KB_S3_BUCKET": "claude-unified-bucket",
        "KB_BEDROCK_KB_ID": "",
        "KB_AWS_PROFILE": "default",
        "KB_AWS_REGION": "eu-central-1",
        "KB_S3_PREFIX": "knowledge-base/"
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
    'pluginId': 'knowledge-base@surfacer-plugins',
    'createdAt': '2026-03-20T10:00:00.000Z',
    'files': dict(sorted(files.items()))
}

out = '/Users/justus/.claude/plugins/.install-manifests/knowledge-base@surfacer-plugins.json'
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
config['mcpServers']['knowledge-base'] = {
    'command': 'node',
    'args': ['$CACHE_DIR/dist/index.js'],
    'env': {
        'KB_S3_BUCKET': 'claude-unified-bucket',
        'KB_BEDROCK_KB_ID': '',
        'KB_AWS_PROFILE': 'default',
        'KB_AWS_REGION': 'eu-central-1',
        'KB_S3_PREFIX': 'knowledge-base/'
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
