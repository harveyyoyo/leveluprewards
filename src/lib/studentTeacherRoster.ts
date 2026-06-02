import type { Class, Student } from '@/lib/types';

/** Adds the homeroom class primary teacher to `teacherIds` when the student has a class assignment. */
export function ensureStudentHasClassPrimaryTeacher(student: Student, classes: Class[]): Student {
  const classId = (student.classId || '').trim();
  if (!classId) return student;

  const cls = classes.find((c) => c.id === classId);
  const teacherId = (cls?.primaryTeacherId || '').trim();
  if (!teacherId) return student;

  const current = student.teacherIds || [];
  if (current.includes(teacherId)) return student;

  return { ...student, teacherIds: [...current, teacherId] };
}
