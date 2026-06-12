import type { Database } from './types';
import { buildBalancedDemoRoster } from './demoSampleRosterBuilder';
import { DEMO_STUDENT_THEMES } from './demoStudentThemes';
import { withSampleCategoryColors } from './sampleCategoryColors';

const SCHOOL_ABC_CLASSES = [
  { id: 'sc1', name: 'Grade 5' },
  { id: 'sc2', name: 'Grade 6' },
  { id: 'sc3', name: 'Grade 7' },
  { id: 'sc4', name: 'Grade 8' },
  { id: 'sc5', name: 'Grade 9' },
  { id: 'sc6', name: 'Grade 10' },
  { id: 'sc7', name: 'Grade 11' },
  { id: 'sc8', name: 'Grade 12' },
  { id: 'sc9', name: 'Kindergarten A' },
  { id: 'sc10', name: 'Kindergarten B' },
] as const;

const SCHOOL_ABC_FIRST_NAMES = [
  'Emily', 'Jacob', 'Sophia', 'Michael', 'Emma', 'William', 'Olivia', 'James', 'Isabella', 'Alexander',
  'Mia', 'Ethan', 'Abigail', 'Benjamin', 'Charlotte', 'Daniel', 'Harper', 'Henry', 'Evelyn', 'Jackson',
  'Avery', 'David', 'Scarlett', 'Joseph', 'Victoria', 'Samuel', 'Grace', 'Lucas', 'Chloe', 'Mateo',
  'Zoe', 'Jayden', 'Lily', 'Elijah', 'Nora', 'Logan', 'Mila', 'Carter', 'Riley', 'Leo',
  'Aria', 'Luke', 'Layla', 'Owen', 'Stella', 'Jack', 'Penelope', 'Wyatt', 'Aubrey', 'Julian',
  'Madison', 'Aiden', 'Hannah', 'Mason', 'Addison', 'Liam', 'Brooklyn', 'Noah', 'Leah', 'Oliver',
] as const;

const SCHOOL_ABC_LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Hernandez', 'Lopez', 'Wilson', 'Anderson', 'Thomas', 'Jackson', 'White', 'Harris', 'Martin', 'Thompson',
  'Moore', 'Lee', 'Perez', 'Gonzalez', 'Clark', 'Lewis', 'Robinson', 'Walker', 'Hall', 'Allen',
  'Young', 'King', 'Wright', 'Scott', 'Green', 'Adams', 'Baker', 'Nelson', 'Hill', 'Ramirez',
  'Campbell', 'Mitchell', 'Roberts', 'Carter', 'Phillips', 'Evans', 'Turner', 'Parker', 'Collins', 'Edwards',
] as const;

const SCHOOL_ABC_CATEGORY_NAMES = [
  'Academics',
  'Good Behavior',
  'Helping Others',
  'School Spirit',
  'Attendance',
  'Extra Curricular',
  'Creativity',
  'Leadership',
  'Teamwork',
  'Problem Solving',
] as const;

const schoolAbcStudents = buildBalancedDemoRoster({
  classes: SCHOOL_ABC_CLASSES,
  minStudentsPerClass: 18,
  maxStudentsPerClass: 18,
  firstNames: SCHOOL_ABC_FIRST_NAMES,
  lastNames: SCHOOL_ABC_LAST_NAMES,
  categoryNames: SCHOOL_ABC_CATEGORY_NAMES,
}).map((student, index) =>
  index < DEMO_STUDENT_THEMES.length
    ? { ...student, theme: DEMO_STUDENT_THEMES[index] }
    : student,
);

