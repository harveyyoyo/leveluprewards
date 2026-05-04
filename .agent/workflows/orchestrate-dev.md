---
description: Starts the development server and verifies reachability for autonomous verification.
---

1. Ensure all dependencies are installed.
```powershell
npm install
```

2. Start the development server in a background process (or the current terminal if preferred for monitoring).
// turbo
```powershell
npm run dev
```

3. Wait for the server to be ready. Usually, this is indicated by "Ready in ..." or "Local: http://localhost:3000".

4. Verify the server is reachable using your browser tool.
```powershell
# Open browser and navigate to the local dev URL
```

5. Monitor the terminal for any build or lint errors. If errors occur, resolve them immediately using your code editing tools.

6. Once verified, notify the user or move to the next task milestone.

> [!IMPORTANT]
> **Troubleshooting Note:** If the dev server crashes or the UI shows unexpected behavior, do not just keep writing code. Stop, run `npm run build` to identify the root syntax or type error, fix it, and only restart `npm run dev` once the build passes.

> [!IMPORTANT]
> **Firestore Rules:** If you ever modify `firestore.rules`, you MUST immediately deploy them to the cloud using `npx firebase deploy --only firestore:rules` for the changes to take effect at runtime.
