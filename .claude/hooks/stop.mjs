#!/usr/bin/env node
// Stop hook — runs when Claude finishes a turn.
// Reminds the agent (and the human) about the self-improvement note (CLAUDE.md §15).

const reminder = `
─────────────────────────────────────────────────────────────────
Turn complete. Before fully stopping:
  • Did you update the relevant spec in specs/?
  • Did you log a one-liner to docs/WORKFLOW.md → "Lessons"?
  • Did you commit with a Conventional Commit message?
─────────────────────────────────────────────────────────────────
`;
process.stdout.write(reminder);
process.exit(0);
