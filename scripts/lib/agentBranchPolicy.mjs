/**
 * Shared policy for AI agent git branches (cursor/, codex/, antigravity/).
 */

export const PROTECTED_BRANCHES = new Set(["main", "master", "dev"]);

export const AGENT_BRANCH_PREFIXES = ["cursor/", "codex/", "antigravity/"];

const EDIT_TOOL_NAMES = new Set([
  "Write",
  "StrReplace",
  "Delete",
  "ApplyPatch",
  "EditNotebook",
]);

const ALLOWED_SHELL_ON_PROTECTED = [
  /^\s*git\s+rev-parse\b/i,
  /^\s*git\s+status\b/i,
  /^\s*git\s+fetch\b/i,
  /^\s*git\s+branch\b/i,
  /^\s*git\s+checkout\b/i,
  /^\s*git\s+switch\b/i,
  /^\s*git\s+diff\b/i,
  /^\s*git\s+log\b/i,
  /^\s*node\s+scripts\/ensure-agent-branch\.mjs\b/i,
  /^\s*npm\s+run\s+agent:branch\b/i,
];

const BLOCKED_SHELL_ON_PROTECTED = [
  /\bgit\s+commit\b/i,
  /\bgit\s+push\b[^\n]*\bmain\b/i,
  /\bgit\s+push\b[^\n]*\bmaster\b/i,
  /\bgit\s+push\s+origin\s+HEAD\b/i,
];

export function isProtectedBranch(branch) {
  if (!branch) return true;
  return PROTECTED_BRANCHES.has(branch);
}

export function isAgentBranch(branch) {
  if (!branch) return false;
  return AGENT_BRANCH_PREFIXES.some((prefix) => branch.startsWith(prefix));
}

export function defaultCursorBranchName(sessionId, slug) {
  if (slug && typeof slug === "string") {
    const cleaned = slug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48);
    if (cleaned) return `cursor/${cleaned}`;
  }
  const id = String(sessionId || "session")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 8)
    .toLowerCase();
  return `cursor/session-${id || "local"}`;
}

export function isEditTool(toolName) {
  return EDIT_TOOL_NAMES.has(toolName);
}

export function isAllowedShellOnProtected(command) {
  const cmd = String(command || "").trim();
  if (!cmd) return true;
  if (BLOCKED_SHELL_ON_PROTECTED.some((re) => re.test(cmd))) return false;
  return ALLOWED_SHELL_ON_PROTECTED.some((re) => re.test(cmd));
}

export function allowsProtectedBranchWork() {
  return (
    process.env.ALLOW_PROTECTED_BRANCH_EDITS === "1" ||
    process.env.ALLOW_MAIN_COMMIT === "1"
  );
}
