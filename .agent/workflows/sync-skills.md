---
description: Synchronizes assistant instructions across Antigravity, Cursor, and Codex
---

# Sync Skills Workflow

This workflow ensures that all AI assistants are aligned on the latest rules and project context.

## Steps

1. **Review Skills**: Inspect `.agent/skills` for any new or updated skill definitions.
2. **Export to Cursor**:
   - For each skill in `.agent/skills`, ensure there is a corresponding `.mdc` file in `.cursor/rules/`.
   - Update `.cursor/rules/skillshares.mdc` with the latest "Global Project Context" distilled from Antigravity's Knowledge Items.
3. **Notify User**: Once synchronization is complete, notify the user of any major rule changes.

// turbo
4. **Update Status**: Run `git add .agent .cursor/rules` to stage the shared instructions.
