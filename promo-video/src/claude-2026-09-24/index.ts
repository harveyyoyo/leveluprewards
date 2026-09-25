/**
 * Videos made by Claude on 2026-09-24 — one or more per LevelUp EDU pillar.
 * Shown in Remotion Studio under the "Claude-made-2026-09-24-Pillar-Spotlights" folder.
 *
 * Regenerate audio:
 *   node scripts/claude-2026-09-24/make-pillar-voices.mjs   (narration, needs OPENAI_API_KEY)
 *   node scripts/claude-2026-09-24/make-pillar-music.mjs    (music beds + sound effects)
 */
import type React from "react";
import { AttendanceBreakingNews, AttendanceCleanSquare, attendanceCleanTimeline, attendanceNewsTimeline } from "./attendance";
import { ClassroomBeforeAfter, ClassroomRetroArcade, classroomArcadeTimeline, classroomBeforeAfterTimeline } from "./classroom";
import { LibraryStorybook, LibraryTextMessages, libraryStorybookTimeline, libraryTextsTimeline } from "./library";
import { RewardsNeonSlam, RewardsTop3Countdown, rewardsCountdownTimeline, rewardsNeonTimeline } from "./rewards";
import { AttendanceMorningScanIn, scanInTimeline } from "./scanIn";
import { HousesCupRace, HousesSortingCeremony, housesRaceTimeline, housesSortingTimeline } from "./houses";
import { RaffleGameShow, raffleGameshowTimeline } from "./raffle";
import { StoryFamilyPortal, StoryHousesAssembly, StoryRewardsPrizeDay, assemblyTimeline, familyTimeline, prizedayTimeline } from "./storiesMore";
import { StoryLibraryCheckout, StoryLibraryTwoReturns, libraryCheckoutTimeline, twoReturnsTimeline } from "./storiesLibrary";
import { OfficeRapidAnswers, StoryOfficeAsk, StoryOfficeBus, StoryOfficePickup, officeAskTimeline, officeBusTimeline, officePickupTimeline, officeRapidTimeline } from "./storiesOffice";
import { StoryRewardsVending, vendingTimeline } from "./storiesVending";
import {
  StoryBadgeUnlocked,
  StoryLobbyTV,
  StoryMayaFirstWeek,
  StoryOfficeBilling,
  StoryPrincipalMorning,
  TEASER_FRAMES,
  badgeTimeline,
  billingTimeline,
  firstWeekTimeline,
  lobbyTimeline,
  makeTeaser,
  principalTimeline,
} from "./storiesBatch3";
import { asTallFrame } from "./tallFrame";
import {
  StoryBulletinBoard,
  StoryIdCardThemes,
  StorySeatingShuffle,
  StoryStaffNotifications,
  bulletinTimeline,
  idcardTimeline,
  seatingShuffleTimeline,
  staffNotifTimeline,
} from "./storiesBatch4";
import { ByTheNumbers, HowItWorksDemo, NUMBERS_TOTAL_FRAMES, howItWorksTimeline } from "./storiesTutorial";
import { StoryClassroomHallPass, StoryClassroomOneTap, hallpassTimeline, onetapTimeline } from "./storiesClassroom";

const TALL = { width: 1080, height: 1920 };
const SQUARE = { width: 1080, height: 1080 };
const WIDE = { width: 1920, height: 1080 };

type ClaudeVideo = {
  id: string;
  component: React.FC;
  durationInFrames: number;
  width: number;
  height: number;
};

