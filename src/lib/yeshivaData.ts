import type { Database } from './types';
import { buildBalancedDemoRoster } from './demoSampleRosterBuilder';
import { DEMO_STUDENT_THEMES_YESHIVA_ORDER } from './demoStudentThemes';
import { withSampleCategoryColors } from './sampleCategoryColors';

const YESHIVA_CLASSES = [
  { id: 'yc1', name: 'Shiur Aleph' },
  { id: 'yc2', name: 'Shiur Bet' },
  { id: 'yc3', name: 'Shiur Gimmel' },
  { id: 'yc4', name: 'Shiur Daled' },
  { id: 'yc5', name: 'Shiur Hei' },
  { id: 'yc6', name: 'Shiur Vov' },
  { id: 'yc7', name: 'Shiur Zayin' },
  { id: 'yc8', name: 'Shiur Ches' },
  { id: 'yc9', name: 'Gan Aleph' },
  { id: 'yc10', name: 'Gan Bet' },
] as const;

const YESHIVA_FIRST_NAMES = [
  'Shmuel', 'Avi', 'Yosef', 'David', 'Moshe', 'Dovid', 'Chaim', 'Yaakov', 'Yisrael', 'Menachem',
  'Eliezer', 'Baruch', 'Aryeh', 'Zev', 'Tzvi', 'Akiva', 'Yehuda', 'Shlomo', 'Gedalya', 'Nachman',
  'Daniel', 'Ephraim', 'Ezra', 'Gavriel', 'Hershel', 'Levi', 'Mordechai', 'Noach', 'Reuven', 'Simcha',
  'Yitzchak', 'Shraga', 'Naftali', 'Benyamin', 'Eitan', 'Ilan', 'Meir', 'Shimon', 'Yechiel', 'Zalman',
  'Asher', 'Binyamin', 'Eliyahu', 'Gershon', 'Isser', 'Mendel', 'Nechemia', 'Pinchas', 'Shaya', 'Yonoson',
  'Refael', 'Shalom', 'Ovadia', 'Chaim', 'Uri', 'Eli', 'Yair', 'Noam', 'Ari', 'Itamar',
] as const;

const YESHIVA_LAST_NAMES = [
  'Goldstein', 'Schwartz', 'Cohen', 'Levi', 'Katz', 'Weiss', 'Friedman', 'Rosenberg', 'Adler', 'Gross',
  'Klein', 'Stein', 'Feldman', 'Hoffman', 'Roth', 'Berger', 'Green', 'Jacobs', 'Fisher', 'Pollack',
  'Kaplan', 'Shapiro', 'Silver', 'Goldman', 'Mandel', 'Stern', 'Blau', 'Singer', 'Farkas', 'Teitelbaum',
  'Fishman', 'Meisels', 'Glick', 'Schumer', 'Weissman', 'Rothman', 'Silber', 'Neuman', 'Landau', 'Goldberg',
  'Kornbluth', 'Zimmerman', 'Wolfson', 'Braun', 'Werner', 'Perlman', 'Moskowitz', 'Horowitz', 'Frankel', 'Mizrachi',
] as const;

const YESHIVA_CATEGORY_NAMES = [
  'Middos Tovos',
  'Shteiging',
  "Gemara B'iyun",
  'Mishna Mastery',
  'Tefillah',
  'Chesed',
  'Avos Ubanim',
  'Chavrusa Learning',
] as const;

const yeshivaStudents = buildBalancedDemoRoster({
  classes: YESHIVA_CLASSES,
  minStudentsPerClass: 20,
  maxStudentsPerClass: 25,
  firstNames: YESHIVA_FIRST_NAMES,
  lastNames: YESHIVA_LAST_NAMES,
  categoryNames: YESHIVA_CATEGORY_NAMES,
}).map((student, index) =>
  index < DEMO_STUDENT_THEMES_YESHIVA_ORDER.length
    ? { ...student, theme: DEMO_STUDENT_THEMES_YESHIVA_ORDER[index] }
    : student,
);

