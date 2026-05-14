---
description: Draft or update a markdown spec under specs/. Triggers the spec-writer agent.
argument-hint: <short feature name or description>
---

You are the orchestrator. The user wants to spec a feature: **$ARGUMENTS**.

1. Find the next free 3-digit prefix in `specs/`.
2. Delegate to the `spec-writer` subagent. Give it:
   - The user's intent: "$ARGUMENTS"
   - The next free number.
   - Pointers to `CLAUDE.md` and any related existing specs (`specs/001-architecture.md` at minimum).
3. When the agent returns, show me the new spec path, a 3-bullet summary of acceptance criteria, and any §11 open questions.

Do NOT write code yet.