/** Made on 2026-09-24. */
export const CLAUDE_2026_09_24_VIDEOS: ClaudeVideo[] = [
  { id: "Claude-2026-09-24-Rewards-NeonSlam", component: RewardsNeonSlam, durationInFrames: rewardsNeonTimeline.total, ...TALL },
  { id: "Claude-2026-09-24-Rewards-Top3Countdown", component: RewardsTop3Countdown, durationInFrames: rewardsCountdownTimeline.total, ...TALL },
  { id: "Claude-2026-09-24-Attendance-MorningScanIn", component: AttendanceMorningScanIn, durationInFrames: scanInTimeline.total, ...WIDE },
  { id: "Claude-2026-09-24-Attendance-CleanSquare", component: AttendanceCleanSquare, durationInFrames: attendanceCleanTimeline.total, ...SQUARE },
  { id: "Claude-2026-09-24-Attendance-BreakingNews", component: AttendanceBreakingNews, durationInFrames: attendanceNewsTimeline.total, ...WIDE },
  { id: "Claude-2026-09-24-Library-Storybook", component: LibraryStorybook, durationInFrames: libraryStorybookTimeline.total, ...WIDE },
  { id: "Claude-2026-09-24-Library-TextMessages", component: LibraryTextMessages, durationInFrames: libraryTextsTimeline.total, ...TALL },
  { id: "Claude-2026-09-24-Classroom-RetroArcade", component: ClassroomRetroArcade, durationInFrames: classroomArcadeTimeline.total, ...TALL },
  { id: "Claude-2026-09-24-Classroom-BeforeAfter", component: ClassroomBeforeAfter, durationInFrames: classroomBeforeAfterTimeline.total, ...SQUARE },
  { id: "Claude-2026-09-24-Houses-SortingCeremony", component: HousesSortingCeremony, durationInFrames: housesSortingTimeline.total, ...WIDE },
  { id: "Claude-2026-09-24-Houses-CupRace", component: HousesCupRace, durationInFrames: housesRaceTimeline.total, ...TALL },
  { id: "Claude-2026-09-24-Raffle-GameShow", component: RaffleGameShow, durationInFrames: raffleGameshowTimeline.total, ...SQUARE },
];

