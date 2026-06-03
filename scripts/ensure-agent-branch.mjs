#!/usr/bin/env node
/**
 * Ensure the repo is on an agent branch (cursor/ by default).
 * Usage:
 *   node scripts/ensure-agent-branch.mjs
 *   node scripts/ensure-agent-branch.mjs my-feature-slug
 *   AGENT_BRANCH_SLUG=my-feature node scripts/ensure-agent-branch.mjs
 */
import { spawnSync } from "node:child_process";
import {
  defaultCursorBranchName,
  isAgentBranch,
  isProtectedBranch,
} from "./lib/agentBranchPolicy.mjs";

function git(...args) {
  const r = spawnSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (r.status !== 0) {
    const err = (r.stderr || r.stdout || "").trim();
    throw new Error(err || `git ${args.join(" ")} failed`);
  }
  return (r.stdout || "").trim();
}

function branchExists(name) {
  const r = spawnSync("git", ["rev-parse", "--verify", name], {
    encoding: "utf8",
    stdio: "ignore",
  });
  return r.status === 0;
}

function main() {
  const slugArg = process.argv[2];
  const slug = process.env.AGENT_BRANCH_SLUG || slugArg;
  const sessionId = process.env.CURSOR_SESSION_ID || process.env.SESSION_ID;
  const current = git("rev-parse", "--abbrev-ref", "HEAD");

  if (isAgentBranch(current)) {
    console.log(current);
    return;
  }

  if (!isProtectedBranch(current) && current) {
    console.log(current);
    return;
  }

  const target = defaultCursorBranchName(sessionId, slug);

  if (branchExists(target)) {
    git("checkout", target);
  } else {
    git("checkout", "-b", target);
  }

  console.log(target);
}

try {
  main();
} catch (e) {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
}
