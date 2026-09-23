# LevelUp EDU — Complete Internal Guide & Product Manual

This document is the **authoritative product manual** for LevelUp EDU. It is recompiled live when staff updates app knowledge.

---

## 1. Critical Accuracy Rules (Never Guess or Hallucinate)
- **There is NO "Dashboard" tab in Admin.** The first overview tab on the Admin screen is named **Welcome**.
- **The exact 17 tabs on the Admin screen** are strictly:
  - **Welcome**
  - **Students**
  - **Classes**
  - **Teachers & staff**
  - **Rewards**
  - **Coupons**
  - **Classroom**
  - **Reports**
  - **Analytics**
  - **Attendance**
  - **Displays**
  - **Library**
  - **Bonus Points**
  - **Badges**
  - **Goals**
  - **Houses**
  - **Notifications**
- **Never invent fake buttons, tabs, or non-existent settings.** If a staff member asks how to do something the app does not currently support, plainly and politely explain that LevelUp does not have that feature yet.
- Only refer to the real screens, buttons, and workflows documented below.

---

## 2. All School Routes Discovered (27 total)
All typical school addresses start with `/{schoolId}/`:
  - `/admin`
  - `/admin-sign-in`
  - `/bulletin-board`
  - `/classroom`
  - `/classroom-realm`
  - `/classroom-screen`
  - `/displays`
  - `/displays-realm`
  - `/hall-of-fame`
  - `/house-sorting`
  - `/houses`
  - `/houses-realm`
  - `/librarian`
  - `/library`
  - `/office`
  - `/parent`
  - `/portal`
  - `/prize`
  - `/prize-clerk`
  - `/reports`
  - `/secretary`
  - `/sign-in`
  - `/smart-screen`
  - `/sss`
  - `/student`
  - `/student-home`
  - `/teacher`

---

## 3. The 17 Admin Tabs & What They Do
1. **Welcome** (`welcome`): Overview of school activities, live statistics tiles (total students, classes, active staff, listed prizes), and quick shortcuts.
    * View campus-wide numbers
    * Review recent student point activity
    * Quick links to main staff tools

2. **Students** (`students`): Student roster management: add, edit, or remove students, nicknames, grade levels, student themes, face recognition enrollment, and printable ID cards.
    * Add student: Enter name, optional nickname, grade level, and assign teachers.
    * Change student theme: Click Edit or the wand icon on a student row -> Student Theme (optional) -> Generate/Edit Theme -> pick colors, sticker emoji, fonts, or AI theme -> Save (or Remove theme to restore school default).
    * Face enrollment: Open Face Enrollment panel to train campus cameras for touch-free kiosk check-in.
    * Print ID cards: Select students and click Print ID Cards with scannable barcode strips.

3. **Classes** (`classes`): Class groups, homeroom configurations, and assigning main and co-teachers to each class.
    * Create new class
    * Assign homeroom teachers and co-teachers
    * Organize student groups by grade

4. **Teachers & staff** (`teachers`): Staff directory, teacher accounts, desk personnel roles (secretary, prize clerk, librarian, reports), and role permissions.
    * Invite staff members
    * Assign roles: Teacher, Secretary, Prize Clerk, Librarian, Reports
    * Manage teacher account status

5. **Rewards** (`prizes`): Prize shop management, point pricing, inventory stock, prize desk redemptions fulfillment, and student prize orders.
    * Add prize item with point cost, image, and quantity
    * Fulfill pending student prize redemptions at the prize desk
    * Turn prize AI surprise wheel on or off

6. **Coupons** (`coupons`): Generate and print reward tickets (single-use or keep-and-scan reusable slips), point values, and reprint inventory.
    * Print single-use coupons: Choose point value, quantity, and print one-time barcode slips.
    * Print reusable coupons: Check "Make this reusable" to print a keep-and-scan slip for staff to reuse repeatedly.
    * Inventory: Search and reprint previously generated batches.

7. **Classroom** (`classroom`): Class awards live monitor, interactive seating chart for awarding points during lessons, and bathroom pass timer.
    * Live award chart: Select class or "All students" to tap student avatars and award positive points.
    * Interactive seating chart: Arrange student desks visually.
    * Bathroom pass: Run the visual bathroom timer to keep track of hallway passes.

8. **Reports** (`reports`): Historical points activity logs, student account statements, attendance logs, and downloadable CSV exports.
    * Filter activity by date, student, or category
    * Export points data to CSV/Excel
    * Print individual student statements

9. **Analytics** (`insights`): School-wide engagement statistics, points earned vs spent over time, top categories, and participation metrics.
    * Track point inflation and economy trends
    * View top earning behavior categories
    * Monitor class and house engagement

10. **Attendance** (`attendance`): Daily attendance tracking, class sign-in logs, kiosk attendance check-in, and timezone configurations.
    * Review daily check-ins from the kiosk
    * Configure school timezone for accurate timestamps
    * Link attendance to automated parent alerts

11. **Displays** (`displays`): Unified hallway TV studio (Displays Realm at /{schoolId}/displays-realm) for designing Hall of Fame podiums, Smart Screens, and Bulletin Boards.
    * Launch Hall of Fame: 1st, 2nd, and 3rd place podiums for students, classes, or houses.
    * Launch Smart Screen: TV display showing clock, local weather, top earners, and campus updates.
    * Launch Bulletin Board: Celebration cards and motivational announcements.

