#!/usr/bin/env bash
set -euo pipefail

# ╔══════════════════════════════════════════════════════╗
# ║  Surfacer KB — One-command setup for new team members║
# ║                                                      ║
# ║  Usage:                                              ║
# ║    git clone <repo> && cd surfacer-kb-mcp            ║
# ║    bash scripts/setup.sh                             ║
# ║                                                      ║
# ║  What it does:                                       ║
# ║    1. Collects your AWS + S3 config                  ║
# ║    2. Builds the plugin                              ║
# ║    3. Registers it with Claude Code                  ║
# ║    4. (Optional) Sets up Bedrock semantic search     ║
# ║                                                      ║
# ║  After running, restart Claude Code — Surfacer KB    ║
# ║  appears.                                            ║
# ╚══════════════════════════════════════════════════════╝

PLUGIN_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CLAUDE_DIR="$HOME/.claude"
MCP_JSON="$PLUGIN_DIR/.mcp.json"

BOLD='\033[1m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
DIM='\033[2m'
RESET='\033[0m'

step=0
step() { step=$((step + 1)); echo -e "\n${CYAN}[$step]${RESET} ${BOLD}$1${RESET}"; }
ok()   { echo -e "    ${GREEN}✓${RESET} $1"; }
warn() { echo -e "    ${YELLOW}!${RESET} $1"; }
fail() { echo -e "    ${RED}✗${RESET} $1"; exit 1; }
ask()  { read -rp "    $1: " "$2"; }
ask_secret() { read -rsp "    $1: " "$2"; echo; }
ask_default() {
  local prompt="$1" var="$2" default="$3"
  read -rp "    $prompt [$default]: " "$var"
  if [ -z "${!var}" ]; then eval "$var='$default'"; fi
}

echo -e "${BOLD}"
echo "  ╔═╗╦ ╦╦═╗╔═╗╔═╗╔═╗╔═╗╦═╗  ╦╔═╔╗ "
echo "  ╚═╗║ ║╠╦╝╠╣ ╠═╣║  ║╣ ╠╦╝  ╠╩╗╠╩╗"
echo "  ╚═╝╚═╝╩╚═╚  ╩ ╩╚═╝╚═╝╩╚═  ╩ ╩╚═╝"
echo -e "${RESET}${DIM}  Shared knowledge for Claude${RESET}"
echo ""

# ─────────────────────────────────────────────────────
# Step 1: Your name
# ─────────────────────────────────────────────────────
step "What's your name?"
echo -e "    ${DIM}This shows up in presence tracking so teammates know who's active.${RESET}"
ask "Your name (e.g. alice)" USER_NAME

if [ -z "$USER_NAME" ]; then
  fail "A name is required for team presence."
fi
ok "Hello, $USER_NAME!"

# ─────────────────────────────────────────────────────
# Step 2: AWS Configuration
# ─────────────────────────────────────────────────────
step "AWS Configuration"
echo -e "    ${DIM}Surfacer Knowledge Base stores documents in S3. You need a bucket and AWS credentials.${RESET}"
echo ""

ask_default "S3 bucket name" S3_BUCKET "my-surfacer-kb-bucket"
ask_default "S3 key prefix" S3_PREFIX "knowledge-base/"
ask_default "AWS region" AWS_REGION "us-east-1"

echo ""
echo -e "    ${DIM}How do you want to authenticate?${RESET}"
echo "    1) AWS CLI profile (~/.aws/credentials) — recommended"
echo "    2) Access key + secret key"
read -rp "    Choice [1]: " AUTH_CHOICE
AUTH_CHOICE="${AUTH_CHOICE:-1}"

AWS_PROFILE="default"

if [ "$AUTH_CHOICE" = "2" ]; then
  ask "AWS Access Key ID" AWS_ACCESS_KEY
  ask_secret "AWS Secret Access Key" AWS_SECRET_KEY

  ask_default "Save as AWS profile name" AWS_PROFILE "surfacer-kb"

  mkdir -p "$HOME/.aws"
  CREDS_FILE="$HOME/.aws/credentials"

  # Remove existing profile block if present
  if [ -f "$CREDS_FILE" ] && grep -q "\\[$AWS_PROFILE\\]" "$CREDS_FILE" 2>/dev/null; then
    python3 -c "
