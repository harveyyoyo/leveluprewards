# School Arcade Rewards — agent notes

## Cursor Cloud specific instructions

Cloud agents run on Ubuntu with a clean git checkout. They do **not** see your local `.env.local`.

### Setup (already in repo)

- Install: `npm install` and `npm install --prefix functions` (see `.cursor/environment.json`).
- Default branch: `main`.
- Repo: `harveyyoyo/studio`.

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
