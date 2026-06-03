# School Arcade Rewards — agent notes

## Cursor Cloud specific instructions

Cloud agents run on Ubuntu with a clean git checkout. They do **not** see your local `.env.local`.

### Setup (already in repo)

- Install: `npm install` and `npm install --prefix functions` (see `.cursor/environment.json`).
- Default branch: `main` (read-only base for agents—do not commit here).
- Repo: `harveyyoyo/leveluprewards`.

### Git branches (required)

Each agent session must use **its own branch** before changing code:

| Agent | Prefix |
|-------|--------|
| Cursor | `cursor/<task-slug>` |
| Codex | `codex/<task-slug>` |
| Antigravity | `antigravity/<task-slug>` |

Workflow: `.agent/workflows/agent-branch-workflow.md`. Rules: `.cursor/rules/agent-branches.mdc`. **Enforced by default:** Cursor hooks (`.cursor/hooks.json`) + git pre-commit after `npm install`. Named branch: `npm run agent:branch -- <slug>`. Base `main` for most work; base `dev` for Lovable/UI integration. Open PRs to merge; do not push agent work directly to `main` unless the user explicitly asks.

### Secrets (add in [Cloud Agents dashboard](https://cursor.com/dashboard/cloud-agents) → Secrets)

Copy **values** from your machine’s `.env.local` (never commit secrets). Minimum for most agent tasks:

| Secret | Purpose |
|--------|---------|
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Firebase Admin (session cookies, server routes) |
| `NEXT_PUBLIC_DEVELOPER_GOOGLE_EMAIL_ALLOWLIST` | Developer login allowlist |
| `DEV_DEVELOPER_PASSCODE` | Local/dev passcode flows (optional on cloud) |
| `PORTAL_CANONICAL_HOST` | Portal hostname routing |
| `NEXT_PUBLIC_ENABLE_DEV_LOGIN` | Dev login toggle when needed |
| `NEXT_PUBLIC_ENABLE_SERVICE_WORKER` | SW flag if you test PWA behavior |
| `NEXT_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR` | Leave unset or `false` for cloud (use live Functions) |
| `NGROK_DOMAIN` | Only if testing tunnels from cloud |

Optional for production-parity auth work (see `.agent/knowledge/deployment.md`):

| Secret | Purpose |
|--------|---------|
| `AUTH_GATE_SIGNING_SECRET` | Signed school gate cookie (32+ random chars) |
| `DISABLE_AUTH_SESSION_EDGE` | Set to `1` if matching current production rollback |
| `OPENAI_API_KEY` / `GEMINI_API_KEY` | AI parse routes only |

### Commands agents can run

- `npm run lint` / `npm run typecheck` / `npm run test`
- `npm run build` (may need secrets for SSR auth routes)
- Do **not** deploy to production unless the user explicitly asks.

### Privacy

Cloud agents require **Privacy Mode** (not Legacy) on the Cursor account.

### Local development notes

- The dev server uses Webpack by default (`scripts/dev-webpack.cjs`). Turbopack is also available via `npm run dev:turbo`.
- `npm run dev` starts Webpack dev and **background route warmup** (HTTP pre-compile, then headless Chrome on heavy pages). Disable: `DEV_WARMUP=0` in `.env.local` or `npm run dev:fast`.
- If pages are blank or you see "Cannot find module ./*.js" errors, run `npm run dev:reset` to clean the `.next` cache.
- The Firebase config (API key, project ID) is hardcoded in `src/firebase/config.ts`; no Firebase secrets are needed for the dev server to start and render pages.
- The `/developer` login page is always available in dev mode (`next dev`). In production builds it requires `NEXT_PUBLIC_ENABLE_DEV_LOGIN=true`.
- For offline/isolated Firebase development, use `firebase emulators:start` with `NEXT_PUBLIC_FIREBASE_EMULATORS=1`.
- **School Office (local)**: One `npm run dev` serves main + office; edits hot-reload without restarting unless you change `.env.local`, `middleware.ts`, or `next.config.js`. Leave `OFFICE_CANONICAL_HOST` / `PORTAL_CANONICAL_HOST` unset locally so office opens at `http://localhost:3000/{school}/office`. Open the app at `http://localhost:PORT` (not `http://0.0.0.0:PORT`) so login redirects work.
- E2E tests use Playwright (`@playwright/test`). Install browsers first with `npx playwright install --with-deps chromium`.
- The project requires Node.js 22 (see `.nvmrc`) and npm (lockfile: `package-lock.json`).
