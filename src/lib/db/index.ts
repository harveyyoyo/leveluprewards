/**
 * Barrel re-export for the db module.
 *
 * All existing `import { … } from '@/lib/db'` calls will continue to work
 * because this file re-exports everything from the domain modules.
 */

// Helpers (public API for non-module consumers)
export { evaluateAchievements, evaluateBadges, getPeriodKeys } from './helpers';

// Students
export {
  addStudent,
  updateStudent,
  deleteStudent,
  awardPointsToStudent,
  awardPointsToMultipleStudents,
  deductPointsFromMultipleStudents,
  purgeStudentProgress,
  purgeStudentsProgress,
  uploadStudents,
  importStudentsFromParsedRows,
} from './students';
export type { AwardPointsOptions } from './students';

// Lookup
export { lookupStudentId } from './lookup';

// Classes
export { addClass, updateClass, deleteClass, uploadClassesFromCsv, importClassNames } from './classes';

// Houses
export {
  addHouse,
  updateHouse,
  deleteHouse,
  seedHousePresets,
  seedHouseThemePack,
  syncHousePointsFromStudents,
  assignStudentsToHousesBalanced,
  assignStudentsToHousesRandom,
  listHouses,
} from './houses';

// Teachers
export { addTeacher, updateTeacher, deleteTeacher, uploadTeachersFromCsv, importTeachersFromParsedRows } from './teachers';

// Staff accounts (secretary / prize desk)
export { addStaffAccount, updateStaffAccount, deleteStaffAccount, staffAccountsCollectionRef } from './staffAccounts';

// Categories
export { addCategory, updateCategory, deleteCategory } from './categories';

// Prizes
export { addPrize, ensureUnifiedAiFunPrize, updatePrize, deletePrize, redeemPrize, togglePrizeFulfillment } from './prizes';

// Coupons
export { addCoupons, deleteCoupon, deleteCoupons, redeemCoupon } from './coupons';

// Achievements
export { addAchievement, updateAchievement, deleteAchievement } from './achievements';

// Bonus Spin Types
export { addBonusSpinType, updateBonusSpinType, deleteBonusSpinType } from './bonusSpinTypes';

// Badges
export { addBadge, updateBadge, deleteBadge } from './badges';

// Attendance
export {
  getAttendanceConfig,
  setAttendanceConfig,
  getTeacherAttendanceConfig,
  setTeacherAttendanceConfig,
  recordClassSignIn,
  listAttendanceLog,
  listTeacherAttendanceLog,
  ensureDefaultAttendanceRules,
} from './attendance';

// Homework
export {
  addHomeworkAssignment,
  deleteHomeworkAssignment,
  submitHomework,
  approveHomework,
} from './homework';

// Goals
export {
  addGoal,
  updateGoal,
  deleteGoal,
  fetchGoals,
} from './goals';

// Classroom points (Rewards-off persistence)
export { applyClassroomPointsToStudents } from './classroomPoints';
export type { ClassroomPointsMeta } from './classroomPoints';

