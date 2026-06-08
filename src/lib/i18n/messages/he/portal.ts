const portal = {
  loading: 'טוען פורטל…',
  whereTo: 'לאן?',
  adminPortal: {
    title: 'פורטל מנהל',
    description: 'ניהול תלמידים, כיתות, מורים, נקודות, פרסים ועוד…',
  },
  teacherPortal: {
    title: 'פורטל צוות',
    descriptionRewards: 'פורטל צוות עם לשוניות מורה — נקודות, כיתות, פרסים ודוחות.',
    descriptionClassroom: 'ניהול כיתה — {section}, מעקב מפגש ותצוגת חדר.',
    descriptionDefault: 'פורטל צוות לבית הספר שלכם.',
  },
  studentKiosk: {
    title: 'קיוסק תלמידים',
    description: 'סרקו את הכרטיס כדי לממש קופונים, לצפות בנקודות ולפתוח חנות הפרסים.',
  },
  parentPortal: {
    title: 'פורטל הורים',
    description: 'צפייה בנקודות הילד/ה, הערות התנהגות ונוכחות היום.',
  },
  roles: {
    couponPrinting: 'הדפסת קופונים',
    prizeDesk: 'דלפק פרסים',
    library: 'ספרייה',
    schoolOffice: 'משרד בית הספר',
    houses: 'בתים',
    reports: 'דוחות',
    principal: 'מנהל/ת',
    divisionHead: 'ראש מחלקה',
    teacher: 'מורה',
  },
  adminPasscode: {
    title: 'קוד מנהל',
    description: 'הזינו את קוד המנהל של בית הספר כדי לפתוח את לוח הבקרה.',
    missingTitle: 'חסר קוד גישה',
    missingDescription: 'הזינו את קוד המנהל כדי להמשיך.',
    signInFailedTitle: 'כניסת מנהל נכשלה',
    signInFailedDescription:
      'לא ניתן להיכנס עם חשבון Google. נסו שוב או השתמשו בקוד המנהל.',
    loginFailedTitle: 'הכניסה נכשלה',
    signInTitle: 'כניסת מנהל',
  },
  staffSignIn: {
    title: 'כניסת צוות',
    description: 'בחרו את שמכם והזינו קוד גישה כדי לפתוח כלי צוות.',
    signInAsAdmin: 'כניסה כמנהל',
    selectName: 'בחרו את שמכם',
    chooseName: 'בחרו את שמכם',
    noStaffAccounts: 'אין עדיין חשבונות צוות',
    noStaffHint:
      'בקשו ממנהל לפתוח את המנהל פעם אחת (כל לשונית) כדי לפרסם את רשימת הצוות, או הוסיפו חשבון תחת מנהל → מורים → צוות דלפק עם סימון ספרייה ומעקב השאלות.',
    missingInfoTitle: 'חסר מידע',
    missingInfoDescription: 'בחרו את שמכם והזינו קוד גישה כדי להמשיך.',
    chooseAccountTitle: 'בחרו חשבון צוות מהרשימה',
    chooseAccountDescription: 'בחרו שוב את שמכם.',
  },
};

export default { portal };