import re
with open('$CREDS_FILE') as f: text = f.read()
text = re.sub(r'\\[$AWS_PROFILE\\][^\\[]*', '', text).strip()
with open('$CREDS_FILE', 'w') as f: f.write(text + '\\n')
" 2>/dev/null || true
  fi

  {
    [ -f "$CREDS_FILE" ] && [ -s "$CREDS_FILE" ] && echo ""
    echo "[$AWS_PROFILE]"
    echo "aws_access_key_id = $AWS_ACCESS_KEY"
    echo "aws_secret_access_key = $AWS_SECRET_KEY"
  } >> "$CREDS_FILE"
  chmod 600 "$CREDS_FILE"
  ok "Credentials saved to ~/.aws/credentials (profile: $AWS_PROFILE)"
else
  ask_default "AWS profile name" AWS_PROFILE "default"
  if [ -f "$HOME/.aws/credentials" ] && grep -q "\\[$AWS_PROFILE\\]" "$HOME/.aws/credentials" 2>/dev/null; then
    ok "Using existing profile '$AWS_PROFILE'"
  else
    warn "Profile '$AWS_PROFILE' not found in ~/.aws/credentials — make sure it exists"
  fi
fi

# ─────────────────────────────────────────────────────
# Step 3: Write .mcp.json
# ─────────────────────────────────────────────────────
step "Writing configuration"

cat > "$MCP_JSON" << EOF
{
  "mcpServers": {
    "surfacer-kb": {
      "command": "node",
      "args": ["dist/index.js"],
      "env": {
        "KB_S3_BUCKET": "$S3_BUCKET",
        "KB_BEDROCK_KB_ID": "",
        "KB_AWS_PROFILE": "$AWS_PROFILE",
        "KB_AWS_REGION": "$AWS_REGION",
        "KB_S3_PREFIX": "$S3_PREFIX",
        "KB_USER_NAME": "$USER_NAME",
        "KB_DATA_SOURCE_ID": "",
        "KB_BEDROCK_ROLE_ARN": ""
      }
    }
  }
}
EOF

ok "Config written to .mcp.json"

# ─────────────────────────────────────────────────────
# Step 4: Install & build
# ─────────────────────────────────────────────────────
step "Building plugin"

cd "$PLUGIN_DIR"
npm install --silent 2>&1 | tail -1
npm run build --silent 2>&1
ok "Build complete"

# ─────────────────────────────────────────────────────
# Step 5: Test S3 connection
# ─────────────────────────────────────────────────────
step "Testing S3 connection"

export KB_S3_BUCKET="$S3_BUCKET"
export KB_AWS_REGION="$AWS_REGION"
export KB_AWS_PROFILE="$AWS_PROFILE"
export KB_S3_PREFIX="$S3_PREFIX"

CONNECTION_OK=false
if node -e "
  const { S3Client, HeadBucketCommand } = require('@aws-sdk/client-s3');
  const { fromIni } = require('@aws-sdk/credential-providers');
  const client = new S3Client({
    region: '$AWS_REGION',
    credentials: fromIni({ profile: '$AWS_PROFILE' })
  });
  client.send(new HeadBucketCommand({ Bucket: '$S3_BUCKET' }))
    .then(() => { console.log('OK'); process.exit(0); })
    .catch(e => { console.error(e.message); process.exit(1); });
" 2>/dev/null; then
  CONNECTION_OK=true
  ok "Connected to s3://$S3_BUCKET"
else
  warn "Could not reach S3 bucket '$S3_BUCKET'"
  warn "The plugin will still install — fix credentials and bucket access later"
fi

# ─────────────────────────────────────────────────────
# Step 6: Deploy to Claude Code
# ─────────────────────────────────────────────────────
step "Registering with Claude Code"

