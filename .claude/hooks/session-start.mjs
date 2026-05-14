#!/usr/bin/env node
// SessionStart hook — primes Claude with the rules of engagement.
// Output goes to the model's system context.

const banner = `
================ MailMind / Claude Code session ================
You are operating in the MailMind repo. Before doing anything:

  1. Read CLAUDE.md (root). It is binding.
  2. Skim specs/ — features are spec-driven; never code without a spec.
  3. Run \`git status\` and \`git log -n 5 --oneline\` to learn current state.
  4. Use the subagents in .claude/agents/ for specialized work.
  5. UI in app/ or components/: always follow .claude/skills/brand-guidelines/SKILL.md (no reminder needed). New brand *docs*: .claude/skills/brand-guideline-generation/SKILL.md first.
  6. Definition of Done = CLAUDE.md §8. \`npm run verify\` must pass before commit.

Slash commands available: /spec, /implement, /review, /ship
================================================================
`;
process.stdout.write(banner);
process.exit(0);
