# Surfacer Knowledge Base — Shared Knowledge Base

A Claude Code plugin that gives Claude a persistent, searchable memory backed by AWS S3 and Amazon Bedrock. Your team's knowledge grows with every session.

## Proactive Documentation

When working on Surfacer-related tasks:
- **Start**: Call `get_kb_context` to load relevant context before implementing anything
- **During**: If you discover something worth documenting, note it for later
- **After**: Propose specific KB writes for decisions, findings, and knowledge gained
- Frame proposals as: "I'd like to document [X] in the KB at `category/filename.md` — allow?"
- The user approves each write like a shell command — never write without confirmation

## The KB is the team's shared brain
If you learned it, document it. If it's already documented, cite it. If it's outdated, update it.

## Document Style
Write fewer, larger documents with rich prose. Prefer adding sections to existing docs over creating new small files. Use clear H2/H3 headers (each H2 is a Bedrock search chunk). Full paragraphs > bullet lists. Target 1,000–3,000 words per doc.

## Deploy Changes
After modifying plugin code, run: `bash scripts/deploy-local.sh`
