/** UTF-8 CSV templates for bulk roster onboarding (download in browser). */

export const ROSTER_CLASSES_TEMPLATE = `Class Name
Room 101
Room 102
Grade 5A
`;

export const ROSTER_TEACHERS_TEMPLATE = `Full Name,Username,Passcode
Jane Doe,janedoe,1234
Alex Kim,alexkim,5678
`;

export const ROSTER_STUDENTS_TEMPLATE = `First Name,Last Name,Class Name
Sam,Taylor,Room 101
Jordan,Lee,Grade 5A
`;

export function downloadUtf8Csv(filename: string, contents: string) {
  const blob = new Blob([contents], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
