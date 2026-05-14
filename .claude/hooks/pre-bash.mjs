#!/usr/bin/env node
// PreToolUse hook for Bash.
// Gates `git commit` and `git push` behind `npm run verify`.
// Also blocks accidentally dangerous commands the deny list might miss.

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

function readStdin() {
  try {
    return JSON.parse(readFileSync(0, "utf8"));
  } catch {
    return {};
  }
}

const payload = readStdin();
const cmd = (payload.tool_input?.command ?? "").trim();

if (!cmd) process.exit(0);

// Hard blocks (belt + suspenders alongside settings.json deny list).
const HARD_BLOCK = [
  /\brm\s+-rf\s+\/(?!.*node_modules)/i,
  /\bgit\s+push\s+(-f|--force)\b/i,
  /\bgit\s+reset\s+--hard\s+origin/i,
  /:\(\)\s*\{\s*:\|:&\s*\};/, // fork bomb
];
for (const re of HARD_BLOCK) {
  if (re.test(cmd)) {
    process.stderr.write(`[pre-bash] BLOCKED: command matched safety rule (${re}).\n`);
    process.exit(2);
  }
}

// Gate git commit on verify (skip if --no-verify already requested by human).
const isCommit = /\bgit\s+commit\b/.test(cmd) && !/--no-verify/.test(cmd);
if (isCommit) {
  process.stderr.write("[pre-bash] running `npm run verify` before commit...\n");
  const v = spawnSync("npm", ["run", "verify"], {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (v.status !== 0) {
    process.stderr.write(
      "[pre-bash] verify FAILED. Fix errors before committing. (See CLAUDE.md §8.)\n",
    );
    process.exit(2);
  }
}

process.exit(0);
