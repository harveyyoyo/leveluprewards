import { writeFileSync, existsSync, readdirSync } from 'fs';
import path from 'path';

export interface ScannedTabInfo {
  id: string;
  name: string;
  description: string;
  workflows: string[];
}

export const ADMIN_TABS: ScannedTabInfo[] = [
  {
    id: 'welcome',
    name: 'Welcome',
    description: 'Overview of school activities, live statistics tiles (total students, classes, active staff, listed prizes), and quick shortcuts.',
    workflows: ['View campus-wide numbers', 'Review recent student point activity', 'Quick links to main staff tools'],
  },
  {
    id: 'students',
    name: 'Students',
    description: 'Student roster management: add, edit, or remove students, nicknames, grade levels, student themes, face recognition enrollment, and printable ID cards.',
    workflows: [
      'Add student: Enter name, optional nickname, grade level, and assign teachers.',
      'Change student theme: Click Edit or the wand icon on a student row -> Student Theme (optional) -> Generate/Edit Theme -> pick colors, sticker emoji, fonts, or AI theme -> Save (or Remove theme to restore school default).',
      'Face enrollment: Open Face Enrollment panel to train campus cameras for touch-free kiosk check-in.',
      'Print ID cards: Select students and click Print ID Cards with scannable barcode strips.',
    ],
  },
  {
    id: 'classes',
    name: 'Classes',
    description: 'Class groups, homeroom configurations, and assigning main and co-teachers to each class.',
    workflows: ['Create new class', 'Assign homeroom teachers and co-teachers', 'Organize student groups by grade'],
  },
  {
    id: 'teachers',
    name: 'Teachers & staff',
    description: 'Staff directory, teacher accounts, desk personnel roles (secretary, prize clerk, librarian, reports), and role permissions.',
    workflows: ['Invite staff members', 'Assign roles: Teacher, Secretary, Prize Clerk, Librarian, Reports', 'Manage teacher account status'],
  },
  {
    id: 'prizes',
    name: 'Rewards',
    description: 'Prize shop management, point pricing, inventory stock, prize desk redemptions fulfillment, and student prize orders.',
    workflows: ['Add prize item with point cost, image, and quantity', 'Fulfill pending student prize redemptions at the prize desk', 'Turn prize AI surprise wheel on or off'],
  },
  {
    id: 'coupons',
    name: 'Coupons',
    description: 'Generate and print reward tickets (single-use or keep-and-scan reusable slips), point values, and reprint inventory.',
    workflows: [
      'Print single-use coupons: Choose point value, quantity, and print one-time barcode slips.',
      'Print reusable coupons: Check "Make this reusable" to print a keep-and-scan slip for staff to reuse repeatedly.',
      'Inventory: Search and reprint previously generated batches.',
    ],
  },
  {
    id: 'classroom',
    name: 'Classroom',
    description: 'Class awards live monitor, interactive seating chart for awarding points during lessons, and bathroom pass timer.',
    workflows: [
      'Live award chart: Select class or "All students" to tap student avatars and award positive points.',
      'Interactive seating chart: Arrange student desks visually.',
      'Bathroom pass: Run the visual bathroom timer to keep track of hallway passes.',
    ],
  },
  {
    id: 'reports',
    name: 'Reports',
    description: 'Historical points activity logs, student account statements, attendance logs, and downloadable CSV exports.',
    workflows: ['Filter activity by date, student, or category', 'Export points data to CSV/Excel', 'Print individual student statements'],
  },
  {
    id: 'insights',
    name: 'Analytics',
    description: 'School-wide engagement statistics, points earned vs spent over time, top categories, and participation metrics.',
    workflows: ['Track point inflation and economy trends', 'View top earning behavior categories', 'Monitor class and house engagement'],
  },
  {
    id: 'attendance',
    name: 'Attendance',
    description: 'Daily attendance tracking, class sign-in logs, kiosk attendance check-in, and timezone configurations.',
    workflows: ['Review daily check-ins from the kiosk', 'Configure school timezone for accurate timestamps', 'Link attendance to automated parent alerts'],
  },
  {
    id: 'displays',
    name: 'Displays',
    description: 'Unified hallway TV studio (Displays Realm at /{schoolId}/displays-realm) for designing Hall of Fame podiums, Smart Screens, and Bulletin Boards.',
    workflows: [
      'Launch Hall of Fame: 1st, 2nd, and 3rd place podiums for students, classes, or houses.',
      'Launch Smart Screen: TV display showing clock, local weather, top earners, and campus updates.',
      'Launch Bulletin Board: Celebration cards and motivational announcements.',
    ],
  },
  {
    id: 'library',
    name: 'Library',
    description: 'Library management hub: circulation desk, catalog with ISBN camera scan, student self-checkout, and multi-library setups.',
    workflows: [
      'Scan ISBN: Use camera or handheld barcode scanner to automatically populate title, author, and book cover.',
      'Circulation desk: Check books in and out by scanning student badge and book barcode.',
      'Self-checkout station: Dedicated kiosk at /{schoolId}/library/kiosk for student drop-box and borrowing.',
      'Multi-library setup: Create separate libraries for the main school library and individual classroom reading corners.',
    ],
  },
  {
    id: 'bonuspoints',
    name: 'Bonus Points',
    description: 'Milestone point thresholds where students unlock bonus points and prize wheel spins.',
    workflows: ['Create milestones (e.g. 100 points, 500 points)', 'Attach bonus point multipliers or prize spins to achievements'],
  },
  {
    id: 'category-badges',
    name: 'Badges',
    description: 'Category-specific achievement badges and digital trophies unlocked when students reach goals.',
    workflows: ['Design custom badges with emoji icons', 'Assign badges to specific point categories like Kindness, Reading, or STEM'],
  },
  {
    id: 'goals',
    name: 'Goals',
    description: 'Target goals for individual classrooms or the entire school to work toward shared celebrations.',
    workflows: ['Set school-wide point targets (e.g. Pizza Party at 10,000 pts)', 'Connect goals to classroom point earnings', 'Display progress thermometers on hallway screens'],
  },
  {
    id: 'houses',
    name: 'Houses',
    description: 'House system management: house sorting ceremony, house parents, leaderboards, and house point totals.',
    workflows: ['Run animated 3D Sorting Hat ceremony for new students', 'Assign house parents and colors', 'Track house point cups and leaderboards'],
  },
  {
    id: 'notifications',
    name: 'Notifications',
    description: 'Automated notification engine for parent and staff alerts on points, prizes, and attendance via email, SMS, and WhatsApp.',
    workflows: [
      'Enable alert triggers: Send notices when students earn points, redeem prizes, or check in.',
      'Choose channels: Email, SMS text messages, or WhatsApp.',
      'Configure recipient rules: Send to parents, students, or assigned classroom teachers.',
    ],
  },
];

