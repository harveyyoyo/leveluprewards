import type { FeatureSegmentId } from "./featurePromoCatalog";



export type FeaturePromoVariantId = "epic" | "warm" | "pro" | "hype" | "story";



export type FeatureScriptCue = {

  id: string;

  /** Montage segment this line accompanies (undefined = intro/outro only) */

  segmentId?: FeatureSegmentId;

  text: string;

};



export type FeaturePromoScriptVariant = {

  id: FeaturePromoVariantId;

  compositionId: string;

  label: string;

  description: string;

  ttsVoice:

    | "cedar"

    | "marin"

    | "ash"

    | "coral"

    | "nova"

    | "fable"

    | "echo"

    | "onyx"

    | "sage";

  /** gpt-4o-mini-tts delivery hint */

  ttsInstructions: string;

  musicVolume: number;

  musicStyle: "calm" | "upbeat" | "cinematic" | "default";

  /** Optional MP3 in promo-video/public/ */

  musicSrc?: string;

  copy: {

    introEyebrow: string;

    introTagline: string;

    montageTitle: string;

    montageSubtitle: string;

    outroHeadline: string;

    outroSubline: string;

  };

  cues: FeatureScriptCue[];

};



const SEGMENT_IDS = [

  "kiosk",

  "idCards",

  "themes",

  "prizes",

  "coupons",

  "raffle",

  "houses",

  "hallOfFame",

  "notifications",

  "bulletin",

  "library",

  "badges",

  "analytics",

  "attendance",

] as const satisfies readonly FeatureSegmentId[];



function segmentCues(

  lines: Record<(typeof SEGMENT_IDS)[number], string>,

): FeatureScriptCue[] {

  return SEGMENT_IDS.map((segmentId) => ({

    id: segmentId,

    segmentId,

    text: lines[segmentId],

  }));

}



