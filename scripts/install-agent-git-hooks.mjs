#!/usr/bin/env node
/**
 * Point this repo at scripts/git-hooks/ for shared pre-commit policy.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const hooksPath = "scripts/git-hooks";

const current = spawnSync("git", ["config", "--local", "core.hooksPath"], {
  cwd: root,
  encoding: "utf8",
});
const existing = current.status === 0 ? (current.stdout || "").trim() : "";

if (existing && existing !== hooksPath) {
  console.log(
    `install-agent-git-hooks: core.hooksPath already "${existing}" — not overwriting.`,
  );
  process.exit(0);
}

const set = spawnSync("git", ["config", "--local", "core.hooksPath", hooksPath], {
  cwd: root,
  stdio: "inherit",
});
if (set.status !== 0) process.exit(set.status ?? 1);
console.log(`install-agent-git-hooks: core.hooksPath -> ${hooksPath}`);
