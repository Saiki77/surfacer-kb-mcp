---
name: grow
description: >
  Automatically reviews and improves the knowledge base. Identifies stale docs,
  missing cross-references, category misplacements, formatting issues, and
  knowledge gaps. Designed to run as a scheduled task for continuous self-improvement.
user_invocable: false
---

# Knowledge Base Self-Improvement

Review the entire knowledge base and make it better. This skill is designed to run automatically on a schedule so the KB improves over time without manual effort.

## Process

### Step 1: Inventory
Call `list_documents` to get all documents. For each document, call `read_document` to load its content and metadata.

### Step 2: Analyze
For each document, check:

1. **Staleness** — Is the `modified` date very old? Does the content reference outdated tools, deprecated APIs, or resolved issues? If so, flag it.

2. **Category placement** — Does the document belong in its current folder?
   - `decisions/` should contain decision records with rationale
   - `architecture/` should contain system design docs
   - `processes/` should contain how-to guides and runbooks
   - `meeting-notes/` should contain meeting summaries
   - `context/` should contain reference material
   - If misplaced, move it (delete old path, write to new path).

3. **Cross-references** — Does this document mention topics covered by other documents? If so, add a `## Related Documents` section with `[[doc-name]]` wiki-links. Check the `relatedDocuments` frontmatter field too.

4. **Formatting** — Is there a single H1 title? Logical H2/H3 hierarchy? Consistent markdown style? Clean up if needed.

5. **Completeness** — Are there TODOs, placeholders, or obviously incomplete sections? Flag these.

### Step 3: Identify Gaps
After reading all documents, consider what's missing:
- Are there documents that reference concepts with no corresponding doc?
- Are there obvious topics (based on existing content) that should have documentation but don't?
- Create stub documents for critical gaps with a `TODO: flesh out this document` note.

### Step 4: Execute Improvements
For each improvement:
- **Formatting fixes, cross-references, category moves**: Apply directly via `write_document` (and `delete_document` for moves). These are safe, non-destructive improvements.
- **Content updates to stale docs**: Write the update. Mark `aiProcessed` timestamp.
- **New stub docs for gaps**: Create with clear TODO markers.
- **Significant content changes**: Note these in a summary document at `context/kb-improvement-log.md` so the team can review what changed.

### Step 5: Run /process-kb
After all improvements, run the process-kb skill to normalize formatting and ensure cross-references are consistent across all documents.

## Document Style

When improving or creating documents, follow these principles:

- **Fewer, larger documents** — Merge related small docs into comprehensive ones. One thorough doc per topic is better than 5 stubs.
- **Rich prose over bullet points** — Write in full sentences and paragraphs. Bullet lists are fine for genuinely list-like data (tool inventories, settings) but most content should be narrative.
- **Clear H2/H3 headers** — Each H2 becomes a semantic search chunk in Bedrock. Use descriptive headers like "Conflict Resolution Flow" not just "Conflicts".
- **Include rationale** — Explain "why", not just "what". Context helps both humans and AI understand intent.
- **Target 1,000–3,000 words** — Short docs (< 300 words) produce weak embeddings. Merge them into parent docs.

## General Guidelines

- **Never delete user content** — only reorganize, enhance, and add to it
- **Quality over quantity** — a few meaningful improvements are better than touching every file
- **Log what you did** — append a summary to `context/kb-improvement-log.md` with the date and list of changes
- **Be conservative with content changes** — formatting and cross-refs are safe; changing meaning requires care
