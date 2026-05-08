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

export const ROSTER_STUDENTS_TEMPLATE = `First Name,Middle Name,Last Name,Nickname,Birthday,Class Name,Parent Email,Parent Phone,Student Email,Student Phone
Sam,,Taylor,,2014-09-22,Room 101,parent@example.com,555-123-4567,,
Jordan,,Lee,Jo,2013-02-05,Grade 5A,,,jordan.lee@student.edu,555-000-0000
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