export const FEATURE_PROMO_VARIANTS: FeaturePromoScriptVariant[] = [

  {

    id: "epic",

    compositionId: "FeaturePromoEpic",

    label: "Epic / cinematic",

    description: "Grand, sweeping language — good for assemblies and district reels.",

    ttsVoice: "marin",

    ttsInstructions:

      "You are narrating a school product film for educators. Speak naturally, like a thoughtful colleague — not a radio announcer. Measured pace, warm tone, light emphasis on product names.",

    musicVolume: 0.24,

    musicStyle: "cinematic",

    copy: {

      introEyebrow: "Feature showcase",

      introTagline: "Every major feature in one platform",

      montageTitle: "Features that power your school",

      montageSubtitle: "Kiosk · Rewards · Admin tools · Displays",

      outroHeadline: "Built for real schools",

      outroSubline: "Scan-first · Live sync · Built for students",

    },

    cues: [

      {

        id: "intro",

        text: "This is a feature tour of LevelUp — every major tool schools use for rewards, recognition, and motivation.",

      },

      ...segmentCues({

        kiosk: "Students step up to the kiosk, scan in, and see their world of points instantly.",

        idCards: "Every student gets a digital ID card you can preview, print, and scan at the kiosk.",

        themes: "Create a student card theme — type a prompt, choose colors and gradients, and watch the ID card preview update live.",

        prizes: "The prize shop turns effort into something they can hold in their hands.",

        coupons: "Teachers print reward coupons without breaking stride in the classroom.",

        raffle: "Raffles transform everyday points into electric, school-wide moments.",

        houses: "House competitions unite grades in friendly rivalry that lasts all year.",

        hallOfFame: "The Hall of Fame celebrates leaders on a display the whole school can see.",

        notifications: "Smart notifications keep staff ahead of inventory, milestones, and surprises.",

        bulletin: "The bulletin board broadcasts pride, news, and momentum.",

        library: "Library checkout weaves reading into the same rewards story.",

        badges: "Badges and goals give every student a path to be recognized.",

        analytics: "Insights reveal what is working — class by class, week by week.",

        attendance: "Attendance ties the kiosk to how your school already runs the day.",

      }),

      {

        id: "outro",

        text: "LevelUp — one platform, countless ways to motivate. Welcome to what school rewards can be.",

      },

    ],

  },

  {

    id: "warm",

    compositionId: "FeaturePromoWarm",

    label: "Warm / friendly",

    description: "Conversational tone for principals sharing with families.",

    ttsVoice: "coral",

    ttsInstructions:

      "Friendly educator talking to parents at an open house. Conversational, relaxed, slight smile — never salesy or robotic.",

    musicVolume: 0.22,

    musicStyle: "calm",

    copy: {

      introEyebrow: "Feature showcase",

      introTagline: "See what LevelUp includes",

      montageTitle: "Features your school will use",

      montageSubtitle: "Student · Teacher · Admin",

      outroHeadline: "Ready for your school?",

      outroSubline: "Demo schools available · Scan-first kiosk",

    },

    cues: [

      {

        id: "intro",

        text: "Hi — this is a feature tour of LevelUp: the tools for points, prizes, ID cards, raffles, and more.",

      },

      ...segmentCues({

        kiosk: "Kids sign in at the kiosk in seconds, usually with a quick scan.",

        idCards: "You can preview and print student ID cards right from the admin portal.",

        themes: "Design themes in minutes — describe the look, adjust colors, and preview it on student ID cards.",

        prizes: "They pick prizes they actually care about from the shop.",

        coupons: "Teachers print coupons when you want to reward on the spot.",

        raffle: "Raffles are a fun Friday ritual — tickets from points they already earned.",

        houses: "Houses help homerooms and teams cheer for each other.",

        hallOfFame: "Hall of Fame boards make shout-outs visible in the cafeteria or gym.",

        notifications: "Notifications mean fewer surprises about low stock or big milestones.",

        bulletin: "Bulletin boards keep families and students in the loop.",

        library: "Library tools track checkouts right beside rewards.",

        badges: "Badges and goals give quiet students a way to shine.",

        analytics: "Reports help you see who is engaging and where to help.",

        attendance: "Attendance options connect sign-in to how you already take roll.",

      }),

      {

        id: "outro",

        text: "That is LevelUp — kind to kids, clear for teachers, and calm for the front office. We would love to show your school.",

      },

    ],

  },

  {

    id: "pro",

    compositionId: "FeaturePromoPro",

    label: "Professional / clear",

    description: "Straightforward feature tour for decision-makers.",

    ttsVoice: "sage",

    ttsInstructions:

      "Clear product walkthrough for school administrators. Steady pace, plain language, trustworthy — like a demo on a video call, not a TV ad.",

    musicVolume: 0.22,

    musicStyle: "default",

    copy: {

      introEyebrow: "Feature overview",

      introTagline: "Module-by-module walkthrough",

      montageTitle: "Platform features",

      montageSubtitle: "14 features · One system",

      outroHeadline: "Deploy with confidence",

      outroSubline: "Role-based access · Audit-friendly",

    },

    cues: [

      {

        id: "intro",

        text: "This walkthrough covers each LevelUp feature — kiosk, ID cards, themes, prizes, raffles, and admin modules.",

      },

      ...segmentCues({

        kiosk: "Kiosk sign-in supports card, type, and scan workflows.",

        idCards: "Student ID cards with admin preview, print layouts, and scan-ready barcodes.",

        themes: "The theme designer builds card styles from a prompt and color palette with a live preview.",

        prizes: "Configurable prize catalog with inventory awareness.",

        coupons: "Teachers issue printable coupons tied to point rules.",

        raffle: "Scheduled raffles with ticket rules and winner workflows.",

        houses: "House sorting, team totals, and display options.",

        hallOfFame: "Public leaderboard displays for lifetime and period rankings.",

        notifications: "Notification policies for staff, inventory, and milestones.",

        bulletin: "Digital bulletin surfaces for announcements and media.",

        library: "Library module for loans, fees, and return incentives.",

        badges: "Achievement badges, goals, and category thresholds.",

        analytics: "Administrative insights across students and classes.",

        attendance: "Attendance capture integrated with kiosk sign-in.",

      }),

      {

        id: "outro",

        text: "LevelUp reduces tool sprawl while keeping students on scan-first hardware. Request a walkthrough for your district.",

      },

    ],

  },

  {

    id: "hype",

    compositionId: "FeaturePromoHype",

    label: "High energy",

    description: "Punchy lines for social clips and conference loops.",

    ttsVoice: "ash",

    ttsInstructions:

      "Upbeat school promo for social feeds. Short phrases, natural energy — still human, not shouting or over-produced.",

    musicVolume: 0.26,

    musicStyle: "upbeat",

    copy: {

      introEyebrow: "FEATURE TOUR",

      introTagline: "Everything LevelUp does",

      montageTitle: "Feature stack",

      montageSubtitle: "Real screens · Real tools",

      outroHeadline: "Go all in",

      outroSubline: "Kiosk · Raffle · HoF · More",

    },

    cues: [

      {

        id: "intro",

        text: "Feature tour time — every LevelUp module, fast — kiosk, cards, themes, prizes, raffles, admin tools.",

      },

      ...segmentCues({

        kiosk: "Kiosk check-in — boom — balance on screen.",

        idCards: "ID cards — preview, print, scan — done.",

        themes: "Build a theme — prompt, gradient, colors — card preview updates as you go.",

        prizes: "Prize shop — scroll, tap, redeem.",

        coupons: "Teachers — print coupons — done.",

        raffle: "Raffle week — tickets flying — winners loud.",

        houses: "Houses — team colors — scoreboards lit.",

        hallOfFame: "Hall of Fame — legends on the wall.",

        notifications: "Notifications — ping — staff stays ahead.",

        bulletin: "Bulletin — headlines — hype in the hallway.",

        library: "Library — check out — earn while you read.",

        badges: "Badges — unlock — flex the streak.",

        analytics: "Insights — charts — know what hits.",

        attendance: "Attendance — sign in — counted.",

      }),

      {

        id: "outro",

        text: "Stack it all with LevelUp — scan-first, synced live, built for schools that want energy. Let us run.",

      },

    ],

  },

  {

    id: "story",

    compositionId: "FeaturePromoStory",

    label: "Story arc",

    description: "Day-in-the-life narrative from morning kiosk to admin wrap-up.",

    ttsVoice: "marin",

    ttsInstructions:

      "Tell a gentle day-in-the-life story for teachers. Natural pacing, reflective beats, like explaining your school day to a colleague.",

    musicVolume: 0.23,

    musicStyle: "calm",

    copy: {

      introEyebrow: "Feature walkthrough",

      introTagline: "How the pieces connect",

      montageTitle: "Features in action",

      montageSubtitle: "Students first · Then the rest",

      outroHeadline: "Same system, whole day",

      outroSubline: "Motivation that lasts past homeroom",

    },

    cues: [

      {

        id: "intro",

        text: "Walk through the features with us — from the morning kiosk to the admin tools that run the building.",

      },

      ...segmentCues({

        kiosk: "By first period, students are scanning in at the kiosk.",

        idCards: "The office already printed ID cards — students tap the same badge every day.",

        themes: "An admin creates the card theme once — colors and gradients — and every student ID matches.",

        prizes: "At lunch, someone cashes points for a prize they picked last week.",

        coupons: "A teacher prints a coupon for kindness caught in the hallway.",

        raffle: "Friday assembly — raffle drums roll — tickets from all week.",

        houses: "House points tick up after the pep rally challenge.",

        hallOfFame: "The Hall of Fame slide rotates new names at dismissal.",

        notifications: "Meanwhile, notifications flag a low prize shelf before Monday.",

        bulletin: "The bulletin board tells tomorrow’s spirit theme.",

        library: "Library returns earn a quiet bonus point before bus call.",

        badges: "A badge unlocks for the reader who finished the series.",

        analytics: "After buses leave, admin scans insights before heading home.",

        attendance: "Attendance records from the kiosk are already in sync.",

      }),

      {

        id: "outro",

        text: "One day, one thread — LevelUp ties the moments together so motivation does not reset at 3 p.m.",

      },

    ],

  },

];



export const FEATURE_PROMO_VARIANT_BY_ID = Object.fromEntries(

  FEATURE_PROMO_VARIANTS.map((v) => [v.id, v]),

) as Record<FeaturePromoVariantId, FeaturePromoScriptVariant>;


