# No-passcode demo links

The owner sends people links that open a demo school straight to one area, without the
passcode screen. Only the public demo schools (`schoolabc`, `yeshiva`) can be opened this way;
their passcode (`1234`) is already public on `/login`.

## Link shapes

| Link | Opens |
|------|-------|
| `/demo` | School ABC "Where to?" portal |
| `/demo/library` | School ABC library |
| `/demo/rewards` | School ABC admin → Prizes tab |
| `/demo/attendance` | School ABC admin → Attendance tab |
| `/demo/classroom`, `/demo/office` | Those pages (signed in as the demo admin) |
| `/demo/yeshiva/…` | Same, for the Yeshiva demo |
| `/demo/library?tab=catalog` | Query strings pass through to the page |

Any other page name is passed through (`/demo/student` → `/schoolabc/student`).
Rewards/attendance map to the same admin tabs as the pillar boxes on the staff Welcome tab.

## How it works

- Route: `src/app/demo/[[...path]]/page.tsx` → `DemoSchoolEntry`.
- `resolveDemoLinkTarget` (`src/lib/demoSchoolLink.ts`) turns the link into a same-site page
  inside the demo school, or rejects it. Never accepts a real school id.
- `DemoSchoolEntry` runs the same `login('school', …)` as `/login` with the demo passcode.
  Staff pages (admin, office, classroom, hall of fame, reports) also get the demo admin
  sign-in, best effort. It then mints session cookies and hard-navigates.
- Already signed into that demo school → no new sign-in. Developer sessions stay developer
  (opens the demo as developer support).
- On the main host, middleware sends `/demo…` to the portal host first
  (`canonicalPortalRedirectUrl`), so the session lives where the school pages live.
- `demo` is reserved in the portal, office, SSS, and edge-session path lists so it is never
  read as a school id. Do not create a school with the id `demo`.

## Owner shortcut

Developer → Schools → each demo school row has **No-passcode demo link:** buttons (Portal,
Rewards, Office, Classroom, Attendance, Library) that copy the link.