export interface ScanSummary {
  success: boolean;
  timestamp: number;
  tabsCount: number;
  routesCount: number;
  officeCount: number;
  libraryCount: number;
  featuresCount: number;
  scannedRoutes: string[];
  scannedOfficeModules: string[];
  scannedLibraryModules: string[];
}

export function scanAppStructure(): {
  routes: string[];
  officeModules: string[];
  libraryModules: string[];
} {
  const root = process.cwd();
  const schoolRoutesPath = path.join(root, 'src', 'app', '[schoolId]');
  const officePath = path.join(schoolRoutesPath, 'office');
  const libraryPath = path.join(schoolRoutesPath, 'library');

  let routes: string[] = [];
  let officeModules: string[] = [];
  let libraryModules: string[] = [];

  try {
    if (existsSync(schoolRoutesPath)) {
      routes = readdirSync(schoolRoutesPath, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
        .sort();
    }
  } catch (e) {
    console.error('Error reading school routes:', e);
  }

  try {
    if (existsSync(officePath)) {
      officeModules = readdirSync(officePath, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
        .sort();
    }
  } catch (e) {
    console.error('Error reading office modules:', e);
  }

  try {
    if (existsSync(libraryPath)) {
      libraryModules = readdirSync(libraryPath, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
        .sort();
    }
  } catch (e) {
    console.error('Error reading library modules:', e);
  }

  return { routes, officeModules, libraryModules };
}

export function generateProductKnowledgeMarkdown(): string {
  const { routes, officeModules, libraryModules } = scanAppStructure();

  const tabsText = ADMIN_TABS.map((t, idx) => {
    const workflowsText = t.workflows.map((w) => `    * ${w}`).join('\n');
    return `${idx + 1}. **${t.name}** (\`${t.id}\`): ${t.description}\n${workflowsText}`;
  }).join('\n\n');

  const routesText = routes.map((r) => `  - \`/${r}\``).join('\n');
  const officeText = officeModules.map((m) => `  - **${m.charAt(0).toUpperCase() + m.slice(1)}** (\`/${m}\`)`).join('\n');
  const libraryText = libraryModules.map((m) => `  - **${m.charAt(0).toUpperCase() + m.slice(1)}** (\`/${m}\`)`).join('\n');

  return `# LevelUp EDU — Complete Internal Guide & Product Manual

This document is the **authoritative product manual** for LevelUp EDU. It is recompiled live when staff updates app knowledge.

---

## 1. Critical Accuracy Rules (Never Guess or Hallucinate)
- **There is NO "Dashboard" tab in Admin.** The first overview tab on the Admin screen is named **Welcome**.
- **The exact 17 tabs on the Admin screen** are strictly:
${ADMIN_TABS.map((t) => `  - **${t.name}**`).join('\n')}
- **Never invent fake buttons, tabs, or non-existent settings.** If a staff member asks how to do something the app does not currently support, plainly and politely explain that LevelUp does not have that feature yet.
- Only refer to the real screens, buttons, and workflows documented below.

---

## 2. All School Routes Discovered (${routes.length} total)
All typical school addresses start with \`/{schoolId}/\`:
${routesText}

---

## 3. The 17 Admin Tabs & What They Do
${tabsText}

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
- **Student Kiosk personalization (\`/{schoolId}/student\`):**
  When student themes are enabled school-wide, students can tap the theme wand icon on their kiosk dashboard to customize their own background colors and stickers.
- **School-wide default theme:**
  Administrators can set the campus default look under **Admin → Branding & Identity**.

---

## 5. School Office Pillar (\`/{schoolId}/office\`)
The School Office handles administrative records separate from arcade rewards:
- **Discovered Modules (${officeModules.length} total):**
${officeText}
- **Key Office Workflows:**
  - **Billing & Tuitions:** View family balances, overdue invoices, and send automated payment reminder alerts via SMS and WhatsApp.
  - **Bulk Invoicing:** Generate and issue tuition or fee statements across an entire homeroom or school in one click.
  - **Report Card Grades / Marks:** Manage term grade sheets, missing assignment logs, and marks books.
  - **AI Import Preview:** Paste or upload student rosters, tuition logs, and grade books; the AI parser checks and reconciles duplicates before saving to live records.

---

## 6. School Library Pillar (\`/{schoolId}/library\`)
Dedicated circulation hub for books and media:
- **Discovered Modules (${libraryModules.length} total):**
${libraryText}
- **Key Library Workflows:**
  - **Catalog & ISBN Barcode Scan:** Hold a book up to the webcam or handheld scanner to autofill title, author, and book cover.
  - **Librarian Desk:** Rapid checkout and returns by scanning student ID cards and book barcodes.
  - **Student Self-Checkout Station (\`/{schoolId}/library/kiosk\`):** Dedicated fullscreen kiosk where students can borrow and return books independently.
  - **Multiple Libraries:** Create separate libraries for the main school collection and classroom reading shelves.

---

## 7. Permanent Student Kiosk (\`/{schoolId}/student\`)
- **Web address is hardwired:** The student check-in kiosk is always at \`/{schoolId}/student\`.
- **Features:** Touchscreen virtual keyboard, face recognition login, passcode sign-in, points balance check, coupon ticket redemption, and prize shopping.

---

## 8. General Rules & Policies
- Do not request, reveal, or store sensitive passwords, API keys, or student personal identifiers.
- If a staff member asks about a school configuration not listed here, advise checking with the school administrator.
`;
}

/**
 * Re-scans the app structure and writes the compiled guide to docs/staff-ai-product-knowledge.md.
 */
export function syncAppKnowledge(): ScanSummary {
  const { routes, officeModules, libraryModules } = scanAppStructure();
  const content = generateProductKnowledgeMarkdown();
  const filePath = path.join(process.cwd(), 'docs', 'staff-ai-product-knowledge.md');

  let success = true;
  try {
    writeFileSync(filePath, content, 'utf8');
  } catch (err) {
    console.error('Failed to sync app knowledge:', err);
    success = false;
  }

  const featuresCount = ADMIN_TABS.length + routes.length + officeModules.length + libraryModules.length + 15;

  return {
    success,
    timestamp: Date.now(),
    tabsCount: ADMIN_TABS.length,
    routesCount: routes.length,
    officeCount: officeModules.length,
    libraryCount: libraryModules.length,
    featuresCount,
    scannedRoutes: routes,
    scannedOfficeModules: officeModules,
    scannedLibraryModules: libraryModules,
  };
}