# Deploy to plugin cache
CACHE_DIR="$HOME/.claude/plugins/cache/surfacer-kb-plugins/surfacer-kb/1.0.0"
rm -rf "$CACHE_DIR"
mkdir -p "$CACHE_DIR"

for dir in .claude-plugin dist skills commands hooks node_modules; do
  [ -d "$PLUGIN_DIR/$dir" ] && cp -R "$PLUGIN_DIR/$dir" "$CACHE_DIR/"
done
cp "$PLUGIN_DIR/package.json" "$CACHE_DIR/"
cp "$PLUGIN_DIR/tsconfig.json" "$CACHE_DIR/"

# Write cache .mcp.json with absolute paths
cat > "$CACHE_DIR/.mcp.json" << EOF
{
  "mcpServers": {
    "surfacer-kb": {
      "command": "node",
      "args": ["$CACHE_DIR/dist/index.js"],
      "env": {
        "KB_S3_BUCKET": "$S3_BUCKET",
        "KB_BEDROCK_KB_ID": "",
        "KB_AWS_PROFILE": "$AWS_PROFILE",
        "KB_AWS_REGION": "$AWS_REGION",
        "KB_S3_PREFIX": "$S3_PREFIX",
        "KB_USER_NAME": "$USER_NAME",
        "KB_DATA_SOURCE_ID": "",
        "KB_BEDROCK_ROLE_ARN": ""
      }
    }
  }
}
EOF

# Generate install manifest
mkdir -p "$CLAUDE_DIR/plugins/.install-manifests"
python3 -c "
import hashlib, os, json
files = {}
base = '$CACHE_DIR'
for root, dirs, filenames in os.walk(base):
    if 'node_modules' in root.split(os.sep): continue
    for f in filenames:
        path = os.path.join(root, f)
        rel = os.path.relpath(path, base)
        if '.DS_Store' in rel: continue
        try:
            with open(path, 'rb') as fh:
                files[rel] = hashlib.sha256(fh.read()).hexdigest()
        except: pass
manifest = {
    'pluginId': 'surfacer-kb@surfacer-kb-plugins',
    'createdAt': '$(date -u +%Y-%m-%dT%H:%M:%S.000Z)',
    'files': dict(sorted(files.items()))
}
out = os.path.expanduser('~/.claude/plugins/.install-manifests/surfacer-kb@surfacer-kb-plugins.json')
with open(out, 'w') as f:
    json.dump(manifest, f, indent=2)
print(f'{len(files)} files registered')
"
ok "Plugin deployed to cache"

# Register in installed_plugins.json
mkdir -p "$CLAUDE_DIR/plugins"
node -e "
  const fs = require('fs');
  const path = '$CLAUDE_DIR/plugins/installed_plugins.json';
  let data = { version: 2, plugins: {} };
  try { data = JSON.parse(fs.readFileSync(path, 'utf8')); } catch {}
  data.plugins['surfacer-kb@surfacer-kb-plugins'] = [{
    scope: 'user',
    installPath: '$CACHE_DIR',
    version: '1.0.0',
    installedAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString()
  }];
  fs.writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
"
ok "Registered in installed_plugins.json"

# Enable in settings.json
node -e "
  const fs = require('fs');
  const path = '$CLAUDE_DIR/settings.json';
  let data = {};
  try { data = JSON.parse(fs.readFileSync(path, 'utf8')); } catch {}
  if (!data.enabledPlugins) data.enabledPlugins = {};
  data.enabledPlugins['surfacer-kb@surfacer-kb-plugins'] = true;
  fs.writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
"
ok "Enabled in settings.json"

# Update Claude Desktop config (for Chat/Cowork tabs)
DESKTOP_CONFIG="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
if [ -f "$DESKTOP_CONFIG" ]; then
  python3 -c "
