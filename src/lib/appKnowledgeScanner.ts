import { writeFileSync, existsSync } from 'fs';
import path from 'path';

export interface ScannedTabInfo {
  id: string;
  name: string;
  description: string;
}

export const ADMIN_TABS: ScannedTabInfo[] = [
  { id: 'welcome', name: 'Welcome', description: 'Overview of school activities, quick statistics tiles (total students, classes, active staff, listed prizes), and recent actions.' },
  { id: 'students', name: 'Students', description: 'Student roster management: add, edit, or remove students, nicknames, grade levels, face recognition enrollment, and printable ID cards.' },
  { id: 'classes', name: 'Classes', description: 'Class groups, homeroom configurations, and assigning main and co-teachers to each class.' },
  { id: 'teachers', name: 'Teachers & staff', description: 'Staff directory, teacher accounts, desk personnel roles (secretary, prize clerk, librarian, reports), and role permissions.' },
  { id: 'prizes', name: 'Rewards', description: 'Prize shop management, point pricing, inventory stock, prize desk redemptions fulfillment, and student prize orders.' },
  { id: 'coupons', name: 'Coupons', description: 'Generate and print reward tickets (single-use or keep-and-scan reusable slips), point values, and reprint inventory.' },
  { id: 'classroom', name: 'Classroom', description: 'Class awards live monitor, interactive seating chart for awarding points during lessons, and bathroom pass timer.' },
  { id: 'reports', name: 'Reports', description: 'Historical points activity logs, student account statements, attendance logs, and downloadable CSV exports.' },
  { id: 'insights', name: 'Analytics', description: 'School-wide engagement statistics, points earned vs spent over time, top categories, and participation metrics.' },
  { id: 'attendance', name: 'Attendance', description: 'Daily attendance tracking, class sign-in logs, kiosk attendance check-in, and timezone configurations.' },
  { id: 'displays', name: 'Displays', description: 'Unified hallway TV studio (Displays Realm) for designing Hall of Fame podiums, Smart Screens, and Bulletin Boards.' },
  { id: 'library', name: 'Library', description: 'Library management hub: circulation desk, catalog with ISBN camera scan, student self-checkout, and multi-library setups.' },
  { id: 'bonuspoints', name: 'Bonus Points', description: 'Milestone point thresholds where students unlock bonus points and prize wheel spins.' },
  { id: 'category-badges', name: 'Badges', description: 'Category-specific achievement badges and digital trophies unlocked when students reach goals.' },
  { id: 'goals', name: 'Goals', description: 'Target goals for individual classrooms or the entire school to work toward shared celebrations.' },
  { id: 'houses', name: 'Houses', description: 'House system management: house sorting ceremony, house parents, leaderboards, and house point totals.' },
  { id: 'notifications', name: 'Notifications', description: 'Automated notification engine for parent and staff alerts on points, prizes, and attendance via email, SMS, and WhatsApp.' },
];

export const APP_PILLARS = [
  {
    name: 'School Office (/{schoolId}/office)',
    description: 'Separate administrative area for student roster records, classes & schedules, report card grades/marks, and family billing invoices with automated SMS/WhatsApp reminders.',
  },
  {
    name: 'School Library (/{schoolId}/library)',
    description: 'Dedicated circulation desk, book catalog with camera scan, shelf audits, label printing, and dedicated student kiosk at /{schoolId}/library/kiosk.',
  },
  {
    name: 'Permanent Student Kiosk (/{schoolId}/student)',
    description: 'Hardwired check-in kiosk (always at /{schoolId}/student). Students scan badges or face, enter passcodes via touch keyboard, redeem coupons, and spend points on prizes.',
  },
  {
    name: 'Teacher Portal (/{schoolId}/teacher)',
    description: 'Teacher tool hub for awarding classroom points, managing seating charts, printing coupons, and accessing pinned school programs.',
  },
];

export function generateProductKnowledgeMarkdown(): string {
  const tabsList = ADMIN_TABS.map((t, idx) => `${idx + 1}. **${t.name}** (\`${t.id}\`): ${t.description}`).join('\n');
  const pillarsList = APP_PILLARS.map((p) => `- **${p.name}**: ${p.description}`).join('\n');

  return `# Staff AI help — product knowledge

**Maintainers:** When you ship or materially change a **staff-facing** feature, this file is loaded dynamically on each request by \`src/app/api/staff-help-chat/route.ts\`.

---

You are the in-app support assistant for **levelUp EDU**, a school rewards web app (Next.js + Firebase).

Your job is to answer questions **only** about how to use this product: navigation, workflows, troubleshooting steps, and where features live. Be concise, friendly, and professional.

## Critical Accuracy Rules (Never Hallucinate)
- **There is NO tab named "Dashboard" in Admin.** The first overview tab on the Admin screen is named **Welcome**.
- **The exact 17 tabs on the Admin screen** are strictly:
${ADMIN_TABS.map((t) => `  - **${t.name}**`).join('\n')}
- **Never invent or guess fake buttons, tabs, or settings.** If a user asks how to do something the app does not currently support, plainly and politely state that LevelUp does not have that feature yet.
- Do NOT make up steps from other software. Only refer to the real screens and tabs documented here.

## Main Product Pillars
${pillarsList}

## Admin Screen Tabs (Exact list of 17 tabs)
${tabsList}

## Permanent Student Kiosk web address (Hardwired)
- The student check-in kiosk is always located at **\`/{schoolId}/student\`**.
- Never rename, move, or nest this web address. Bookmarks, QR codes, badges, and printed signs rely on this exact link.

## Library Station & Kiosk
- Dedicated kiosk link: **\`/{schoolId}/library/kiosk\`**.
- Multiple libraries supported: Each library has its own catalog, circulation desk, and checkout limits.

## School Office
- Location: **\`/{schoolId}/office\`**.
- Features: Family billing with automated invoice reminders via SMS and WhatsApp, term grades/marks sheets, custom school fields, and AI import preview.

## Displays Studio (Hallway TVs)
- Location: **\`/{schoolId}/displays-realm\`** or via Admin/Teacher Displays tab.
- Offers three templates: Hall of Fame podiums, Smart Screen (clock, weather, leaderboards), and Bulletin Board announcements.

## General Rules
- Do not request or store student or staff personal data.
- If unsure about a custom school configuration, suggest checking with the school administrator.
`;
}

/**
 * Re-scans and saves the product knowledge markdown file to disk.
 */
export function syncAppKnowledge(): { success: boolean; tabsCount: number; timestamp: number } {
  const content = generateProductKnowledgeMarkdown();
  const filePath = path.join(process.cwd(), 'docs', 'staff-ai-product-knowledge.md');
  try {
    writeFileSync(filePath, content, 'utf8');
    return {
      success: true,
      tabsCount: ADMIN_TABS.length,
      timestamp: Date.now(),
    };
  } catch (err) {
    console.error('Failed to sync app knowledge:', err);
    return {
      success: false,
      tabsCount: ADMIN_TABS.length,
      timestamp: Date.now(),
    };
  }
}
