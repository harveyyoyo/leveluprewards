# Owner-only no-passcode demo links

The owner sends people links that open a demo school straight to one area, without the passcode
screen. Only the owner can make these links, and only for the public demo schools
(`schoolabc`, `yeshiva`). Real schools never get a passcode-free link.

## How the owner makes a link

- **Share button:** while signed in with the owner's Google account, every demo-school page
  shows a small **Share** button (bottom-left). It copies a link to that exact page.
- **Developer → Schools:** each demo school row has **No-passcode demo link:** buttons
  (Portal, Rewards, Office, Classroom, Attendance, Library).

## Link shapes

`/demo/<page>?key=<key>` — e.g. `/demo/library?key=…`, `/demo/rewards?key=…` (admin Prizes tab),
`/demo/attendance?key=…` (admin Attendance tab), `/demo/yeshiva/office?key=…`. Other query
params pass through to the page; `key` never does. Without a valid key (or with another school's
key) the link goes to the normal sign-in with the school filled in.

## How it works

- Key: `src/lib/server/demoShareKey.ts` — HMAC of the school id with `AUTH_GATE_SIGNING_SECRET`,
  one key per demo school. Changing that secret invalidates every link ever shared.
- Owner-only key route: `GET /api/developer/demo-share-keys` (`guardDeveloperAuth`), used by
  `useDemoShareKeys` (Share button + Developer page).
- `src/app/demo/[[...path]]/page.tsx` checks the key on the server (`checkDemoLink`), then
  `DemoSchoolEntry` runs the same `login('school', …)` as `/login` with the demo passcode.
  Staff pages (admin, office, classroom, hall of fame, reports) also get the demo admin sign-in,
  best effort. Then it mints session cookies and hard-navigates.
- Already signed into that demo school → no new sign-in. Developer sessions stay developer
  (opens the demo as developer support).
- On the main host, middleware sends `/demo…` to the portal host first
  (`canonicalPortalRedirectUrl`), so the session lives where the school pages live.
- `demo` is reserved in the portal, office, SSS, and edge-session path lists so it is never read
  as a school id. Do not create a school with the id `demo`.
- The demo passcode is still shown on `/login` ("Try a demo school"), so the demos themselves stay
  open to anyone who types it; only the skip-the-passcode link is owner-only.