import json
config = json.load(open('$DESKTOP_CONFIG'))
config.setdefault('mcpServers', {})
config['mcpServers']['surfacer-kb'] = {
    'command': 'node',
    'args': ['$CACHE_DIR/dist/index.js'],
    'env': {
        'KB_S3_BUCKET': '$S3_BUCKET',
        'KB_BEDROCK_KB_ID': '',
        'KB_AWS_PROFILE': '$AWS_PROFILE',
        'KB_AWS_REGION': '$AWS_REGION',
        'KB_S3_PREFIX': '$S3_PREFIX',
        'KB_USER_NAME': '$USER_NAME',
        'KB_DATA_SOURCE_ID': '',
        'KB_BEDROCK_ROLE_ARN': ''
    }
}
with open('$DESKTOP_CONFIG', 'w') as f:
    json.dump(config, f, indent=2)
" 2>/dev/null && ok "Desktop config updated" || true
fi

# ─────────────────────────────────────────────────────
# Step 7: Optional Bedrock setup
# ─────────────────────────────────────────────────────
echo ""
echo -e "    ${DIM}Bedrock enables semantic search (\"find docs about X\").${RESET}"
echo -e "    ${DIM}Without it, Surfacer Knowledge Base still works — you can list, read, and write docs.${RESET}"
read -rp "    Set up Bedrock semantic search now? (y/N): " SETUP_BEDROCK

if [[ "$SETUP_BEDROCK" =~ ^[Yy]$ ]]; then
  step "Setting up Bedrock Knowledge Base"
  echo -e "    ${DIM}This creates an OpenSearch Serverless collection + Bedrock KB.${RESET}"
  echo -e "    ${DIM}You need an IAM role ARN that Bedrock can assume to read S3.${RESET}"
  echo ""
  echo -e "    ${DIM}If you don't have one, you can create it later by asking Claude:${RESET}"
  echo -e "    ${DIM}  \"Set up Bedrock KB for Surfacer Knowledge Base\" — it will use the setup_bedrock_kb tool${RESET}"
  echo ""
  ask "Bedrock IAM role ARN (or press Enter to skip)" BEDROCK_ROLE_ARN

  if [ -n "$BEDROCK_ROLE_ARN" ]; then
    echo -e "    ${DIM}Creating KB... this takes 3-5 minutes.${RESET}"

    # Update .mcp.json with role ARN
    python3 -c "
import json
with open('$MCP_JSON') as f: config = json.load(f)
env = list(config['mcpServers'].values())[0]['env']
env['KB_BEDROCK_ROLE_ARN'] = '$BEDROCK_ROLE_ARN'
with open('$MCP_JSON', 'w') as f: json.dump(config, f, indent=2)
"
    ok "Role ARN saved"
    echo ""
    echo -e "    ${YELLOW}Run this after restarting Claude Code:${RESET}"
    echo -e "    ${DIM}  Ask Claude: \"Set up the Bedrock KB and sync it\"${RESET}"
    echo -e "    ${DIM}  Claude will use the setup_bedrock_kb tool to finish the setup.${RESET}"
  else
    warn "Skipping Bedrock — you can set it up later from Claude Code"
  fi
fi

# ─────────────────────────────────────────────────────
# Done!
# ─────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}══════════════════════════════════════════${RESET}"
echo -e "${GREEN}${BOLD}  Setup complete!${RESET}"
echo -e "${GREEN}${BOLD}══════════════════════════════════════════${RESET}"
echo ""
echo -e "  ${BOLD}Next steps:${RESET}"
echo ""
echo -e "  1. ${BOLD}Restart Claude Code${RESET}"
echo -e "     The plugin will appear automatically."
echo ""
echo -e "  2. ${BOLD}Try it out${RESET}"
echo -e "     Ask Claude: ${DIM}\"What's in the knowledge base?\"${RESET}"
echo -e "     Or use: ${DIM}/kb-search architecture${RESET}"
echo ""
if [[ ! "$SETUP_BEDROCK" =~ ^[Yy]$ ]]; then
echo -e "  3. ${BOLD}Optional: Enable semantic search${RESET}"
echo -e "     Ask Claude: ${DIM}\"Set up Bedrock KB for Surfacer Knowledge Base\"${RESET}"
echo ""
fi
echo -e "  ${DIM}Config: $MCP_JSON${RESET}"
echo -e "  ${DIM}Plugin: $CACHE_DIR${RESET}"
echo ""
