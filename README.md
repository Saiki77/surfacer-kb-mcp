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

- **`/kb-search`** — Quick knowledge base search
- **`/kb-sync`** — Trigger Bedrock re-indexing
- **`/handoff`** — View and claim session hand-offs
- **Knowledge Base Advisor** — Proactively loads relevant KB context when you start working on a topic

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

There's a companion Obsidian plugin that syncs the KB to your vault with a 4-tab sidebar:

- **Files** — Tree view of all KB documents
- **Team** — Live presence cards (who's working on what)
- **Handoffs** — Session hand-off management
- **Activity** — GitHub-style sync activity feed

See [surfacer-kb-obsidian](https://github.com/Saiki77/surfacer-kb-obsidian) for setup.

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
