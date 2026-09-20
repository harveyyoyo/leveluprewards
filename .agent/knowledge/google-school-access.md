# Google accounts for school access

A school can list trusted Google emails on `schools/{schoolId}.adminEmails`. Those accounts can:

1. Open the school (front-door access) without the school access passcode.
2. Sign in as school admin without the admin passcode.

The public login page has a **Sign in with Google** button for this. After Google sign-in, the Next.js school-access check and the Cloud Function both honor `adminEmails`.

The owner can grant this by telling an assistant “this Google account should open this school.” Update the school’s `adminEmails` list (developer school editor, or `node scripts/grant-google-school-access.mjs <schoolId> <email>`).

Do not put those emails on the developer/owner allowlist unless they should manage every school.
