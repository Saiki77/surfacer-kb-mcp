---
name: todos
description: >
  Track team deadlines, action items, and TODOs via the knowledge base. Can list
  current items, add new ones, mark items complete, and show upcoming deadlines.
  Use when the user mentions tasks, deadlines, action items, or asks "what needs
  to be done?"
user_invocable: true
argument-hint: [list | add <item> | done <item> | deadline <item> by <date>]
---

# Team Todos & Deadlines

Manage a shared todo list and deadline tracker stored in the knowledge base at `context/team-todos.md`.

## Process

### Step 1: Load Current Todos

Call `read_document` with path `context/team-todos.md`. If it doesn't exist, create it with an empty structure.

### Step 2: Parse the Document

The todo document uses this format:

```markdown
---
title: Team Todos & Deadlines
category: context
tags: [todos, deadlines, action-items]
---

# Team Todos & Deadlines

## Active Items

| # | Item | Owner | Deadline | Added | Status |
|---|------|-------|----------|-------|--------|
| 1 | Description | @name | 2026-03-25 | 2026-03-20 | open |
| 2 | Description | @name | — | 2026-03-20 | open |

## Completed Items

| # | Item | Owner | Completed | Notes |
|---|------|-------|-----------|-------|
| 1 | Description | @name | 2026-03-19 | Done in PR #42 |
```

### Step 3: Execute the Requested Action

Based on $ARGUMENTS or user intent:

**`list`** (default if no arguments):
- Show all active items, sorted by deadline (soonest first, then no-deadline items)
- Highlight overdue items
- Show count: "X active items, Y overdue"

**`add <item>`**:
- Add a new row to Active Items
- Ask for owner and deadline if not provided
- Auto-increment the item number
- Set "Added" to today's date

**`done <item>`**:
- Move the item from Active to Completed
- Set completion date to today
- Ask for optional completion notes

**`deadline <item> by <date>`**:
- Update the deadline for an existing item
- Accept natural language dates ("next Friday", "end of sprint") — convert to YYYY-MM-DD

**`overdue`**:
- Show only items past their deadline

### Step 4: Write Back

After any modification, call `write_document` to save the updated document at `context/team-todos.md`.

### Step 5: Notify

After changes, summarize what was done:
- "Added: [item] — due [date]"
- "Completed: [item]"
- "Updated deadline: [item] now due [date]"

## Guidelines

- Always preserve existing items when adding or modifying
- Use today's date (from system context) for timestamps
- Keep the document clean and well-formatted
- If the user says something like "we need to do X by Friday", proactively offer to add it as a todo
