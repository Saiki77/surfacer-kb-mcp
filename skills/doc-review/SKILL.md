---
name: doc-review
description: >
  Review a specific knowledge base document for quality, accuracy, completeness,
  and freshness. Suggests improvements and offers to apply them. Use when the user
  wants to check or improve a specific KB document.
user_invocable: true
argument-hint: <document-path>
---

# Document Review

Review a knowledge base document for quality and suggest improvements.

## Process

### Step 1: Load the Document

Call `read_document` with the path provided by the user (from $ARGUMENTS). If no path given, call `list_documents` and ask the user which one to review.

### Step 2: Analyze Quality

Check the document against these criteria:

1. **Structure**
   - Has a clear H1 title
   - Uses H2/H3 hierarchy (important for Bedrock chunking)
   - Headers are descriptive, not generic

2. **Content Quality**
   - Written in prose, not just bullet points
   - Includes rationale ("why", not just "what")
   - Word count is 1,000–3,000 (flag if under 300 or over 5,000)

3. **Freshness**
   - Check modified date — flag if > 90 days old
   - Look for references to deprecated tools, old versions, or resolved issues

4. **Completeness**
   - Any TODO markers or placeholders?
   - Are there obvious gaps where more detail is needed?
   - Does it cover edge cases or just the happy path?

5. **Cross-References**
   - Does it link to related documents?
   - Search KB with `search_knowledge` for related topics — are there docs that should be linked?

6. **Metadata**
   - Has proper frontmatter (title, author, created, modified, category, tags)?
   - Category matches folder placement?

### Step 3: Present Review

Format as a review with:
- **Score** (1-5) for each criterion
- **Overall assessment** (1-2 sentences)
- **Specific suggestions** — concrete improvements, not vague advice
- **Priority** — what to fix first

### Step 4: Offer to Fix

After presenting the review, offer to apply improvements directly via `write_document`. Always confirm with the user before writing.
