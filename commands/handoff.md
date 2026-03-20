---
name: handoff
description: View and claim session hand-offs from team members
allowed-tools: [mcp__surfacer-kb__list_handoffs, mcp__surfacer-kb__claim_handoff, mcp__surfacer-kb__create_handoff, mcp__surfacer-kb__complete_handoff, mcp__surfacer-kb__update_presence, mcp__surfacer-kb__read_document]
---

# Hand-Off Command

Check for open hand-offs and optionally claim one to continue the work.

## Steps

1. Call `list_handoffs` with status "open" to see available handoffs
2. If there are open handoffs, ask the user if they want to claim one
3. If yes, call `claim_handoff` with the selected ID and the user's name
4. After claiming, load any related KB documents using `read_document` for context
5. Call `update_presence` to mark the user as active on this work

If there are no open handoffs, check for recently completed ones with `list_handoffs` status "completed" in case the user wants to see what was done.
