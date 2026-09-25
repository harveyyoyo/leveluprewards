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
import { StoryFamilyPortal, StoryHousesAssembly, StoryLibraryCheckout, StoryRewardsPrizeDay, assemblyTimeline, familyTimeline, libraryCheckoutTimeline, prizedayTimeline } from "./storiesMore";
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
];
