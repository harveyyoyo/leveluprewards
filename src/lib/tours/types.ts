export type IntroStep = {
  id: string;
  title: string;
  body: string;
  /** Primary route where this step applies. */
  onRoute?: string;
  extraRoutes?: string[];
  /** Element to highlight (`data-intro-tour` value). */
  target?: string;
  /** Next stays disabled until pathname matches. */
  advanceOnRoute?: string;
  /** Next stays disabled until the highlight target exists. */
  requireTarget?: boolean;
  /** Next stays disabled until this target exists (e.g. signed-in dashboard). */
  advanceOnTarget?: string;
  /** Shown when `advanceOnRoute` is not satisfied yet. */
  navigateHint?: string;
  /** Open this staff sidebar tab when the step is shown (admin/teacher). */
  selectTab?: string;
  /** Open this content section tab when the step is shown (e.g. print coupons). */
  selectSection?: string;
  /** Optional follow-up tour offered on the final step. */
  offerNextTour?: 'features' | 'teacher-features' | 'student-features';
};
