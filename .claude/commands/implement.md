---
description: Implement a spec end-to-end using the appropriate specialist subagent(s).
argument-hint: <path to spec, e.g. specs/003-unified-inbox.md>
---

Implement the spec at: **$ARGUMENTS**.

1. Read the spec at $ARGUMENTS in full. Then re-read CLAUDE.md §6 (provider contract), §7 (AI rules), §8 (definition of done).
2. Classify the work:
   - Touches `lib/providers/`, OAuth, IMAP, or SMTP → use the `provider-integrator` subagent.
   - Touches `app/` routes, `components/`, layouts, PWA, or styles → use the `ui-builder` subagent.
   - Touches `lib/ai/`, prompts, AI caching → use the `ai-engineer` subagent.
   - Mixed → split the spec into the parts each agent owns and invoke them in sequence (or in parallel via separate tool calls when they don't conflict).
3. After every agent finishes its slice, invoke the `test-runner` subagent to verify.
4. If any acceptance criterion is unmet, loop: hand the report back to the responsible agent and re-run.
5. When everything is green, summarize what shipped vs. what was deferred.

Do not call `/ship` automatically — wait for human approval.
