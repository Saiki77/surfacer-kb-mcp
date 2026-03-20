---
name: process-kb
description: >
  Process and organize knowledge base documents. Normalizes formatting,
  auto-categorizes into the correct folder, adds cross-reference links between
  related documents, and updates tags. Use /process-kb to run this on all
  unprocessed documents, or specify a path to process a single document.
user_invocable: true
---

# Process Knowledge Base Documents

Scan the knowledge base for documents that need processing and normalize them.

## Steps

1. Call `list_documents` to get all documents in the knowledge base
2. For each document, check if it needs processing:
   - Has never been AI processed (`aiProcessed` field is missing or empty in frontmatter)
   - Or has been modified since last processing (`modified` > `aiProcessed`)
3. For each document that needs processing:
   a. Call `process_document` with the document path — this returns the document content and processing instructions
   b. Follow the processing instructions: normalize formatting, determine category, add cross-references, suggest tags
   c. Call `write_document` with the processed content, correct path (moving to right category folder if needed), and tags
   d. If the document was moved to a new category, call `delete_document` on the old path
4. Report a summary of what was processed

## Important

- **Never remove user content** — only reorganize, normalize, and add links
- Process documents one at a time to avoid errors
- If a document is already well-organized, skip it — don't re-process for no reason
- Cross-reference links use `[[filename]]` wiki-link format (no extension, no folder prefix)
- After processing, the `aiProcessed` timestamp in frontmatter should be set to the current time

## Document Style

When processing documents, also evaluate whether they follow the KB style:

- **Merge small docs** — If a document is under 300 words and relates closely to another doc, merge it as a new section instead of keeping it separate
- **Expand bullet-point-only docs** — Convert terse bullet lists into full prose paragraphs. Add context, rationale, and examples
- **Ensure descriptive H2 headers** — Each H2 is a semantic chunk for Bedrock search. "Three-Way Merge via Manifest" is better than "Merge"
- **Target 1,000–3,000 words** — Flag documents that are too short for effective embedding

## Arguments

If the user provides a specific document path (e.g., `/process-kb context/my-doc.md`), only process that one document. Otherwise, scan and process all documents that need it.
