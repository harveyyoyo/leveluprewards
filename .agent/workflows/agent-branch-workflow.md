---
description: Create and use a dedicated git branch before an AI assistant edits code
---

# Agent Branch Workflow

Run this at the **start** of every agent task that changes files. Do not edit on `main` unless the user explicitly requests it.

**Default automation:** Cursor Agent sessions run `.cursor/hooks.json` (auto `cursor/` branch + edit guards). Commits on protected branches are blocked by the git pre-commit hook installed via `npm run prepare`. Use `npm run agent:branch -- <slug>` for a named branch.

## 1. Identify the assistant

- **Cursor** → prefix `cursor/`
- **Codex** → prefix `codex/`
- **Antigravity** → prefix `antigravity/`

## 2. Choose the base branch

| Goal | Base |
|------|------|
| Default feature/fix | `main` |
| Lovable UI + Firebase integration | `dev` |

```powershell
git fetch origin
git checkout main
git pull origin main
# OR for dev integration:
# git checkout dev
# git pull origin dev
```

## 3. Create the agent branch

Pick a short slug (e.g. `media-library`, `classroom-labels`).

```powershell
git checkout -b cursor/<slug>
# Replace cursor/ with codex/ or antigravity/ as appropriate
```

Cursor: set active branch metadata for the session (branch name = `cursor/<slug>`).

## 4. Work only on that branch

- All commits stay on this branch.
- Commit message prefix: `[cursor]`, `[codex]`, or `[antigravity]`.
- See `.agent/workflows/commit-progress.md` for staging/commits when the user wants them.

## 5. Hand off or finish

**Continue later:** push the branch; next session checks out the same branch name.

**Done:** open PR to `main` (or `dev`). User merges; optional local cleanup:

```powershell
git checkout main
git pull origin main
git branch -d cursor/<slug>
```

## 6. Rules of thumb

- Never commit to `main` from an agent without explicit user instruction.
- Never switch to another agent’s `cursor/`, `codex/`, or `antigravity/` branch to add your changes.
- Uncommitted work on `main` → create branch first (`git checkout -b cursor/<slug>`); changes carry over unstaged.
