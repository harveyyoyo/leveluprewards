# Welcome to levelUp EDU!

levelUp EDU is a fun and easy way to manage a school-wide points and rewards system. Students can earn points, redeem them for prizes, and track their progress, all while fostering a positive school culture.

## How to Use the App

There are three main portals to access the system, plus a few special pages.

### 1. Login

*   **School Login:** To access any school-specific portal (Student, Teacher, Admin), you'll first need to log in using your school's unique **School ID** and **Passcode**.
*   **Developer Login:** This is for system administrators to manage all school instances.

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

## AI Coordination (Skillshares)

This project uses a unified AI coordination system called **Skillshares**.
- **Source of Truth**: All AI instructions and project standards are located in the `.agent/` directory.
- **Cursor Rules**: Synchronization rules for Cursor are in `.cursor/rules/`.
- **Workflows**: Common AI procedures are documented in `.agent/workflows/`.
- **Knowledge**: Project-specific quirks and deployment rules are in `.agent/knowledge/`.

All AI assistants (Antigravity, Cursor, Codex) should refer to these directories to ensure consistency.

## License

This project and its source code are proprietary.

Copyright (c) 2026 [Your Name or Organization].  
All rights reserved. See the `LICENSE` file for details.

