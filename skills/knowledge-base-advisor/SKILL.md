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

## When to Search

1. **New feature work** — Search for architecture decisions and existing patterns related to the feature area before starting implementation
2. **Unfamiliar code** — Search for documentation explaining design choices and system architecture
3. **Process questions** — Search for runbooks, deployment procedures, and code review guidelines
4. **Decision context** — Search for ADRs and meeting notes explaining why things were built a certain way
5. **Onboarding context** — Search for tech stack overview, glossary, and system architecture docs
6. **Bug investigation** — Search for known issues, past incidents, or related troubleshooting notes

## How to Use

1. Use `search_knowledge` with a natural language query describing what context would be helpful
2. If search returns relevant results, use `read_document` to get the full document
3. Incorporate the knowledge into your response — cite the document path so the user knows where the information came from
4. If you notice the current work produces valuable context that should be preserved, suggest writing it to the knowledge base with `write_document`

## Knowledge Base Structure

Documents are organized in these categories:
- `decisions/` — Architecture decisions, ADRs
- `architecture/` — System design documentation
- `processes/` — Team processes, runbooks, deployment guides
- `meeting-notes/` — Meeting summaries and action items
- `context/` — Tech stack, glossary, onboarding materials

## Guidelines

- Search BEFORE asking the user for context that might already be documented
- When you find relevant docs, quote the key parts and cite the path
- Do not search for trivially obvious things or common programming knowledge
- Suggest writing new documentation when you notice knowledge gaps
- After completing significant work, suggest documenting key decisions or learnings
