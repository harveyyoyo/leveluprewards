import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { ClassroomCommandCenter } from './ClassroomCommandCenter';
import type { Class, Student, Teacher } from '@/lib/types';

const mocks = vi.hoisted(() => ({
  settings: { payClassroom: true, payRewards: true, enableTeacherBudgets: true },
  panel: vi.fn(), picker: vi.fn(), award: vi.fn(), updateTeacher: vi.fn(),
}));
vi.mock('@/components/providers/SettingsProvider', () => ({ useSettings: () => ({ settings: mocks.settings, updateSettings: vi.fn() }) }));
vi.mock('@/components/AppProvider', () => ({ useAppContext: () => ({ teacherDocId: 'teacher', userName: 'Teacher', updateTeacher: mocks.updateTeacher }) }));
vi.mock('@/firebase', () => ({ useFirestore: () => ({}) }));
vi.mock('@/hooks/useTodayAttendanceMap', () => ({ useTodayAttendanceMap: () => new Map() }));
vi.mock('@/hooks/useActiveBathroomPasses', () => ({ useActiveBathroomPasses: () => new Map() }));
vi.mock('@/lib/classroom/classroomPointsClient', () => ({ awardClassroomPoints: mocks.award }));
vi.mock('@/components/points/ClassroomPointsPanel', () => ({ ClassroomPointsPanel: (props: any) => { mocks.panel(props); return <div>Chart</div>; } }));
vi.mock('./RandomStudentPickerModal', () => ({ RandomStudentPickerModal: (props: any) => { mocks.picker(props); return null; } }));
vi.mock('./ClassroomScreenPairModal', () => ({ ClassroomScreenPairModal: () => null }));
vi.mock('./BehaviorTimelinePanel', () => ({ BehaviorTimelinePanel: () => null }));
vi.mock('./ClassroomRoomDisplaySection', () => ({ ClassroomRoomDisplaySection: () => null }));
vi.mock('./ClassAwardsLiveSettingsSection', () => ({ ClassAwardsLiveSettingsSection: () => null }));
vi.mock('@/app/[schoolId]/admin/sections/ClassroomSetupWizard', () => ({ ClassroomSetupWizardTrigger: () => null }));
vi.mock('@/app/[schoolId]/admin/sections/AdminRaffleTab', () => ({ AdminRaffleTab: () => <div>Raffle controls</div> }));

const classes = [
  { id: 'c1', name: 'Class A', primaryTeacherId: 'other' },
  { id: 'c2', name: 'Class B', primaryTeacherId: 'other' },
] as Class[];
const students = [
  { id: 's1', firstName: 'Maya', classId: 'c1', teacherIds: ['teacher'] },
  { id: 's2', firstName: 'Leo', classId: 'c2', teacherIds: ['other'] },
] as Student[];
const teachers = [{ id: 'teacher', monthlyBudget: 5, spentThisMonth: 4 }] as Teacher[];
const props = { schoolId: 'school', variant: 'teacher' as const, classes, students, teachers };
const panel = () => mocks.panel.mock.calls.at(-1)![0];
const picker = () => mocks.picker.mock.calls.at(-1)![0];

describe('classroom command center wiring', () => {
  beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); sessionStorage.clear(); mocks.settings.payRewards = true; mocks.award.mockResolvedValue({ success: true, count: 1 }); });

  it('keeps classes assigned through student rosters and passes the teacher budget', () => {
    render(<ClassroomCommandCenter {...props} />);
    expect(panel().classes.map((c: Class) => c.id)).toEqual(['c1']);
    expect(panel().students.map((s: Student) => s.id)).toEqual(['s1']);
    expect(panel().budgetOptions).toMatchObject({ isAdmin: false, currentTeacher: teachers[0] });
    expect(screen.getByRole('link', { name: 'Student Mirror' }).getAttribute('href')).toContain('scope=teacher');
  });

  it('preserves leadership access and recovers when the selected class is removed', () => {
    const view = render(<ClassroomCommandCenter {...props} schoolWideAccess />);
    expect(panel().classes).toHaveLength(2);
    expect(panel().storageScope).toBe('admin');
    view.rerender(<ClassroomCommandCenter {...props} classes={[classes[1]]} schoolWideAccess />);
    expect(panel().initialClassId).toBe('c2');
    expect(panel().students[0].id).toBe('s2');
  });

  it('rejects random awards above the available budget and records successful spend', async () => {
    render(<ClassroomCommandCenter {...props} />);
    await expect(picker().onAward('s1', 5, 'Effort')).rejects.toThrow('Insufficient');
    expect(mocks.award).not.toHaveBeenCalled();
    await act(async () => { await picker().onAward('s1', 1, 'Effort'); });
    expect(mocks.award).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ rewardsMode: true, studentIds: ['s1'] }));
    expect(mocks.updateTeacher).toHaveBeenCalledWith(expect.objectContaining({ spentThisMonth: 5 }));
  });

  it('uses classroom balances when Rewards is off', async () => {
    mocks.settings.payRewards = false;
    render(<ClassroomCommandCenter {...props} variant="admin" />);
    await act(async () => { await picker().onAward('s1', 5, 'Effort'); });
    expect(mocks.award).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ rewardsMode: false }));
    expect(mocks.updateTeacher).not.toHaveBeenCalled();
  });

  it('opens raffle controls and follows section changes without remounting', () => {
    const view = render(<ClassroomCommandCenter {...props} initialTab="raffle" />);
    expect(screen.getByText('Raffle controls')).toBeInTheDocument();
    view.rerender(<ClassroomCommandCenter {...props} initialTab="behavior" />);
    expect(screen.getByRole('tab', { name: 'Behavior Log' })).toHaveAttribute('data-state', 'active');
    expect(screen.queryByText('Raffle controls')).toBeNull();
  });
});
