---
description: Keep the in-app staff AI assistant aligned with the product
---

# Update staff help AI

The floating **Help and support** assistant uses a server prompt built from:

1. **`docs/staff-ai-product-knowledge.md`** — static product map, workflows, and rules (edit this for most changes).
2. **`src/app/api/staff-help-chat/route.ts`** — auth, models, message limits, and per-request context (pathname, role, school id). Touch this only for plumbing or dynamic context.

## When to update

- New or renamed **Admin / Teacher / Portal** areas staff ask about.
- New integrations (notifications, printing, imports, etc.).
- Behavior that is easy to get wrong if the model guesses (enable flags, where toggles live).

## When you can skip

- Purely internal refactors, renames staff never see, or copy-only UI tweaks with no new capability.

## Quick check

After editing the markdown, send a test question from the app (staff role) that would have been wrong before; no redeploy is required for markdown-only edits on a running Node server, though serverless hosts pick up new files on the next deployment.
