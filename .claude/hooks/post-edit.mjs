#!/usr/bin/env node
// PostToolUse hook for Edit / Write / MultiEdit.
// Auto-formats with prettier and runs a fast targeted typecheck on changed file(s).
// Reads the hook payload from stdin per Claude Code hook spec.

import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

function readStdin() {
  try {
    return JSON.parse(readFileSync(0, "utf8"));
  } catch {
    return {};
  }
}

const payload = readStdin();
const toolInput = payload.tool_input ?? {};
const filePath =
  toolInput.file_path ?? toolInput.path ?? toolInput.notebook_path ?? null;

if (!filePath || !existsSync(filePath)) process.exit(0);

const ext = path.extname(filePath).toLowerCase();
const formattable = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".md", ".css"];
if (!formattable.includes(ext)) process.exit(0);

// 1. Prettier (non-fatal — warn only)
const fmt = spawnSync("npx", ["--no-install", "prettier", "--write", filePath], {
  stdio: ["ignore", "pipe", "pipe"],
  shell: process.platform === "win32",
});
if (fmt.status !== 0) {
  process.stderr.write(`[post-edit] prettier failed on ${filePath}\n${fmt.stderr.toString()}\n`);
}

// 2. Targeted typecheck only for TS/TSX
if ([".ts", ".tsx"].includes(ext)) {
  const tsc = spawnSync(
    "npx",
    ["--no-install", "tsc", "--noEmit", "--pretty", "false", "-p", "tsconfig.json"],
    { stdio: ["ignore", "pipe", "pipe"], shell: process.platform === "win32" },
  );
  if (tsc.status !== 0) {
    // Surface as blocking feedback — non-zero exit signals an issue to the agent.
    process.stderr.write(
      `[post-edit] typecheck failed after editing ${filePath}.\n` +
        `Fix the type errors before continuing.\n\n${tsc.stdout.toString()}\n${tsc.stderr.toString()}\n`,
    );
    process.exit(2); // 2 = blocking error per Claude Code hooks spec
  }
}

process.exit(0);