/** Made on 2026-09-25 — illustrated cartoon stories. */
export const CLAUDE_2026_09_25_VIDEOS: ClaudeVideo[] = [
  { id: "Claude-2026-09-25-Story-Classroom-OneTap", component: StoryClassroomOneTap, durationInFrames: onetapTimeline.total, ...WIDE },
  { id: "Claude-2026-09-25-Story-Classroom-HallPass", component: StoryClassroomHallPass, durationInFrames: hallpassTimeline.total, ...WIDE },
  { id: "Claude-2026-09-25-Story-Library-SelfCheckout", component: StoryLibraryCheckout, durationInFrames: libraryCheckoutTimeline.total, ...WIDE },
  { id: "Claude-2026-09-25-Story-Rewards-PrizeDay", component: StoryRewardsPrizeDay, durationInFrames: prizedayTimeline.total, ...WIDE },
  { id: "Claude-2026-09-25-Story-Houses-FridayAssembly", component: StoryHousesAssembly, durationInFrames: assemblyTimeline.total, ...WIDE },
  { id: "Claude-2026-09-25-Story-Family-ProudParent", component: StoryFamilyPortal, durationInFrames: familyTimeline.total, ...WIDE },
  { id: "Claude-2026-09-25-Office-AskTheOffice", component: StoryOfficeAsk, durationInFrames: officeAskTimeline.total, ...WIDE },
  { id: "Claude-2026-09-25-Office-EarlyPickup", component: StoryOfficePickup, durationInFrames: officePickupTimeline.total, ...WIDE },
  { id: "Claude-2026-09-25-Tall-Office-RapidAnswers", component: OfficeRapidAnswers, durationInFrames: officeRapidTimeline.total, ...TALL },
  { id: "Claude-2026-09-25-Tall-Office-BusRadar", component: StoryOfficeBus, durationInFrames: officeBusTimeline.total, ...TALL },
  { id: "Claude-2026-09-25-Tall-Rewards-VendingMachine", component: StoryRewardsVending, durationInFrames: vendingTimeline.total, ...TALL },
  // Tall (phone) versions of the cartoon stories — same scenes, camera follows the action.
  { id: "Claude-2026-09-25-Tall-Attendance-MorningScanIn", component: AttendanceMorningScanIn, durationInFrames: scanInTimeline.total, ...TALL },
  { id: "Claude-2026-09-25-Tall-Rewards-PrizeDay", component: StoryRewardsPrizeDay, durationInFrames: prizedayTimeline.total, ...TALL },
  { id: "Claude-2026-09-25-Tall-Library-SelfCheckout", component: StoryLibraryCheckout, durationInFrames: libraryCheckoutTimeline.total, ...TALL },
  { id: "Claude-2026-09-25-Tall-Classroom-OneTap", component: StoryClassroomOneTap, durationInFrames: onetapTimeline.total, ...TALL },
  { id: "Claude-2026-09-25-Tall-Classroom-HallPass", component: StoryClassroomHallPass, durationInFrames: hallpassTimeline.total, ...TALL },
  { id: "Claude-2026-09-25-Tall-Houses-FridayAssembly", component: StoryHousesAssembly, durationInFrames: assemblyTimeline.total, ...TALL },
  { id: "Claude-2026-09-25-Tall-Family-ProudParent", component: StoryFamilyPortal, durationInFrames: familyTimeline.total, ...TALL },
  { id: "Claude-2026-09-25-Tall-Office-AskTheOffice", component: StoryOfficeAsk, durationInFrames: officeAskTimeline.total, ...TALL },
  { id: "Claude-2026-09-25-Tall-Office-EarlyPickup", component: StoryOfficePickup, durationInFrames: officePickupTimeline.total, ...TALL },
  // Batch 3
  { id: "Claude-2026-09-25-Story-Maya-FirstWeek", component: StoryMayaFirstWeek, durationInFrames: firstWeekTimeline.total, ...WIDE },
  { id: "Claude-2026-09-25-Story-Displays-LobbyTV", component: StoryLobbyTV, durationInFrames: lobbyTimeline.total, ...WIDE },
  { id: "Claude-2026-09-25-Story-AllPillars-PrincipalsMorning", component: StoryPrincipalMorning, durationInFrames: principalTimeline.total, ...WIDE },
  { id: "Claude-2026-09-25-Office-Billing", component: StoryOfficeBilling, durationInFrames: billingTimeline.total, ...WIDE },
  { id: "Claude-2026-09-25-Tall-Rewards-BadgeUnlocked", component: StoryBadgeUnlocked, durationInFrames: badgeTimeline.total, ...TALL },
  { id: "Claude-2026-09-25-Tall-Maya-FirstWeek", component: StoryMayaFirstWeek, durationInFrames: firstWeekTimeline.total, ...TALL },
  { id: "Claude-2026-09-25-Tall-Displays-LobbyTV", component: StoryLobbyTV, durationInFrames: lobbyTimeline.total, ...TALL },
  { id: "Claude-2026-09-25-Tall-AllPillars-PrincipalsMorning", component: StoryPrincipalMorning, durationInFrames: principalTimeline.total, ...TALL },
  { id: "Claude-2026-09-25-Tall-Office-Billing", component: StoryOfficeBilling, durationInFrames: billingTimeline.total, ...TALL },
  { id: "Claude-2026-09-25-Story-Library-BeMoreLikeAva", component: StoryLibraryTwoReturns, durationInFrames: twoReturnsTimeline.total, ...WIDE },
  { id: "Claude-2026-09-25-Tall-Library-BeMoreLikeAva", component: StoryLibraryTwoReturns, durationInFrames: twoReturnsTimeline.total, ...TALL },
  // Notification-overlay alternative for the tall layout (owner also asked to see this one)
  { id: "Claude-2026-09-25-Notify-Attendance-MorningScanIn", component: asTallFrame(AttendanceMorningScanIn, scanInTimeline, "Maya's Morning Scan-In", "Attendance"), durationInFrames: scanInTimeline.total, ...TALL },
  { id: "Claude-2026-09-25-Notify-Rewards-PrizeDay", component: asTallFrame(StoryRewardsPrizeDay, prizedayTimeline, "Prize Day", "Rewards"), durationInFrames: prizedayTimeline.total, ...TALL },
  { id: "Claude-2026-09-25-Notify-Classroom-OneTap", component: asTallFrame(StoryClassroomOneTap, onetapTimeline, "One Tap, Big Smile", "Classroom"), durationInFrames: onetapTimeline.total, ...TALL },
  { id: "Claude-2026-09-25-Notify-Maya-FirstWeek", component: asTallFrame(StoryMayaFirstWeek, firstWeekTimeline, "Maya's First Week", "Rewards"), durationInFrames: firstWeekTimeline.total, ...TALL },
  { id: "Claude-2026-09-25-Notify-Office-AskTheOffice", component: asTallFrame(StoryOfficeAsk, officeAskTimeline, "Ask the Office", "Office"), durationInFrames: officeAskTimeline.total, ...TALL },
  { id: "Claude-2026-09-25-Notify-Library-BeMoreLikeAva", component: asTallFrame(StoryLibraryTwoReturns, twoReturnsTimeline, "Be More Like Ava", "Library"), durationInFrames: twoReturnsTimeline.total, ...TALL },
];

