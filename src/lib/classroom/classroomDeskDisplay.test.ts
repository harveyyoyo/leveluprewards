import { describe, expect, it } from 'vitest';
import { classroomDeskDisplayFromStudent } from './classroomDeskDisplay';
import type { Student } from '@/lib/types';

const student = {
  id: 's1',
  firstName: 'Maya',
  lastName: 'Lee',
  photoUrl: 'https://example.com/maya.jpg',
  points: 10,
} as Student;

describe('classroomDeskDisplayFromStudent photos', () => {
  it('includes the student photo by default', () => {
    expect(classroomDeskDisplayFromStudent(student).photoUrl).toBe('https://example.com/maya.jpg');
  });

  it('hides the photo when Desk display photos are off', () => {
    expect(
      classroomDeskDisplayFromStudent(student, undefined, { showStudentPhotos: false }).photoUrl,
    ).toBeUndefined();
  });
});
