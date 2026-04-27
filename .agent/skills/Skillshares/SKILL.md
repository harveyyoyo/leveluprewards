---
name: Skillshares
description: Manages cross-assistant knowledge synchronization (Antigravity, Cursor, Codex).
---

# Skillshares

This skill ensures that Antigravity, Cursor, and Codex are synchronized with the latest project standards, development patterns, and task progress.

## Purpose
- Maintain a single source of truth for AI instructions in the `.agent` directory.
- Export relevant "Knowledge Items" and "Skills" to Cursor-compatible `.mdc` files.
- Provide a consistent context for Codex (Copilot) by maintaining documentation in predictable locations.

## Guidelines
1. **Source of Truth**: All universal assistant rules should be defined in `.agent/skills`.
2. **Synchronization**: Use the `sync-skills` workflow to update assistant-specific configurations (like `.cursor/rules`).
3. **Auto-Git Hygiene**: 
    - **Stage Early**: Run `git add` immediately after a successful file edit or verification step.
    - **Commit Often**: Use the `commit-progress` workflow to create a commit after reaching a logical milestone or finishing a task boundary.
    - **Descriptive Messages**: Commits should be prefixed with the assistant name (e.g., `[antigravity]`, `[cursor]`).
4. **Documentation**: Keep project-specific quirks documented in `Knowledge Items` for all assistants to consume.

## Integration
- **Cursor**: Uses `.cursor/rules/*.mdc` for agent-level instructions.
- **Antigravity**: Uses `.agent/skills` and `Knowledge Items`.
- **Codex**: Relies on file-level comments and workspace documentation (READMEs, `.agent/docs`).

## Dev Environment & Localhost
To ensure consistent verification and centralized logging in a multi-agent setup:
1. **Primary Orchestrator**: Antigravity should primarily manage the `npm run dev` lifecycle.
2. **Centralized Logging**: Running the dev server in Antigravity's terminal allows it to monitor build/lint errors and perform autonomous fixes.
3. **Autonomous Verification**: Antigravity can use its `browser_subagent` to verify UI parity and functional requirements as soon as a build completes.
4. **Shared Access**: All agents (Cursor, Codex) still access the same `localhost` port on the host machine, but Antigravity provides the "eye" for verification.
