#!/usr/bin/env bash
# Stop hook: Reminds Claude to document what it learned and suggest handoffs.
# Receives JSON on stdin, outputs JSON with a systemMessage on stdout.

# Read stdin (required by hook protocol) but we don't need the content
cat > /dev/null

cat <<'EOF'
{
  "hookSpecificOutput": {
    "additionalContext": [
      {
        "role": "system",
        "content": "KNOWLEDGE BASE REFLECTION — Before finishing, review what you did this session and consider whether any of the following should be documented in the shared knowledge base:\n\n1. **Architecture decisions** — Did you choose one approach over another? Why?\n2. **Debugging findings** — Did you discover why something was broken? Root cause?\n3. **Process knowledge** — Did you learn how to deploy, test, or configure something?\n4. **New component docs** — Did you build something new that others need to understand?\n5. **Integration patterns** — Did you connect services or systems in a way worth documenting?\n6. **Stakeholder decisions** — Were any product/business decisions made?\n7. **Session hand-off** — Does someone else need to continue this work? If so, propose creating a handoff with `create_handoff` — include context, decisions made, blockers, and next steps. Frame it as: \"I'd like to create a handoff for [recipient/team] about [subject] — allow?\"\n\nIf anything is worth preserving, propose specific `write_document` calls with:\n- A clear path (e.g., `decisions/chose-s3-over-dynamo.md`)\n- A brief summary of what you'll write\n- Ask the user: \"I'd like to document [X] in the KB at [path] — allow?\"\n\nIf the session was trivial (typo fix, simple question, etc.), skip this entirely — don't force documentation where none is needed.\n\nIMPORTANT: Only propose writes for genuinely useful knowledge. Quality over quantity."
      }
    ]
  }
}
EOF
