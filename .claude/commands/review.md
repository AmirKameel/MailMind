---
description: Run the reviewer subagent on the current staged + unstaged diff against the relevant spec.
argument-hint: [optional: spec path]
---

Run the `reviewer` subagent.

1. Determine the diff under review:
   - Run `git diff --staged --stat` and `git diff --stat` first.
   - If staged changes exist, use them. Otherwise use `git diff main...HEAD`.
2. Determine the spec(s) this diff implements:
   - If $ARGUMENTS is provided, use it.
   - Otherwise scan commit messages and the diff for `Spec: specs/NNN-…` references.
3. Pass the diff + the spec(s) + the path to `CLAUDE.md` to the reviewer subagent.
4. Print the reviewer's verdict and findings verbatim.

If verdict is `BLOCK_FOR_SECURITY`, stop immediately and flag for human attention.