export const SCHOOL_DATA: Omit<Database, 'passcode'> = {
  name: 'School ABC',
  students: schoolAbcStudents,
  classes: [...SCHOOL_ABC_CLASSES],
  teachers: [
    { id: 'st1', name: 'Mr. Smith', username: 'mrsmith', passcode: '1234' },
    { id: 'st2', name: 'Mrs. Jones', username: 'mrsjones', passcode: '1234' },
    { id: 'st3', name: 'Ms. Davis', username: 'msdavis', passcode: '1234' },
    { id: 'st4', name: 'Mr. Brown', username: 'mrbrown', passcode: '1234' },
    { id: 'st5', name: 'Mr. Wilson', username: 'mrwilson', passcode: '1234' },
    { id: 'st6', name: 'Mrs. Anderson', username: 'mrsanderson', passcode: '1234' },
    { id: 'st7', name: 'Ms. Thomas', username: 'msthomas', passcode: '1234' },
    { id: 'st8', name: 'Mr. Jackson', username: 'mrjackson', passcode: '1234' },
    { id: 'st9', name: 'Ms. Green', username: 'msgreen', passcode: '1234' },
    { id: 'st10', name: 'Mr. Walker', username: 'mrwalker', passcode: '1234' },
  ],
  categories: withSampleCategoryColors([
    { id: 'scat1', name: 'Academics', points: 50 },
    { id: 'scat2', name: 'Good Behavior', points: 20 },
    { id: 'scat3', name: 'Helping Others', points: 25 },
    { id: 'scat4', name: 'School Spirit', points: 15 },
    { id: 'scat5', name: 'Attendance', points: 10 },
    { id: 'scat6', name: 'Extra Curricular', points: 30 },
    { id: 'scat7', name: 'Creativity', points: 35 },
    { id: 'scat8', name: 'Leadership', points: 40 },
    { id: 'scat9', name: 'Teamwork', points: 15 },
    { id: 'scat10', name: 'Problem Solving', points: 45 },
  ]),
  coupons: [
    { id: '123123', code: '123123', category: 'Academics', value: 10, used: false, createdAt: Date.now() - 86400000 * 20, teacher: 'Mr. Smith' },
    { id: '234567', code: '234567', category: 'Good Behavior', value: 5, used: true, usedBy: '100100', usedAt: Date.now() - 86400000 * 2, createdAt: Date.now() - 86400000 * 30, teacher: 'Mrs. Jones' },
    { id: '345678', code: '345678', category: 'Helping Others', value: 15, used: false, createdAt: Date.now() - 86400000 * 10, teacher: 'Ms. Davis' },
    { id: '456789', code: '456789', category: 'School Spirit', value: 20, used: false, createdAt: Date.now() - 86400000 * 5, teacher: 'Mr. Brown' },
    { id: '567890', code: '567890', category: 'Attendance', value: 25, used: true, usedBy: '100103', usedAt: Date.now() - 86400000 * 1, createdAt: Date.now() - 86400000 * 40, teacher: 'Mr. Wilson' },
    { id: '678901', code: '678901', category: 'Extra Curricular', value: 30, used: false, createdAt: Date.now() - 86400000 * 15, teacher: 'Mrs. Anderson' },
    { id: '789012', code: '789012', category: 'Creativity', value: 35, used: false, createdAt: Date.now() - 86400000 * 25, teacher: 'Ms. Thomas' },
    { id: '890123', code: '890123', category: 'Leadership', value: 40, used: true, usedBy: '100110', usedAt: Date.now() - 86400000 * 7, createdAt: Date.now() - 86400000 * 50, teacher: 'Mr. Jackson' },
    { id: '901234', code: '901234', category: 'Teamwork', value: 45, used: false, createdAt: Date.now() - 86400000 * 3, teacher: 'Mr. Smith' },
    { id: '112233', code: '112233', category: 'Problem Solving', value: 50, used: false, createdAt: Date.now() - 86400000 * 12, teacher: 'Mrs. Jones' },
    { id: '223344', code: '223344', category: 'Academics', value: 100, used: true, usedBy: '100101', usedAt: Date.now() - 86400000 * 5, createdAt: Date.now() - 86400000 * 22, teacher: 'Mr. Smith' },
    { id: '334455', code: '334455', category: 'Good Behavior', value: 20, used: false, createdAt: Date.now() - 86400000 * 4, teacher: 'Mrs. Jones' },
    { id: '445566', code: '445566', category: 'Helping Others', value: 25, used: true, usedBy: '100104', usedAt: Date.now() - 86400000 * 3, createdAt: Date.now() - 86400000 * 18, teacher: 'Ms. Davis' },
    { id: '100001', code: '100001', category: 'Academics', value: 50, used: false, createdAt: Date.now() - 86400000 * 1, teacher: 'Mr. Smith' },
    { id: '100002', code: '100002', category: 'Good Behavior', value: 20, used: false, createdAt: Date.now() - 86400000 * 2, teacher: 'Mrs. Jones' },
    { id: '100003', code: '100003', category: 'Helping Others', value: 25, used: false, createdAt: Date.now() - 86400000 * 3, teacher: 'Ms. Davis' },
    { id: '100004', code: '100004', category: 'School Spirit', value: 15, used: false, createdAt: Date.now() - 86400000 * 4, teacher: 'Mr. Brown' },
    { id: '100005', code: '100005', category: 'Attendance', value: 10, used: false, createdAt: Date.now() - 86400000 * 5, teacher: 'Mr. Wilson' },
    { id: '100006', code: '100006', category: 'Extra Curricular', value: 30, used: false, createdAt: Date.now() - 86400000 * 6, teacher: 'Mrs. Anderson' },
    { id: '100007', code: '100007', category: 'Creativity', value: 35, used: false, createdAt: Date.now() - 86400000 * 7, teacher: 'Ms. Thomas' },
    { id: '100008', code: '100008', category: 'Leadership', value: 40, used: false, createdAt: Date.now() - 86400000 * 8, teacher: 'Mr. Jackson' },
    { id: '100009', code: '100009', category: 'Teamwork', value: 15, used: false, createdAt: Date.now() - 86400000 * 9, teacher: 'Ms. Green' },
    { id: '100010', code: '100010', category: 'Problem Solving', value: 45, used: false, createdAt: Date.now() - 86400000 * 10, teacher: 'Mr. Walker' },
    { id: '100011', code: '100011', category: 'Academics', value: 100, used: false, createdAt: Date.now() - 86400000 * 11, teacher: 'Mr. Smith' },
    { id: '100012', code: '100012', category: 'Good Behavior', value: 20, used: false, createdAt: Date.now() - 86400000 * 12, teacher: 'Mrs. Jones' },
    { id: '100013', code: '100013', category: 'Helping Others', value: 25, used: false, createdAt: Date.now() - 86400000 * 13, teacher: 'Ms. Davis' },
    { id: '100014', code: '100014', category: 'School Spirit', value: 15, used: false, createdAt: Date.now() - 86400000 * 14, teacher: 'Mr. Brown' },
    { id: '100015', code: '100015', category: 'Attendance', value: 10, used: false, createdAt: Date.now() - 86400000 * 15, teacher: 'Mr. Wilson' },
    { id: '100016', code: '100016', category: 'Extra Curricular', value: 30, used: false, createdAt: Date.now() - 86400000 * 16, teacher: 'Mrs. Anderson' },
    { id: '100017', code: '100017', category: 'Creativity', value: 35, used: false, createdAt: Date.now() - 86400000 * 17, teacher: 'Ms. Thomas' },
    { id: '100018', code: '100018', category: 'Leadership', value: 40, used: false, createdAt: Date.now() - 86400000 * 18, teacher: 'Mr. Jackson' },
    { id: '100019', code: '100019', category: 'Teamwork', value: 15, used: false, createdAt: Date.now() - 86400000 * 19, teacher: 'Ms. Green' },
    { id: '100020', code: '100020', category: 'Problem Solving', value: 45, used: false, createdAt: Date.now() - 86400000 * 20, teacher: 'Mr. Walker' },
  ],
  prizes: [
    { id: 'sp1', name: 'Sticker Pack', points: 50, icon: 'Smile', inStock: true },
    { id: 'sp2', name: 'Homework Pass', points: 100, icon: 'Scroll', inStock: true },
    { id: 'sp3', name: 'Pizza Slice', points: 200, icon: 'Pizza', inStock: true },
    { id: 'sp4', name: 'Movie Ticket', points: 500, icon: 'Ticket', inStock: true },
    { id: 'sp5', name: 'T-Shirt', points: 750, icon: 'Shirt', inStock: true },
    { id: 'sp6', name: 'Gift Card', points: 1000, icon: 'Gift', inStock: true },
    { id: 'sp7', name: 'Tablet', points: 5000, icon: 'Tablet', inStock: false },
    { id: 'sp8', name: 'Laptop', points: 10000, icon: 'Laptop', inStock: false },
    { id: 'sp9', name: 'Eraser Collection', points: 25, icon: 'Eraser', inStock: true },
    { id: 'sp10', name: 'Lunch with Teacher', points: 1200, icon: 'Sandwich', inStock: true },
    { id: 'sp11', name: 'DJ for a Day', points: 2500, icon: 'Music', inStock: true },
    { id: 'sp12', name: 'School Supply Set', points: 300, icon: 'Pen', inStock: true },
  ],
  updatedAt: Date.now(),
};
