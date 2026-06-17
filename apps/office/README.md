# School Office (standalone app)

Independent from the Rewards app at the repo root. Edits here do not rebuild or typecheck Rewards.

## Setup

```bash
npm install
```

Run from this directory, or from repo root: `npm run install:office`

## Dev

```bash
npm run dev
# http://127.0.0.1:3001/{schoolId}/office
```

From repo root: `npm run dev:office`

## Checks

```bash
npm run typecheck
npm run build
```

See `.agent/knowledge/office-app-split.md` for the full split architecture.