/** Made on 2026-09-25 — batch 4: reusing existing sets to cover more of the app. */
export const CLAUDE_2026_09_25_BATCH4: ClaudeVideo[] = [
  { id: "Claude-2026-09-25-Story-Displays-BulletinBoard", component: StoryBulletinBoard, durationInFrames: bulletinTimeline.total, ...WIDE },
  { id: "Claude-2026-09-25-Story-Rewards-IdCardThemes", component: StoryIdCardThemes, durationInFrames: idcardTimeline.total, ...WIDE },
  { id: "Claude-2026-09-25-Story-Office-StaffNotifications", component: StoryStaffNotifications, durationInFrames: staffNotifTimeline.total, ...WIDE },
  { id: "Claude-2026-09-25-Story-Classroom-SeatingShuffle", component: StorySeatingShuffle, durationInFrames: seatingShuffleTimeline.total, ...WIDE },
];

/** Made on 2026-09-25 — non-cartoon promo styles: a software demo/tutorial, and a pure stats infographic. */
export const CLAUDE_2026_09_25_OTHER_STYLES: ClaudeVideo[] = [
  { id: "Claude-2026-09-25-Demo-HowItWorks", component: HowItWorksDemo, durationInFrames: howItWorksTimeline.total, ...WIDE },
  { id: "Claude-2026-09-25-Demo-ByTheNumbers", component: ByTheNumbers, durationInFrames: NUMBERS_TOTAL_FRAMES, ...WIDE },
];

/** Made on 2026-09-25 — 6-second teasers cut from the stories above. */
export const CLAUDE_2026_09_25_TEASERS: ClaudeVideo[] = [
  { id: "Claude-2026-09-25-Teaser-MorningScanIn", component: makeTeaser(AttendanceMorningScanIn, scanInTimeline.at("points").start - 40, "Attendance", "CHECKED IN. +10!"), durationInFrames: TEASER_FRAMES, ...TALL },
  { id: "Claude-2026-09-25-Teaser-VendingMachine", component: makeTeaser(StoryRewardsVending, vendingTimeline.at("drop").start - 40, "Rewards", "POINTS YOU CAN HOLD"), durationInFrames: TEASER_FRAMES, ...TALL },
  { id: "Claude-2026-09-25-Teaser-PrizeDay", component: makeTeaser(StoryRewardsPrizeDay, prizedayTimeline.at("redeem").start, "Rewards", "REAL PRIZES"), durationInFrames: TEASER_FRAMES, ...TALL },
  { id: "Claude-2026-09-25-Teaser-OneTap", component: makeTeaser(StoryClassroomOneTap, onetapTimeline.at("tap").start + 10, "Classroom", "ONE TAP = POINTS"), durationInFrames: TEASER_FRAMES, ...TALL },
  { id: "Claude-2026-09-25-Teaser-BadgeUnlocked", component: makeTeaser(StoryBadgeUnlocked, badgeTimeline.at("unlock").start - 30, "Rewards", "LEVEL UP!"), durationInFrames: TEASER_FRAMES, ...TALL },
  { id: "Claude-2026-09-25-Teaser-FirstWeek", component: makeTeaser(StoryMayaFirstWeek, firstWeekTimeline.at("fri").start, "Rewards", "FIRST BADGE!"), durationInFrames: TEASER_FRAMES, ...TALL },
  { id: "Claude-2026-09-25-Teaser-CupRace", component: makeTeaser(HousesCupRace, housesRaceTimeline.at("race").start + housesRaceTimeline.at("race").cues[1], "Houses", "WHO WINS THE CUP?"), durationInFrames: TEASER_FRAMES, ...TALL },
  { id: "Claude-2026-09-25-Teaser-SortingCeremony", component: makeTeaser(HousesSortingCeremony, housesSortingTimeline.at("reveal").start, "Houses", "WHICH HOUSE?"), durationInFrames: TEASER_FRAMES, ...WIDE },
];
