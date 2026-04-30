/** Category key prefix for homework payouts (teacher Homework Rewards + approveHomework). */
export const HOMEWORK_REWARD_CATEGORY_PREFIX = 'Homework: ' as const;

export function homeworkRewardCategoryKey(title: string): string {
  return `${HOMEWORK_REWARD_CATEGORY_PREFIX}${title}`;
}
