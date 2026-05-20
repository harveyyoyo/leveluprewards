# AGENTS.md

## Cursor Cloud specific instructions

### Overview

levelUp EDU is a Next.js 14 (App Router) + TypeScript + Firebase multi-tenant school rewards app.

### Quick commands

| Task | Command |
|------|---------|
| Install deps | `npm install` (runs `postinstall` to copy face-api models) |
| Dev server | `npm run dev` (binds 127.0.0.1:3000; use `HOST=0.0.0.0 npm run dev` for external access) |
| Lint | `npm run lint` |
| Typecheck | `npm run typecheck` |
| Unit tests | `npm run test` (Vitest) |
| Clean dev cache | `npm run dev:reset` |

### Dev server notes

- The dev server uses Webpack by default (`scripts/dev-webpack.cjs`). Turbopack is also available via `npm run dev:turbo`.
- Bind to `0.0.0.0` for access from outside localhost: `HOST=0.0.0.0 npm run dev`
- If pages are blank or you see "Cannot find module ./*.js" errors, run `npm run dev:reset` which cleans the `.next` cache.
- The Firebase config (API key, project ID) is hardcoded in `src/firebase/config.ts` — no Firebase secrets are needed for the dev server to start and render pages.
- The `/developer` login page is always available in dev mode (`next dev`). In production builds it requires `NEXT_PUBLIC_ENABLE_DEV_LOGIN=true`.

### External services

- Firebase (Auth, Firestore, Functions) is the backend. The app connects to the live Firebase project by default. For offline/isolated dev, use `firebase emulators:start` with `NEXT_PUBLIC_FIREBASE_EMULATORS=1`.
- AI features (OpenAI, Gemini) are gated — they gracefully degrade when API keys are absent.
- No Docker is needed for local development.

### Testing

- Unit tests use **Vitest** with jsdom. Run `npm run test`.
- E2E tests use **Playwright** (`@playwright/test`). Install browsers first: `npx playwright install --with-deps chromium`.
- Live smoke tests (`npm run test:live-uptime`, `npm run test:live-auth`) target the production deployment.

### Node version

The project requires Node.js 22 (see `.nvmrc`). The package manager is npm (lockfile: `package-lock.json`).
