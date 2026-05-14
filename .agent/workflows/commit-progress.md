---
description: Automatically stages and commits progress
---

# Commit Progress Workflow

This workflow ensures that task milestones are captured in the git history.

## Steps

1. **Update Staff AI Knowledge**:
   - Before staging, determine if the recent changes affect staff-facing workflows, UI, settings, or features.
   - If they do, you MUST update `docs/staff-ai-product-knowledge.md` to reflect these changes.
2. **Stage Changes**:
   // turbo
   - Run `git add .` to stage all current changes.
3. **Commit Changes**:
   // turbo
   - Run `git commit -m "[antigravity] Skillshares: Automated Git Integration - implemented core rules and workflows"` (adjust message as needed).
4. **Verify**:
   - Run `git status` to ensure the working directory is clean.

// turbo-all
5. **Finalize**: Stage and commit the latest workflow files.