12. **Library** (`library`): Library management hub: circulation desk, catalog with ISBN camera scan, student self-checkout, and multi-library setups.
    * Scan ISBN: Use camera or handheld barcode scanner to automatically populate title, author, and book cover.
    * Circulation desk: Check books in and out by scanning student badge and book barcode.
    * Self-checkout station: Dedicated kiosk at /{schoolId}/library/kiosk for student drop-box and borrowing.
    * Multi-library setup: Create separate libraries for the main school library and individual classroom reading corners.

13. **Bonus Points** (`bonuspoints`): Milestone point thresholds where students unlock bonus points and prize wheel spins.
    * Create milestones (e.g. 100 points, 500 points)
    * Attach bonus point multipliers or prize spins to achievements

14. **Badges** (`category-badges`): Category-specific achievement badges and digital trophies unlocked when students reach goals.
    * Design custom badges with emoji icons
    * Assign badges to specific point categories like Kindness, Reading, or STEM

15. **Goals** (`goals`): Target goals for individual classrooms or the entire school to work toward shared celebrations.
    * Set school-wide point targets (e.g. Pizza Party at 10,000 pts)
    * Connect goals to classroom point earnings
    * Display progress thermometers on hallway screens

16. **Houses** (`houses`): House system management: house sorting ceremony, house parents, leaderboards, and house point totals.
    * Run animated 3D Sorting Hat ceremony for new students
    * Assign house parents and colors
    * Track house point cups and leaderboards

17. **Notifications** (`notifications`): Automated notification engine for parent and staff alerts on points, prizes, and attendance via email, SMS, and WhatsApp.
    * Enable alert triggers: Send notices when students earn points, redeem prizes, or check in.
    * Choose channels: Email, SMS text messages, or WhatsApp.
    * Configure recipient rules: Send to parents, students, or assigned classroom teachers.

---

## 4. Student Themes & Appearance Personalization
LevelUp EDU fully supports custom student themes for personalizing kiosk screens and printed ID cards:
- **How to change a student's theme in Admin:**
  1. Open **Admin → Students**.
  2. Find the student on the roster and click **Edit** (or click the magic wand icon on their row).
  3. Scroll to **Student Theme (optional)**.
  4. Click **Generate Theme** (or **Edit Theme**).
  5. Select custom colors, sticker emoji, fonts, or click the AI generator to create a personalized theme.
  6. Click **Save** to apply it to the student's kiosk and printable ID cards.
  7. Click **Remove theme** if you ever want to clear their custom look and return to the school default.
- **Student Kiosk personalization (`/{schoolId}/student`):**
  When student themes are enabled school-wide, students can tap the theme wand icon on their kiosk dashboard to customize their own background colors and stickers.
- **School-wide default theme:**
  Administrators can set the campus default look under **Admin → Branding & Identity**.

---

## 5. School Office Pillar (`/{schoolId}/office`)
The School Office handles administrative records separate from arcade rewards:
- **Discovered Modules (10 total):**
  - **Attendance** (`/attendance`)
  - **Billing** (`/billing`)
  - **Classes** (`/classes`)
  - **Communication** (`/communication`)
  - **Front-desk** (`/front-desk`)
  - **Grades** (`/grades`)
  - **Reports** (`/reports`)
  - **Settings** (`/settings`)
  - **Students** (`/students`)
  - **Teachers** (`/teachers`)
- **Key Office Workflows:**
  - **Billing & Tuitions:** View family balances, overdue invoices, and send automated payment reminder alerts via SMS and WhatsApp.
  - **Bulk Invoicing:** Generate and issue tuition or fee statements across an entire homeroom or school in one click.
  - **Report Card Grades / Marks:** Manage term grade sheets, missing assignment logs, and marks books.
  - **AI Import Preview:** Paste or upload student rosters, tuition logs, and grade books; the AI parser checks and reconciles duplicates before saving to live records.

---

## 6. School Library Pillar (`/{schoolId}/library`)
Dedicated circulation hub for books and media:
- **Discovered Modules (3 total):**
  - **Book** (`/book`)
  - **Kiosk** (`/kiosk`)
  - **Self-checkout** (`/self-checkout`)
- **Key Library Workflows:**
  - **Catalog & ISBN Barcode Scan:** Hold a book up to the webcam or handheld scanner to autofill title, author, and book cover.
  - **Librarian Desk:** Rapid checkout and returns by scanning student ID cards and book barcodes.
  - **Student Self-Checkout Station (`/{schoolId}/library/kiosk`):** Dedicated fullscreen kiosk where students can borrow and return books independently.
  - **Multiple Libraries:** Create separate libraries for the main school collection and classroom reading shelves.

---

## 7. Permanent Student Kiosk (`/{schoolId}/student`)
- **Web address is hardwired:** The student check-in kiosk is always at `/{schoolId}/student`.
- **Features:** Touchscreen virtual keyboard, face recognition login, passcode sign-in, points balance check, coupon ticket redemption, and prize shopping.

---

## 8. General Rules & Policies
- Do not request, reveal, or store sensitive passwords, API keys, or student personal identifiers.
- If a staff member asks about a school configuration not listed here, advise checking with the school administrator.
