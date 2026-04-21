# Welcome to levelUp EDU!

levelUp EDU is a fun and easy way to manage a school-wide points and rewards system. Students can earn points, redeem them for prizes, and track their progress, all while fostering a positive school culture.

## How to Use the App

There are three main portals to access the system, plus a few special pages.

### 1. Login

*   **School Login:** To access any school-specific portal (Student, Teacher, Admin), you'll first need to log in using your school's unique **School ID** and **Passcode**.
*   **Developer Login:** For system administrators to manage all school instances (global branding, sample schools, etc.). It is **off by default** in the UI for safety.

    **Local development:** Running `next dev` shows **“Developer? Click here”** automatically (no env flag needed for the UI).

    **Production or preview (Vercel, etc.):** `NEXT_PUBLIC_*` variables are fixed when the app is **built**. Set `NEXT_PUBLIC_ENABLE_DEV_LOGIN=true` in the host’s environment and trigger a **new build**. Setting it only at runtime will not update the client bundle.

    **Passcode:** Copy [`.env.example`](.env.example) to `.env.local` and set `DEV_PASSCODE`. The developer passcode you type on the login page must match this value (validated by `/api/auth/dev-login`).

    For Cloud Functions that verify the developer passcode (e.g. `addDeveloperMe`), set the `DEV_PASSCODE` environment variable on the function runtime, or the legacy `dev.passcode` entry from `firebase functions:config`, to the same secret as in `.env.local`.

### 2. Portals

Once you've logged into a school, you can choose from several portals:

*   **Redeem Coupons / Kiosk:**
    *   **How to Log In:** Students can log in by scanning their unique ID card or manually typing in their ID number.
    *   **What you can do:**
        *   View your current point balance.
        *   Redeem coupon codes given out by teachers to earn more points.
        *   See your transaction history.
        *   View the prizes you are eligible to redeem.

*   **Print Coupons:**
    *   **How to Log In:** Teachers select their name from a dropdown list to log in.
    *   **What you can do:**
        *   Generate and print sheets of reward coupons.
        *   Customize the point value and category for each coupon sheet.

*   **Admin Portal:**
    *   **What you can do:** This is the control center for the entire school. Here you can:
        *   Add or remove students, classes, and teachers.
        *   Manage the categories for reward coupons.
        *   Create, edit, and manage the prizes available in the Prize Shop.
        *   Print student ID cards.
        *   Create and restore backups of your school's data.

*   **Prize Shop:**
    *   **How to Log In:** Students scan their ID to access the shop.
    *   **What you can do:**
        *   Browse all the prizes that are currently in stock.
        *   Redeem points for prizes they can afford.

*   **Hall of Fame:**
    *   View a leaderboard of the top all-time point earners in the school.

That's it! It's designed to be simple and intuitive. Enjoy building a positive and rewarding environment at your school!

## Deploying (Firebase Hosting + Next.js SSR)

1. **Node version:** Use **Node 22** locally (matches `engines` and Firebase’s SSR runtime). With [nvm](https://github.com/nvm-sh/nvm): `nvm use` (see `.nvmrc`).
2. **Google Cloud:** Enable the **Compute Engine API** once for the Firebase/GCP project ([console link](https://console.developers.google.com/apis/api/compute.googleapis.com/overview) — pick your project). Without it, SSR deploys can fail when the CLI resolves default compute settings.
3. **PowerShell:** Quote comma-separated targets:
   ```bash
   npm run deploy
   ```
   or:
   ```bash
   firebase deploy --only "hosting,functions"
   ```
4. **Large upload failures:** The SSR bundle is uploaded to Cloud Storage. If `Failed to make request to ... storage.googleapis.com` appears, retry on a stable network (avoid strict proxies/VPN); the app uses `output: 'standalone'` and tracing excludes to keep the package as small as possible.

## License

This project and its source code are proprietary.

Copyright (c) 2026 [Your Name or Organization].  
All rights reserved. See the `LICENSE` file for details.

