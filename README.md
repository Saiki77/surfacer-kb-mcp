# Surfacer Knowledge Base

A Claude Code plugin that gives Claude a persistent, searchable shared knowledge base backed by AWS S3 and Amazon Bedrock.

Your team's knowledge grows with every session. What one Claude session learns, every future session knows.

## Quick Start

```bash
git clone https://github.com/Saiki77/surfacer-kb-mcp.git
cd surfacer-kb-mcp
bash scripts/setup.sh
```

Restart Claude Code. That's it — Surfacer Knowledge Base appears automatically.

## What It Does

**For Claude:** 15 MCP tools for reading, writing, searching, and managing a shared knowledge base. Claude can document decisions, look up prior context, and hand off work between sessions.

**For your team:** A growing institutional memory. Architecture decisions, process docs, onboarding context, and meeting notes — all searchable via natural language.

### Tools

| Tool | Description |
|------|-------------|
| `write_document` | Create or update a KB document |
| `read_document` | Read a document by path |
| `delete_document` | Remove a document |
| `list_documents` | Browse documents by category |
| `search_knowledge` | Semantic search via Bedrock |
| `get_kb_context` | Load relevant context for a topic |
| `process_document` | AI-powered formatting and categorization |
| `create_handoff` | Create a session hand-off |
| `claim_handoff` / `complete_handoff` | Hand-off lifecycle |
| `list_handoffs` | View open/claimed/completed hand-offs |
| `update_presence` / `get_presence` | Team presence tracking |
| `setup_bedrock_kb` | One-time Bedrock KB setup |
| `sync_bedrock` | Re-index documents for search |

### Skills

| Skill | Description |
|-------|-------------|
| **Knowledge Base Advisor** | Proactively loads relevant KB context when you start working on a topic |
| `/kb-search` | Quick semantic search across the knowledge base |
| `/kb-sync` | Trigger Bedrock re-indexing after document changes |
| `/handoff` | View and claim session hand-offs from teammates |
| `/explain` | Explain a concept or decision using KB context |
| `/doc-review` | Review a KB document for quality, accuracy, and freshness |
| `/onboard` | Generate a personalized onboarding reading list for new team members |
| `/kb-health` | Health report — document counts, staleness, gaps, and recommendations |
| `/grow` | Automatically improve the KB: fix stale docs, add cross-references, fill gaps |
| `/process-kb` | Normalize formatting, auto-categorize, and add cross-reference links |
| `/log-session` | Capture decisions and context from the current session into the KB |
| `/session-summary` | Summarize what was done and offer to create a hand-off |
| `/todos` | Track team deadlines and action items via the KB |

## Prerequisites

- **Claude Code** (the CLI tool)
- **AWS account** with an S3 bucket
- **Node.js** 18+
- **Optional:** Amazon Bedrock access (for semantic search)

## Setup

### Automatic (recommended)

```bash
bash scripts/setup.sh
```

The interactive wizard walks you through:
1. Your display name (for presence tracking)
2. S3 bucket configuration
3. AWS credentials (profile or access keys)
4. Building and registering the plugin
5. Optional Bedrock semantic search setup

### Manual

1. Copy `.mcp.json.example` to `.mcp.json` and fill in your values
2. `npm install && npm run build`
3. `bash scripts/deploy-local.sh`
4. Restart Claude Code

## Updating

```bash
bash scripts/update.sh
```

Pulls the latest changes, rebuilds, and redeploys. Your `.mcp.json` config (bucket, credentials, etc.) is preserved — you won't be asked to re-enter anything. Restart Claude Code after updating.

## AWS Setup

Surfacer Knowledge Base needs an S3 bucket and an IAM user (or role) with access to it. Bedrock is optional but adds semantic search.

### 1. Create an S3 bucket

You can use the included setup script or create one manually:

```bash
# Using the setup script
bash scripts/setup-aws.sh

# Or manually via AWS CLI
aws s3api create-bucket \
  --bucket your-kb-bucket \
  --region us-east-1
```

Enable versioning (recommended — protects against accidental overwrites):

```bash
aws s3api put-bucket-versioning \
  --bucket your-kb-bucket \
  --versioning-configuration Status=Enabled
```

### 2. IAM permissions

Your AWS credentials need the following permissions on your bucket. A reference policy is in `scripts/iam-policy.json`:

