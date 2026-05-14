---
description: Final gate. Runs verify → reviewer → pr-bot. Will not push to main directly.
argument-hint: [optional: commit type/scope hint, e.g. feat/ui]
---

Ship the current work.

1. **Verify** — invoke `test-runner`. Abort if status is `red`.
2. **Review** — invoke `reviewer`. Abort if verdict is `BLOCK_FOR_SECURITY` or `REQUEST_CHANGES` (unless the human overrides).
3. **Commit & PR** — invoke `pr-bot`. Pass any hint from $ARGUMENTS.
   - If on `main`, force the bot to create a branch.
   - If `gh` is available and a remote exists, open a PR.
4. Print:
   - Commit SHA
   - Branch
   - PR URL (if any)
   - One-line lessons entry to append to `docs/WORKFLOW.md`.

Do not auto-merge.
