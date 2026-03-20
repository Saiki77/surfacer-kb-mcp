---
name: log-session
description: >
  Capture what happened in the current session and write it to the knowledge base.
  Documents decisions, code changes, problems solved, and context for future sessions.
  Use at the end of a working session to persist valuable context.
user_invocable: true
---

# Log Session to KB

Write the current session's activity to the knowledge base so future sessions have context.

## Process

### Step 1: Gather Session Context

Review the conversation and identify:
- What task(s) were worked on
- Key decisions and their rationale
- Problems encountered and how they were solved
- Code or architecture changes made
- Any findings or discoveries worth preserving

### Step 2: Find Existing Docs

Call `search_knowledge` with the main topics from this session. Check if there's an existing document that should be updated rather than creating a new one.

Also check `list_documents` for:
- `context/session-log.md` — append if it exists
- Documents in the same category as this session's work

### Step 3: Draft the Entry

Write a session log entry with:

```markdown
## [Date] — [Brief Description of Work]

### Context
[Why this work was done — the task, ticket, or motivation]

### What Changed
[Summary of changes made — code, architecture, configuration]

### Decisions
[Key decisions with rationale — "We chose X because Y"]

### Findings
[Anything discovered that's worth knowing — gotchas, patterns, insights]

### Next Steps
[What remains to be done, if anything]
```

### Step 4: Confirm and Write

Present the draft to the user. Ask:
- "I'd like to add this to the KB at `[path]` — allow?"

If updating an existing doc, show what section will be added.

Once approved, call `write_document` to persist it.

### Guidelines

- **Append to existing docs** when the session continues previous work on the same topic
- **Create new docs** only for genuinely new topics
- Follow the document style guidelines: prose over bullets, clear H2 headers, include rationale
- Don't log trivial sessions (typo fixes, simple questions)
