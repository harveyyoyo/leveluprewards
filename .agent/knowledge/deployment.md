# Deployment & Stability Notes

Before any deployment, the site must be thoroughly tested to ensure it is working correctly.

## Pre-Deployment Checklist
- [ ] **Login Functionality**: Especially ensure that accounts can log in successfully (School, Teacher, Student, Admin).
- [ ] **Core Portals**: Verify that the Student Kiosk, Teacher Portal, and Admin Portal are accessible.
- [ ] **Data Sync**: Confirm that Firebase Firestore synchronization is working.
- [ ] **No Console Errors**: Check the browser console for any critical errors.

## Firestore Rules Drift

This project can use live Firestore during local development. Running the Functions
emulator alone does not emulate Firestore, and editing `firestore.rules` locally
does not change the rules enforced by the live database.

### Symptom

The browser or global Firebase error listener reports something like:

```txt
Missing or insufficient permissions: The following request was denied by Firestore Security Rules:
{ "method": "list", "path": "/databases/(default)/documents/schools/{schoolId}/goals" }
```

If `firestore.rules` already allows that read locally, assume the deployed rules
are stale before changing application code.

### Confirm

Check whether the app is pointed at live Firestore:

- `.env.local` has no full Firestore emulator setting.
- The running emulator command is only `firebase emulators:start --only functions`.
- Port `8080` is not listening for the Firestore emulator.

### Fix

Deploy only the Firestore rules:

```powershell
npx firebase deploy --only firestore:rules --project studio-1273073612-71183 --non-interactive
```

Then refresh the app and retry the denied view.

### Prevent

Any time `firestore.rules` changes, deploy rules before testing against live
Firestore. If the intent is to avoid touching live Firebase, start the full local
emulator suite and seed it before testing Firestore reads/writes.
