---
name: session-summary
description: >
  Summarize the current session — what was done, decisions made, problems solved,
  and whether a handoff is needed. Presents a structured summary and offers to
  create a handoff for the next person.
user_invocable: true
---

# Session Summary

Generate a structured summary of what happened in this session.

## Process

### Step 1: Review Session

Look back through the conversation and identify:
- **Tasks completed** — what was built, fixed, or changed
- **Decisions made** — any choices between alternatives with rationale
- **Problems encountered** — bugs found, blockers hit, workarounds used
- **Files modified** — key files that were created or changed
- **Open questions** — anything unresolved

### Step 2: Present Summary

Format as a clean summary:

```
## Session Summary — [Date]

### What Was Done
- [Task 1]
- [Task 2]

### Decisions Made
- [Decision]: [Rationale]

### Problems & Solutions
- [Problem]: [How it was solved]

### Files Changed
- [file1.ts] — [what changed]

### Still Open
- [Unresolved items]
```

### Step 3: Offer Follow-ups

Based on the summary, offer to:

1. **Create a handoff** — if there's unfinished work, offer to call `create_handoff` with the session context, decisions, blockers, and next steps
2. **Document to KB** — if decisions or findings are worth preserving, offer to call `write_document` to add them to the knowledge base
3. **Update presence** — call `update_presence` to clear the current working state
