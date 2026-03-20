---
name: kb-health
description: >
  Generate a health report on the knowledge base — document counts by category,
  staleness, word counts, missing cross-references, and actionable recommendations.
  Use when the user asks about KB status, coverage, or quality.
user_invocable: true
---

# Knowledge Base Health Check

Generate a comprehensive health report for the shared knowledge base.

## Process

### Step 1: Inventory

Call `list_documents` to get all documents. For each document, call `read_document` to load its content and metadata.

### Step 2: Collect Metrics

For each document, record:
- **Category** (from file path prefix)
- **Word count** (approximate from content length)
- **Last modified date** (from frontmatter or S3 metadata)
- **Has cross-references** (contains `[[...]]` wiki-links or "Related Documents" section)
- **Has frontmatter** (title, tags, author)
- **Staleness** — flag if modified > 90 days ago

### Step 3: Generate Report

Present a formatted report with:

1. **Summary Stats**
   - Total documents
   - Total word count
   - Documents by category (table)
   - Average document size

2. **Staleness Report**
   - Documents not updated in > 90 days
   - Documents not updated in > 30 days

3. **Quality Issues**
   - Documents missing frontmatter
   - Documents under 300 words (weak embeddings)
   - Documents over 5,000 words (consider splitting)
   - Documents with no cross-references

4. **Category Coverage**
   - Which categories have good coverage
   - Which categories are thin or empty

5. **Recommendations**
   - Specific, actionable items (e.g., "Merge X and Y", "Add cross-refs to Z", "Document topic Q")
   - Prioritized by impact

### Step 4: Offer Actions

After presenting the report, offer to:
- Fix any formatting issues automatically
- Run `/process-kb` to normalize documents
- Run `/grow` to fill gaps
