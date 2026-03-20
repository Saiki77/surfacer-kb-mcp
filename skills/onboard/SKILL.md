---
name: onboard
description: >
  Generate a personalized onboarding reading list from the knowledge base for new
  team members. Searches for architecture overviews, key decisions, processes, and
  context docs, then presents them in recommended reading order. Use when someone
  new joins the team or asks "where do I start?"
user_invocable: true
---

# Onboarding Guide

Generate a personalized reading list from the knowledge base to get a new team member up to speed.

## Process

### Step 1: Understand the Person

If the user provides context about the new person (role, focus area, experience level), use that to tailor the reading list. If not, generate a general onboarding path.

### Step 2: Gather Documents

1. Call `list_documents` to get all available documents
2. Call `search_knowledge` with queries like:
   - "architecture overview"
   - "system design"
   - "getting started"
   - "deployment process"
   - "key decisions"
3. Read the most relevant documents with `read_document`

### Step 3: Build Reading List

Organize documents into a recommended reading order:

1. **Start Here** (1-2 docs)
   - System overview / architecture docs
   - Tech stack and key concepts

2. **Core Architecture** (2-4 docs)
   - How the main systems work
   - Key design patterns and conventions

3. **Processes & Workflows** (1-3 docs)
   - Deployment, testing, code review
   - Team conventions

4. **Key Decisions** (2-3 docs)
   - Important ADRs that explain "why"
   - Trade-offs and constraints

5. **Deep Dives** (optional, role-specific)
   - Docs relevant to their specific area of work

### Step 4: Present

For each document in the list:
- Show the path and title
- Write a 1-2 sentence summary of what they'll learn
- Explain why it matters for onboarding

### Step 5: Offer to Explain

After presenting the list, offer to explain any specific document or concept in more detail using `/explain`.
