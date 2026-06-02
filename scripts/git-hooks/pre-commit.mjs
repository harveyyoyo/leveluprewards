#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import {
  AGENT_BRANCH_PREFIXES,
  isProtectedBranch,
} from "../lib/agentBranchPolicy.mjs";

function git(...args) {
  const r = spawnSync("git", args, { encoding: "utf8" });
  return r.status === 0 ? (r.stdout || "").trim() : "";
}

const branch = git("rev-parse", "--abbrev-ref", "HEAD");

if (process.env.ALLOW_MAIN_COMMIT === "1") {
  process.exit(0);
}

if (!isProtectedBranch(branch)) {
  process.exit(0);
}

const prefixes = AGENT_BRANCH_PREFIXES.join(", ");
console.error(
  [
    `pre-commit: refusing commit on protected branch "${branch}".`,
    `Create an agent branch first, e.g. npm run agent:branch -- my-task`,
    `Allowed prefixes: ${prefixes}`,
    "Human override: ALLOW_MAIN_COMMIT=1 git commit ...",
  ].join("\n"),
);
process.exit(1);