export const YESHIVA_DATA: Omit<Database, 'passcode'> = {
  name: 'Yeshiva Demo',
  students: yeshivaStudents,
  classes: [...YESHIVA_CLASSES],
  teachers: [
    { id: 'yt1', name: 'Rabbi Cohen', username: 'rabbicohen', passcode: '1234' },
    { id: 'yt2', name: 'Rabbi Levi', username: 'rabbilevi', passcode: '1234' },
    { id: 'yt3', name: 'Rav Goldberg', username: 'ravgoldberg', passcode: '1234' },
    { id: 'yt4', name: 'Rosh Yeshiva', username: 'roshyeshiva', passcode: '1234' },
    { id: 'yt5', name: 'Rabbi Epstein', username: 'rabbiepstein', passcode: '1234' },
    { id: 'yt6', name: 'Rabbi Friedman', username: 'rabbifriedman', passcode: '1234' },
    { id: 'yt7', name: 'Rabbi Klein', username: 'rabbiklein', passcode: '1234' },
    { id: 'yt8', name: 'Rabbi Stern', username: 'rabbiStern', passcode: '1234' },
    { id: 'yt9', name: 'Rabbi Weiss', username: 'rabbiweiss', passcode: '1234' },
    { id: 'yt10', name: 'Rabbi Horowitz', username: 'rabbihorowitz', passcode: '1234' },
  ],
  categories: withSampleCategoryColors([
    { id: 'ycat1', name: 'Middos Tovos', points: 100 },
    { id: 'ycat2', name: 'Shteiging', points: 50 },
    { id: 'ycat3', name: 'Gemara B\'iyun', points: 75 },
    { id: 'ycat4', name: 'Mishna Mastery', points: 40 },
    { id: 'ycat5', name: 'Tefillah', points: 10 },
    { id: 'ycat6', name: 'Chesed', points: 150 },
    { id: 'ycat7', name: 'Avos Ubanim', points: 25 },
    { id: 'ycat8', name: 'Chavrusa Learning', points: 20 },
  ]),
  coupons: [
    { id: '101010', code: '101010', value: 10, category: 'Tefillah', teacher: 'Rabbi Cohen', used: false, createdAt: Date.now(), description: 'For excellent concentration during morning prayers.' },
    { id: '505050', code: '505050', value: 50, category: 'Shteiging', teacher: 'Rabbi Levi', used: false, createdAt: Date.now() - 86400000, description: 'For asking a great question in shiur.' },
    { id: '100100', code: '100100', value: 100, category: 'Gemara B\'iyun', teacher: 'Rav Goldberg', used: false, createdAt: Date.now() - 86400000 * 2, description: 'For preparing well for shiur.' },
    { id: '757575', code: '757575', value: 75, category: 'Mishna Mastery', teacher: 'Rabbi Cohen', used: false, createdAt: Date.now() - 86400000 * 3, description: 'For completing the weekly Mishna assignment.' },
    { id: '200200', code: '200200', value: 200, category: 'Middos Tovos', teacher: 'Rosh Yeshiva', used: false, createdAt: Date.now() - 86400000 * 4, description: 'For exceptional character and integrity.' },
    { id: '150150', code: '150150', value: 150, category: 'Chesed', teacher: 'Rabbi Levi', used: true, createdAt: Date.now() - 86400000 * 5, usedBy: '100101', usedAt: Date.now() - 86400000 * 2 },
    { id: '100000', code: '100000', value: 100, category: 'Avos Ubanim', teacher: 'Admin', used: false, createdAt: Date.now() - 86400000 * 6, description: 'For attending Avos Ubanim learning program.' },
    { id: '500500', code: '500500', value: 50, category: 'Chavrusa Learning', teacher: 'Rabbi Epstein', used: false, createdAt: Date.now() - 86400000 * 7, description: 'For productive learning with a chavrusa.' },
    { id: '200001', code: '200001', value: 10, category: 'Tefillah', teacher: 'Rabbi Cohen', used: false, createdAt: Date.now(), description: 'For excellent concentration during morning prayers.' },
    { id: '200002', code: '200002', value: 50, category: 'Shteiging', teacher: 'Rabbi Levi', used: false, createdAt: Date.now(), description: 'For asking a great question in shiur.' },
    { id: '200003', code: '200003', value: 100, category: 'Gemara B\'iyun', teacher: 'Rav Goldberg', used: false, createdAt: Date.now(), description: 'For preparing well for shiur.' },
    { id: '200004', code: '200004', value: 75, category: 'Mishna Mastery', teacher: 'Rabbi Cohen', used: false, createdAt: Date.now(), description: 'For completing the weekly Mishna assignment.' },
    { id: '200005', code: '200005', value: 200, category: 'Middos Tovos', teacher: 'Rosh Yeshiva', used: false, createdAt: Date.now(), description: 'For exceptional character and integrity.' },
    { id: '200006', code: '200006', value: 150, category: 'Chesed', teacher: 'Rabbi Levi', used: false, createdAt: Date.now(), description: 'For helping another student.' },
    { id: '200007', code: '200007', value: 25, category: 'Avos Ubanim', teacher: 'Admin', used: false, createdAt: Date.now(), description: 'For attending Avos Ubanim learning program.' },
    { id: '200008', code: '200008', value: 20, category: 'Chavrusa Learning', teacher: 'Rabbi Epstein', used: false, createdAt: Date.now(), description: 'For productive learning with a chavrusa.' },
    { id: '200009', code: '200009', value: 10, category: 'Tefillah', teacher: 'Rabbi Cohen', used: false, createdAt: Date.now(), description: 'For excellent concentration during morning prayers.' },
    { id: '200010', code: '200010', value: 50, category: 'Shteiging', teacher: 'Rabbi Levi', used: false, createdAt: Date.now(), description: 'For asking a great question in shiur.' },
    { id: '200011', code: '200011', value: 100, category: 'Gemara B\'iyun', teacher: 'Rav Goldberg', used: false, createdAt: Date.now(), description: 'For preparing well for shiur.' },
    { id: '200012', code: '200012', value: 75, category: 'Mishna Mastery', teacher: 'Rabbi Cohen', used: false, createdAt: Date.now(), description: 'For completing the weekly Mishna assignment.' },
    { id: '200013', code: '200013', value: 200, category: 'Middos Tovos', teacher: 'Rosh Yeshiva', used: false, createdAt: Date.now(), description: 'For exceptional character and integrity.' },
    { id: '200014', code: '200014', value: 150, category: 'Chesed', teacher: 'Rabbi Levi', used: false, createdAt: Date.now(), description: 'For helping another student.' },
    { id: '200015', code: '200015', value: 25, category: 'Avos Ubanim', teacher: 'Admin', used: false, createdAt: Date.now(), description: 'For attending Avos Ubanim learning program.' },
    { id: '200016', code: '200016', value: 20, category: 'Chavrusa Learning', teacher: 'Rabbi Epstein', used: false, createdAt: Date.now(), description: 'For productive learning with a chavrusa.' },
    { id: '200017', code: '200017', value: 50, category: 'Shteiging', teacher: 'Rabbi Levi', used: false, createdAt: Date.now(), description: 'For asking a great question in shiur.' },
    { id: '200018', code: '200018', value: 100, category: 'Gemara B\'iyun', teacher: 'Rav Goldberg', used: false, createdAt: Date.now(), description: 'For preparing well for shiur.' },
    { id: '200019', code: '200019', value: 75, category: 'Mishna Mastery', teacher: 'Rabbi Cohen', used: false, createdAt: Date.now(), description: 'For completing the weekly Mishna assignment.' },
    { id: '200020', code: '200020', value: 200, category: 'Middos Tovos', teacher: 'Rosh Yeshiva', used: false, createdAt: Date.now(), description: 'For exceptional character and integrity.' },
  ],
  prizes: [
    { id: 'yp1', name: 'Small Sefer', points: 250, icon: 'BookOpen', inStock: true },
    { id: 'yp2', name: 'Candy from the Rebbe', points: 100, icon: 'Candy', inStock: true },
    { id: 'yp3', name: 'Pizza Slice', points: 500, icon: 'Pizza', inStock: true },
    { id: 'yp4', name: 'Large Sefer (Artscroll)', points: 1500, icon: 'BookMarked', inStock: true },
    { id: 'yp5', name: 'Day off from chores', points: 1000, icon: 'Home', inStock: true },
    { id: 'yp6', name: 'Ice Cream in town', points: 750, icon: 'IceCream', inStock: false },
    { id: 'yp7', name: 'Shabbos Guest for a Meal', points: 2000, icon: 'Users', inStock: true },
    { id: 'yp8', name: 'Seforim Gift Card', points: 3000, icon: 'Gift', inStock: true },
    { id: 'yp9', name: 'Trip with the Rebbe', points: 10000, icon: 'Bus', inStock: true },
  ],
  updatedAt: Date.now(),
};
