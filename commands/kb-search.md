---
description: Search the shared knowledge base for relevant documentation
argument-hint: <query>
allowed-tools: [mcp__knowledge-base__search_knowledge, mcp__knowledge-base__read_document]
---

# Knowledge Base Search

Search the shared knowledge base with the query: $ARGUMENTS

Use the search_knowledge tool to find relevant documents matching the query. Display results with document paths, relevance scores, and excerpts. If a result looks highly relevant (score > 0.7), automatically read the full document with read_document and summarize the key points.
