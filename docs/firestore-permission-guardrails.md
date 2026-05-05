# Firestore Permission Guardrails

To prevent "Missing or insufficient permissions" regressions:

- Every frontend `collection(firestore, ...)` path must have a matching `match` block in `firestore.rules`.
- When adding a new Firestore collection, add the rule in the same change as the UI/data-access code.
- Run `npm run check:firestore-rules` before deploying rules or shipping Firestore path changes. This checks client collection coverage and runs a Firestore rules dry-run compile.
- Run `npm run test:permissions` against a healthy local dev server before release. Set `BASE_URL` when needed, for example:

```powershell
$env:BASE_URL='http://localhost:4052'; npm run test:permissions
```

The permission smoke test logs into the demo School ABC flow and visits school-scoped pages, including the bulletin board, while watching for Firestore permission errors in the browser console.

Recent example: `schools/{schoolId}/bulletinBoardIncentives` must stay covered by `firestore.rules`; staff/school members can read it, and admins/developers manage it.
