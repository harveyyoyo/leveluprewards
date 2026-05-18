import type { TabWalkthroughConfig } from './types';

const ADMIN_TAB_WALKTHROUGHS: Record<string, TabWalkthroughConfig> = {
  students: {
    title: 'Students tab',
    subtitle: 'Roster, kiosk access, and bulk tools',
    steps: [
      {
        title: 'Add your first student',
        checklist: [
          'Click New Student and enter name, class, and Student ID.',
          'Assign at least one class so the kiosk knows their group.',
          'Optional: link teachers if points should be scoped.',
        ],
        example: { heading: 'Quick test', rows: ['One student in "Room 101" with a memorable ID like 1001.'] },
      },
      {
        title: 'Import or print IDs',
        checklist: [
          'Use Import CSV for large rosters, or Import CSV (map columns) when headers do not match.',
          'Print ID cards from the toolbar when students are ready for the kiosk.',
        ],
      },
      {
        title: 'Bulk selection',
        checklist: [
          'Use Select visible or row checkboxes to pick students (filter by class first if needed).',
          'Bulk bar: print IDs, purge points & badges, delete, move class, teachers, and kiosk splash/style toggles.',
          'Per-row ⚡ still purges one student; Activity and badges stay per-student.',
        ],
      },
    ],
  },
  classes: {
    title: 'Classes tab',
    subtitle: 'Groups students belong to',
    steps: [
      {
        title: 'Create a class',
        checklist: [
          'Click Add Class and name it (grade, room, or subject).',
          'Set Primary teacher so attendance and reports know who owns the class.',
        ],
      },
      {
        title: 'Assign students',
        checklist: [
          'Edit students in the Students tab and pick this class.',
          'Deleting a class unassigns students but does not delete them.',
        ],
      },
    ],
  },
  teachers: {
    title: 'Faculty tab',
    subtitle: 'Teachers, budgets, and desk staff',
    steps: [
      {
        title: 'Add a teacher',
        checklist: [
          'Click Add Teacher with display name and sign-in credentials.',
          'Set a point budget and period if teachers have spending limits.',
        ],
      },
      {
        title: 'Desk staff accounts',
        checklist: [
          'Use Staff accounts for prize-desk or secretary logins that are not full teachers.',
          'Each account gets its own username and passcode.',
        ],
      },
    ],
  },
  prizes: {
    title: 'Prizes tab',
    subtitle: 'Rewards shop inventory',
    steps: [
      {
        title: 'Create a reward',
        checklist: [
          'Click Wizard for a guided new item, or New Item for the full editor.',
          'Set point cost, stock, and which teachers or classes can see it.',
        ],
      },
      {
        title: 'Shelf cards and redemption',
        checklist: [
          'Print prize cards so the desk can scan barcodes at pickup.',
          'Students redeem from the kiosk; fulfill orders in Teacher → Redemptions.',
        ],
      },
    ],
  },
  categories: {
    title: 'Points tab',
    subtitle: 'Categories and printable coupons',
    steps: [
      {
        title: 'Define categories',
        checklist: [
          'Each category is a behavior or subject you reward (e.g. Participation).',
          'Set default point values used when printing coupons.',
        ],
      },
      {
        title: 'Manual and printed points',
        checklist: [
          'Use Manually Add or Deduct Points for direct awards or deductions without printing coupons.',
          'Use Print coupons below to generate scannable sheets (10 or 30 per page).',
          'Faculty can also print from their Points tab using the same categories.',
          'Students redeem codes at the kiosk to bank points.',
        ],
      },
    ],
  },
  reports: {
    title: 'Reports tab',
    subtitle: 'School-wide exports and summaries',
    steps: [
      {
        title: 'Pick a report type',
        checklist: [
          'Choose summary, roster, balances, redemptions, coupons, or prizes.',
          'Filter by class, teacher, or date range before exporting.',
        ],
      },
      {
        title: 'Print or download',
        checklist: [
          'Use Print for a paper copy or Download CSV for spreadsheets.',
          'Homework reports appear when homework rewards are enabled.',
        ],
      },
    ],
  },
  insights: {
    title: 'Insights tab',
    subtitle: 'Analytics and coupon inventory',
    steps: [
      {
        title: 'Read the dashboard',
        checklist: [
          'Scan totals for redemptions, active students, and top categories.',
          'Use trends to see whether rewards activity is growing or quiet.',
        ],
      },
      {
        title: 'Review coupon inventory',
        checklist: [
          'Available lists unused codes; Redeemed shows what students already cashed in.',
          'Search by code or filter to audit a specific print run.',
          'Print new sheets from Admin → Points.',
        ],
      },
    ],
  },
  attendance: {
    title: 'Attendance tab',
    subtitle: 'Periods, sign-in points, and teacher rules',
    steps: [
      {
        title: 'Turn attendance on',
        checklist: [
          'Enable Attendance in Settings (gear) if the kiosk should record sign-ins.',
          'Add Universal Periods with 24-hour start and end times.',
        ],
      },
      {
        title: 'Reward rules',
        checklist: [
          'Prefer teacher reward rules over legacy class-period assignments.',
          'Use the in-tab Example walkthrough for a full sample setup.',
        ],
      },
    ],
  },
  halloffame: {
    title: 'Hall of Fame tab',
    subtitle: 'Class and school leaderboards',
    steps: [
      {
        title: 'Configure display',
        checklist: [
          'Choose whether leaders show by period or lifetime points.',
          'Pick which classes appear on the public leaderboard display.',
        ],
      },
    ],
  },
  bulletinboard: {
    title: 'Bulletin tab',
    subtitle: 'Announcements on kiosk and displays',
    steps: [
      {
        title: 'Post a message',
        checklist: [
          'Create a headline and body students see on supported screens.',
          'Set start and end dates so old posts expire automatically.',
        ],
      },
    ],
  },
  library: {
    title: 'Library tab',
    subtitle: 'Checkout items with UPC or name',
    steps: [
      {
        title: 'Add library items',
        checklist: [
          'Use Add Item for title, barcode, author, shelf, and other catalog fields.',
          'Print barcode stickers and affix one to each physical copy.',
        ],
      },
      {
        title: 'Returns',
        checklist: [
          'Students scan the same barcode to check out or return on the portal.',
          'Force-return stuck checkouts from the admin list when a book comes back.',
        ],
      },
    ],
  },
  bonuspoints: {
    title: 'Bonus Points tab',
    subtitle: 'Achievements beyond daily coupons',
    steps: [
      {
        title: 'Create achievements',
        checklist: [
          'Define name, point value, and icon for one-time or repeatable awards.',
          'Teachers or admins grant achievements from student activity views.',
        ],
      },
    ],
  },
  'category-badges': {
    title: 'Badges tab',
    subtitle: 'Category-linked badge milestones',
    steps: [
      {
        title: 'Design badges',
        checklist: [
          'Tie each badge to a point category and threshold (e.g. 50 pts in Math).',
          'Students earn badges automatically when totals cross the threshold.',
        ],
      },
    ],
  },
  goals: {
    title: 'Goals tab',
    subtitle: 'Student targets and progress',
    steps: [
      {
        title: 'Set school goals',
        checklist: [
          'Create goals with titles, targets, and optional class scope.',
          'Teachers track progress from their Goals tab when enabled.',
        ],
      },
    ],
  },
  notifications: {
    title: 'Notifications tab',
    subtitle: 'Alerts for staff and families',
    steps: [
      {
        title: 'Configure channels',
        checklist: [
          'Choose which events trigger in-app or email notifications.',
          'Test with a small group before school-wide announcements.',
        ],
      },
    ],
  },
  branding: {
    title: 'Branding tab',
    subtitle: 'Logo, colors, and kiosk look',
    steps: [
      {
        title: 'Upload logo',
        checklist: [
          'Upload a square-friendly logo; preview how it appears on cards and kiosk.',
          'Pick display mode (full logo vs icon) for tight layouts.',
        ],
      },
      {
        title: 'Themes',
        checklist: [
          'Open Theme Generator to build palettes and backgrounds.',
          'Apply a theme school-wide from the generator or saved themes list.',
        ],
      },
    ],
  },
  integrations: {
    title: 'Integrations tab',
    subtitle: 'External systems and APIs',
    steps: [
      {
        title: 'Connect services',
        checklist: [
          'Review each integration card for setup steps and required keys.',
          'Enable only the integrations your school actively uses.',
        ],
      },
    ],
  },
  'student-portal': {
    title: 'Student portal tab',
    subtitle: 'Home access for students and families',
    steps: [
      {
        title: 'Enable the portal',
        checklist: [
          'Turn on Student portal in Add more if the tab is hidden.',
          'Copy the portal URL for newsletters or QR codes on posters.',
        ],
      },
      {
        title: 'Passcodes and unlock',
        checklist: [
          'Set per-student passcodes when required; use Unlock after too many failures.',
          'Reset browser clears a stuck device without changing the passcode.',
        ],
      },
    ],
  },
  backups: {
    title: 'Backups tab',
    subtitle: 'Developer snapshots (developer login only)',
    steps: [
      {
        title: 'Create a snapshot',
        checklist: [
          'Click Create backup before major imports or term rollovers.',
          'Download the JSON file to store off-site.',
        ],
      },
      {
        title: 'Restore carefully',
        checklist: [
          'Restore replaces school data; confirm no one is actively using the site.',
        ],
      },
    ],
  },
};

export function getAdminTabWalkthrough(tabId: string): TabWalkthroughConfig | null {
  return ADMIN_TAB_WALKTHROUGHS[tabId] ?? null;
}