```json
{
  "Version": "2012-01-01",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket",
        "s3:HeadObject"
      ],
      "Resource": [
        "arn:aws:s3:::your-kb-bucket",
        "arn:aws:s3:::your-kb-bucket/*"
      ]
    }
  ]
}
```

If you plan to use Bedrock semantic search, also add:

```json
{
  "Effect": "Allow",
  "Action": [
    "bedrock:Retrieve",
    "bedrock:RetrieveAndGenerate"
  ],
  "Resource": "*"
}
```

### 3. Configure credentials

The plugin reads credentials via an AWS CLI profile. Set one up if you haven't:

```bash
aws configure --profile surfacer-kb
# Enter your Access Key ID, Secret Access Key, and region
```

Then reference that profile name in your `.mcp.json` as `KB_AWS_PROFILE`.

## Configuration

All config lives in `.mcp.json`:

| Variable | Required | Description |
|----------|----------|-------------|
| `KB_S3_BUCKET` | ✅ | S3 bucket name |
| `KB_AWS_REGION` | ✅ | AWS region (e.g. `us-east-1`) |
| `KB_AWS_PROFILE` | ✅ | AWS CLI credentials profile |
| `KB_S3_PREFIX` | | S3 key prefix (default: `knowledge-base/`) |
| `KB_USER_NAME` | | Your display name for presence |
| `KB_BEDROCK_KB_ID` | | Bedrock Knowledge Base ID (enables search) |
| `KB_DATA_SOURCE_ID` | | Bedrock data source ID |
| `KB_BEDROCK_ROLE_ARN` | | IAM role for Bedrock S3 access |

## Semantic Search (Bedrock)

Without Bedrock, Surfacer Knowledge Base works as a document store — you can list, read, write, and organize docs. With Bedrock, you also get semantic search: "find docs about deployment" returns relevant results ranked by meaning.

To set up Bedrock after initial install:
1. Ask Claude: *"Set up Bedrock KB for Surfacer Knowledge Base"*
2. Provide an IAM role ARN with S3 read access and Bedrock trust
3. Claude runs `setup_bedrock_kb` which creates the OpenSearch collection, KB, and data source
4. Run `sync_bedrock` to index existing documents

## Obsidian Plugin

There's a companion [Obsidian](https://obsidian.md) plugin that syncs the knowledge base into your vault, giving your team a visual interface alongside Claude's tools.

### What it does

- **Files** — Tree view of all KB documents, synced bidirectionally with S3
- **Team** — Live presence cards showing who's active and what they're working on
- **Handoffs** — Claim, manage, and complete session hand-offs from the sidebar
- **Activity** — GitHub-style feed of sync events and document changes

The Obsidian plugin and the Claude Code plugin share the same S3 bucket — edits from either side are visible to the other after a sync.

### Install

Install via [BRAT](https://github.com/TfTHacker/obsidian42-brat) (recommended):
1. Install the BRAT community plugin in Obsidian
2. Add `Saiki77/surfacer-kb-obsidian` as a beta plugin

Or install manually from the [latest release](https://github.com/Saiki77/surfacer-kb-obsidian/releases/latest) — copy `main.js`, `manifest.json`, and `styles.css` into `.obsidian/plugins/kb-s3-sync/` in your vault.

### Configure

In Obsidian Settings > KB S3 Sync, set the same AWS credentials you used for the Claude Code plugin:
- **S3 Bucket** — same as `KB_S3_BUCKET`
- **AWS Region** — same as `KB_AWS_REGION`
- **S3 Prefix** — same as `KB_S3_PREFIX`
- **AWS Profile** or access keys — same credentials

See [surfacer-kb-obsidian](https://github.com/Saiki77/surfacer-kb-obsidian) for full documentation.

## Document Style

The KB works best with:
- **Fewer, larger documents** (1,000–3,000 words)
- **Rich prose** over bullet lists
- **Clear H2/H3 headers** (these are Bedrock chunk boundaries)
- **Rationale included** — explain "why" not just "what"

## Development

```bash
npm run dev        # Watch mode
npm run build      # Production build
bash scripts/deploy-local.sh  # Deploy changes to Claude Code
```

After deploying, restart Claude Code to load the updated plugin.

## License
Creative Commons Attribution-NonCommercial 4.0 International
