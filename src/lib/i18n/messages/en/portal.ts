const portal = {
  loading: 'Loading portal…',
  whereTo: 'Where to?',
  adminPortal: {
    title: 'Admin Portal',
    description: 'Manage students, classes, teachers, points, prizes and much more…',
  },
  teacherPortal: {
    title: 'Teacher Portal',
    descriptionRewards: 'Staff portal with teacher tabs — points, classes, prizes, and reports.',
    descriptionClassroom: 'Classroom Management — {section}, session tracking, and room display.',
    descriptionDefault: 'Staff portal for your school.',
  },
  studentKiosk: {
    title: 'Student Kiosk',
    description: 'Scan your card to redeem coupon codes, view points, and open the prize shop.',
  },
  parentPortal: {
    title: 'Parent Portal',
    description: "View your child's points, behavior notes, and today's attendance.",
  },
  roles: {
    couponPrinting: 'Coupon printing',
    prizeDesk: 'Prize desk',
    library: 'Library',
    schoolOffice: 'School Office',
    houses: 'Houses',
    reports: 'Reports',
    principal: 'Principal',
    divisionHead: 'Division head',
    teacher: 'Teacher',
  },
  adminPasscode: {
    title: 'Admin passcode',
    description: 'Enter the admin passcode for this school to open the admin dashboard.',
    missingTitle: 'Missing passcode',
    missingDescription: 'Enter the admin passcode to continue.',
    signInFailedTitle: 'Admin sign-in failed',
    signInFailedDescription:
      'Could not sign in with your Google account. Try again or use the admin passcode.',
    loginFailedTitle: 'Login failed',
    signInTitle: 'Admin sign-in',
  },
  staffSignIn: {
    title: 'Staff sign-in',
    description: 'Select your name and enter your passcode to open staff tools.',
    signInAsAdmin: 'Sign in as admin',
    selectName: 'Select your name',
    chooseName: 'Choose your name',
    noStaffAccounts: 'No staff accounts yet',
    noStaffHint:
      'Ask an admin to open Admin once (any tab) so the staff list publishes, or add the account under Admin → Teachers → Desk staff with Library catalog & checkouts checked.',
    missingInfoTitle: 'Missing info',
    missingInfoDescription: 'Select your name and enter a passcode to continue.',
    chooseAccountTitle: 'Choose a staff account from the list',
    chooseAccountDescription: 'Please select your name again.',
  },
};

export default { portal };
