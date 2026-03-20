---
name: knowledge-base-advisor
description: >
  This skill should be used when starting work on a new feature, encountering
  unfamiliar architecture patterns, discussing decisions or processes, the user
  asks "why was X done this way", mentions onboarding context, references past
  meetings or decisions, or when context about the project's history would be
  helpful. Proactively searches the shared knowledge base to find relevant
  documentation.
---

# Knowledge Base Advisor

You have access to a shared knowledge base stored in AWS S3 with semantic search via Amazon Bedrock. Use it proactively to find relevant context before asking the user for information that might already be documented.

## IMPORTANT: Auto-load Context

**Before starting any implementation work**, call `get_kb_context` with a description of the task to automatically load relevant architectural context, past decisions, and documentation. This ensures you have the full picture before writing code.

## When to Search

1. **New feature work** — Call `get_kb_context` first, then search for additional specific context as needed
2. **Unfamiliar code** — Search for documentation explaining design choices and system architecture
3. **Process questions** — Search for runbooks, deployment procedures, and code review guidelines
4. **Decision context** — Search for ADRs and meeting notes explaining why things were built a certain way
5. **Onboarding context** — Search for tech stack overview, glossary, and system architecture docs
6. **Bug investigation** — Search for known issues, past incidents, or related troubleshooting notes

## How to Use

1. At the start of any task, call `get_kb_context` with a task description to load relevant documents in one call
2. For more specific searches, use `search_knowledge` with a natural language query
3. If search returns relevant results, use `read_document` to get the full document
4. Incorporate the knowledge into your response — cite the document path so the user knows where the information came from

## Knowledge Base Structure

Documents are organized in these categories:
- `decisions/` — Architecture decisions, ADRs
- `architecture/` — System design documentation
- `processes/` — Team processes, runbooks, deployment guides
- `meeting-notes/` — Meeting summaries and action items
- `context/` — Tech stack, glossary, onboarding materials

## Proactive Write-Back — IMPORTANT

The knowledge base is the team's shared brain. **You are expected to actively grow it.** After completing any non-trivial work, evaluate what you learned and propose documenting it.

### What to Document

- **Architecture decisions** — "We chose X over Y because Z" → `decisions/chose-x-over-y.md`
- **Debugging findings** — "Service X fails when Y because Z" → `context/service-x-failure-modes.md`
- **Process discoveries** — "To deploy X, you need to do A, B, C" → `processes/deploying-x.md`
- **New component docs** — "The sync engine works by..." → `architecture/sync-engine.md`
- **Integration patterns** — "Service A talks to B via..." → `architecture/a-b-integration.md`
- **Stakeholder decisions** — "We decided to prioritize X" → `decisions/prioritize-x.md`
- **Meeting outcomes** — Key decisions and action items → `meeting-notes/YYYY-MM-DD-topic.md`

### How to Propose Writes

When you identify something worth documenting:

1. Be specific: name the document path and summarize the content
2. Ask for permission: "I'd like to document [topic] in the KB at `category/filename.md` — allow?"
3. If approved, call `write_document` with the full content
4. If the document updates an existing one, read it first and merge the new information

### When NOT to Write

- Trivial tasks (typo fixes, simple renames)
- Common programming knowledge (how to use a for loop)
- Information already in the KB (search first!)
- Temporary debugging notes that won't help anyone later

## Document Style — IMPORTANT

**Write fewer, larger documents with rich prose — NOT many small docs with bullet points.**

The KB uses Bedrock semantic search with hierarchical markdown-header chunking. Each H2 section becomes a searchable chunk, so well-structured documents with clear headers are highly effective for retrieval.

### Rules

1. **Prefer one comprehensive document per topic** over splitting into many small files. A single `architecture/obsidian-kb-sync-plugin.md` covering the full plugin is better than 5 separate docs for settings, sync, sidebar, conflict resolution, and offline queue.

2. **Write in full sentences and paragraphs.** Prose is easier for humans to read and produces better embeddings than bullet-point lists. Use bullet points sparingly for genuinely list-like data (settings tables, tool inventories, step sequences).

3. **Use clear H2/H3 headers.** Each H2 section is indexed as a separate semantic chunk, so make headers descriptive: "Presence Heartbeat Lifecycle" is better than "Heartbeat".

4. **Before creating a new document, check if an existing doc covers the topic.** If so, add a new section to it rather than creating a separate file.

5. **Target 1,000–3,000 words per document.** Short docs (< 300 words) produce weak embeddings. Very long docs (> 5,000 words) should be split only at natural topic boundaries.

6. **Include context and rationale** — not just "what" but "why". A reader (human or AI) should understand the design intent from the document alone.

## General Guidelines

- Search BEFORE asking the user for context that might already be documented
- When you find relevant docs, quote the key parts and cite the path
- Do not search for trivially obvious things or common programming knowledge
- The stop hook will remind you to reflect — take it seriously, but don't force documentation where none is needed
