#!/usr/bin/env node
/**
 * Cursor lifecycle hook: auto agent branch + guard protected branches.
 * stdin: Cursor hook JSON (hook_event_name, session_id, tool_name, ...)
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  allowsProtectedBranchWork,
  defaultCursorBranchName,
  isAgentBranch,
  isAllowedShellOnProtected,
  isEditTool,
  isProtectedBranch,
} from "../../scripts/lib/agentBranchPolicy.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    process.stdin.on("end", () => resolve(data));
  });
}

function git(...args) {
  const r = spawnSync("git", args, {
    cwd: REPO_ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (r.status !== 0) return null;
  return (r.stdout || "").trim();
}

function branchExists(name) {
  const r = spawnSync("git", ["rev-parse", "--verify", name], {
    cwd: REPO_ROOT,
    stdio: "ignore",
  });
  return r.status === 0;
}

function ensureAgentBranch(sessionId) {
  const slug = process.env.AGENT_BRANCH_SLUG;
  const current = git("rev-parse", "--abbrev-ref", "HEAD");
  if (!current) return { branch: null, created: false };
  if (isAgentBranch(current)) return { branch: current, created: false };
  if (!isProtectedBranch(current)) return { branch: current, created: false };

  const target = defaultCursorBranchName(sessionId, slug);
  const exists = branchExists(target);
  const checkoutArgs = exists ? ["checkout", target] : ["checkout", "-b", target];
  const r = spawnSync("git", checkoutArgs, { cwd: REPO_ROOT, stdio: "ignore" });
  if (r.status !== 0) return { branch: current, created: false };
  return { branch: target, created: !exists };
}

function deny(userMessage, agentMessage) {
  const out = {
    permission: "deny",
    user_message: userMessage,
    agent_message: agentMessage,
  };
  process.stdout.write(`${JSON.stringify(out)}\n`);
  process.exit(2);
}

function allow() {
  process.stdout.write(JSON.stringify({ permission: "allow" }) + "\n");
  process.exit(0);
}

async function main() {
  let input = {};
  try {
    const raw = await readStdin();
    if (raw.trim()) input = JSON.parse(raw);
  } catch {
    input = {};
  }

  const event = input.hook_event_name || process.env.CURSOR_HOOK_EVENT || "";
  const branch = git("rev-parse", "--abbrev-ref", "HEAD") || "main";
  const override = allowsProtectedBranchWork();

  if (event === "sessionStart") {
    const mode = input.composer_mode || "agent";
    const sessionId = input.session_id || input.conversation_id || "";
    let additional = "";

    if (mode === "agent" && !override) {
      const { branch: newBranch, created } = ensureAgentBranch(sessionId);
      const activeBranch =
        git("rev-parse", "--abbrev-ref", "HEAD") || newBranch || branch;
      if (newBranch || activeBranch) {
        additional = [
          "## Git branch (enforced by project hooks)",
          `Active branch: \`${activeBranch}\`${created ? " (created for this session)" : ""}.`,
          "Work only on `cursor/`, `codex/`, or `antigravity/` branches.",
          "To use a named branch: set `AGENT_BRANCH_SLUG=my-task` before starting, or run `npm run agent:branch -- my-task`.",
          "Human override on protected branches: `ALLOW_PROTECTED_BRANCH_EDITS=1`.",
        ].join("\n");
      }
    }

    const active =
      git("rev-parse", "--abbrev-ref", "HEAD") || branch;
    process.stdout.write(
      JSON.stringify({
        env: {
          CURSOR_AGENT_BRANCH: active,
          AGENT_BRANCH_POLICY: "1",
        },
        additional_context: additional || undefined,
      }) + "\n",
    );
    process.exit(0);
  }

  if (override || !isProtectedBranch(branch)) {
    allow();
    return;
  }

  if (event === "preToolUse") {
    const tool = input.tool_name || "";
    if (isEditTool(tool)) {
      deny(
        `Edits are blocked on branch "${branch}". Run: npm run agent:branch -- your-task-slug`,
        `You are on protected branch "${branch}". Run \`npm run agent:branch -- <slug>\` or \`git checkout -b cursor/<slug>\` before editing files.`,
      );
      return;
    }
    allow();
    return;
  }

  if (event === "beforeShellExecution") {
    const command = input.command || input.tool_input?.command || "";
    if (!isAllowedShellOnProtected(command)) {
      deny(
        `This shell command is blocked on "${branch}" (agent branch policy).`,
        `Shell blocked on "${branch}". Create an agent branch first: npm run agent:branch -- <slug>. Override: ALLOW_PROTECTED_BRANCH_EDITS=1`,
      );
      return;
    }
    allow();
    return;
  }

  process.exit(0);
}

main().catch(() => process.exit(0));
