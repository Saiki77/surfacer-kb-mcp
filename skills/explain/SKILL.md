---
name: explain
description: >
  Explain a concept, system, or decision using the knowledge base as context.
  Searches the KB for all relevant documentation, synthesizes a clear explanation,
  and offers to document the concept if it's not yet in the KB. Use when someone
  asks "what is X?", "how does X work?", or "why do we do X?"
user_invocable: true
argument-hint: <concept or topic>
---

# Explain a Concept

Search the knowledge base and explain a concept using documented context.

## Process

### Step 1: Search for Context

Use the topic from $ARGUMENTS. Call `search_knowledge` with:
1. The exact topic/concept name
2. A broader query if the first search returns few results
3. Related terms or synonyms

### Step 2: Read Relevant Docs

For each relevant search result, call `read_document` to load the full content. Gather all context about the topic.

### Step 3: Synthesize Explanation

Write a clear, structured explanation that:
- **Starts with a one-paragraph summary** — what it is and why it matters
- **Explains how it works** — architecture, flow, key components
- **Covers the "why"** — design decisions, trade-offs, constraints
- **Cites sources** — reference KB document paths so the reader can dig deeper
- **Adapts to the audience** — if you know the user's role/experience, tailor the depth

If the KB has comprehensive documentation:
- Synthesize across multiple docs into a coherent explanation
- Highlight the most important parts
- Note any inconsistencies between docs

If the KB has little or no documentation:
- Explain from general knowledge and codebase context
- Note what's missing from the KB

### Step 4: Offer to Document

If the concept is not well-documented in the KB, offer:
- "This topic isn't well covered in the KB yet. Want me to write a doc at `[category]/[topic].md`?"

If the explanation revealed outdated or incomplete docs, offer to update them.
