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
  uploadStudents,
} from './students';

// Lookup
export { lookupStudentId } from './lookup';

// Classes
export { addClass, updateClass, deleteClass, uploadClassesFromCsv } from './classes';

// Teachers
export { addTeacher, updateTeacher, deleteTeacher, uploadTeachersFromCsv } from './teachers';

// Staff accounts (secretary / prize desk)
export { addStaffAccount, updateStaffAccount, deleteStaffAccount, staffAccountsCollectionRef } from './staffAccounts';

// Categories
export { addCategory, updateCategory, deleteCategory } from './categories';

// Prizes
export { addPrize, updatePrize, deletePrize, redeemPrize, togglePrizeFulfillment } from './prizes';

// Coupons
export { addCoupons, deleteCoupon, redeemCoupon } from './coupons';

// Achievements
export { addAchievement, updateAchievement, deleteAchievement } from './achievements';

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
} from './attendance';
