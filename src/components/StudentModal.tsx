import { ChangeEvent, useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAppContext } from '@/components/AppProvider';
import { useToast } from '@/hooks/use-toast';
import type { Student, Class, Teacher, StudentTheme } from '@/lib/types';
import { useFirestore, useFunctions } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { useSettings } from '@/components/providers/SettingsProvider';
import { ScrollArea } from './ui/scroll-area';
import { Checkbox } from './ui/checkbox';

import { httpsCallable } from 'firebase/functions';
import { ThemeGeneratorModal } from './ThemeGeneratorModal';
import { AdminFaceEnrollmentPanel } from './AdminFaceEnrollmentPanel';
import { Wand2, Trash2, Loader2 } from 'lucide-react';
import { ImageCropper } from './ImageCropper';
import { cn, getStudentNickname } from '@/lib/utils';
import { encryptField, decryptField } from '@/lib/crypto';
import { WELCOME_GREETING_STYLES } from '@/components/WelcomeGreeting';
import { STUDENT_WELCOME_STYLES_LIVE } from '@/lib/studentWelcome';
import { normalizeStudentTheme } from '@/lib/themeContrast';

interface StudentModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  student: Student | null;
  allStudents: Student[];
  allClasses: Class[];
  allTeachers: Teacher[];
}

export function StudentModal({
  isOpen,
  setIsOpen,
  student,
  allStudents,
  allClasses,
  allTeachers,
}: StudentModalProps) {
  const { addStudent, updateStudent, schoolId } = useAppContext();
  const { settings } = useSettings();
  const firestore = useFirestore();
  const functions = useFunctions();
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nickname, setNickname] = useState('');
  const [points, setPoints] = useState('0');
  const [nfcId, setNfcId] = useState('');
  const [classId, setClassId] = useState('none');
  const [parentEmail, setParentEmail] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [studentPhone, setStudentPhone] = useState('');
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);
  const [isPhotoUploading, setIsPhotoUploading] = useState(false);
  const [isCustomEmojiUploading, setIsCustomEmojiUploading] = useState(false);
  const [theme, setTheme] = useState<StudentTheme | undefined>(undefined);
  const [birthday, setBirthday] = useState('');
  const [studentWelcomeAllowed, setStudentWelcomeAllowed] = useState(true);
  const [welcomeBackAllowed, setWelcomeBackAllowed] = useState(true);
  const [welcomeGreetingStyleId, setWelcomeGreetingStyleId] = useState('');
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const { toast } = useToast();
  const playSound = useArcadeSound();

  const isEditing = !!student;

  useEffect(() => {
    if (isOpen) {
      if (student) { // Edit mode
        setFirstName(student.firstName);
        setMiddleName(student.middleName || '');
        setLastName(student.lastName);
        setNickname(student.nickname || '');
        setPoints(student.points.toString());
        setNfcId(student.nfcId || student.id);
        setClassId(student.classId || 'none');
        setParentEmail(decryptField(student.parentEmail) || '');
        setParentPhone(decryptField(student.parentPhone) || '');
        setStudentEmail(decryptField(student.studentEmail) || '');
        setStudentPhone(decryptField(student.studentPhone) || '');
        setSelectedTeacherIds(student.teacherIds || []);
        setTheme(normalizeStudentTheme(student.theme) ?? student.theme);
        setBirthday(student.birthday || '');
        setStudentWelcomeAllowed(student.welcomePageEnabled !== false);
        setWelcomeBackAllowed(student.welcomeBackScreenEnabled !== false);
        setWelcomeGreetingStyleId(student.welcomeGreetingStyleId || '');
      } else { // Create mode
        setFirstName('');
        setMiddleName('');
        setLastName('');
        setNickname('');
        setPoints('0');
        setNfcId(Math.floor(10000000 + Math.random() * 90000000).toString());
        setClassId('none');
        setParentEmail('');
        setParentPhone('');
        setStudentEmail('');
        setStudentPhone('');
        setSelectedTeacherIds([]);
        setTheme(undefined);
        setBirthday('');
        setStudentWelcomeAllowed(true);
        setWelcomeBackAllowed(true);
        setWelcomeGreetingStyleId('');
      }
    }
  }, [student, isOpen]);

  const handlePhotoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!student?.id || !schoolId) {
      playSound('error');
      toast({ variant: 'destructive', title: 'Save the student first, then upload a photo.' });
      e.target.value = '';
      return;
    }
    if (!functions) {
      playSound('error');
      toast({ variant: 'destructive', title: 'Server connection not found.' });
      e.target.value = '';
      return;
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    const maxSizeBytes = 5 * 1024 * 1024;
    if (!allowedTypes.includes(file.type)) {
      playSound('error');
      toast({ variant: 'destructive', title: 'Unsupported file type', description: 'Use PNG, JPG, or WebP.' });
      e.target.value = '';
      return;
    }
    if (file.size > maxSizeBytes) {
      playSound('error');
      toast({ variant: 'destructive', title: 'File too large', description: 'Photo must be under 5MB.' });
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCropImageSrc(reader.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // reset the input so same file can be selected again
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setCropImageSrc(null);
    if (!student?.id || !schoolId || !functions) return;

    try {
      setIsPhotoUploading(true);
      const imageBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.includes(',') ? result.split(',')[1] : result;
          resolve(base64 || '');
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(croppedBlob);
      });

      const uploadStudentPhoto = httpsCallable<
        { schoolId: string; studentId: string; imageBase64: string; contentType: string },
        { photoUrl: string }
      >(functions, 'uploadStudentPhoto');

      const res = await uploadStudentPhoto({
        schoolId,
        studentId: student.id,
        imageBase64,
        contentType: croppedBlob.type || 'image/jpeg',
      });

      if (!res.data?.photoUrl) throw new Error('No photo URL returned');
      await updateStudent({ ...student, photoUrl: res.data.photoUrl });
      playSound('success');
      toast({ title: 'Profile photo updated!' });
    } catch (err: any) {
      console.error('Student photo upload failed', err);
      playSound('error');
      toast({
        variant: 'destructive',
        title: 'Photo upload failed',
        description: String(err?.message ?? 'Could not upload student photo.'),
      });
    } finally {
      setIsPhotoUploading(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!student?.id || !schoolId || !functions) return;
    try {
      setIsPhotoUploading(true);
      await updateStudent({ ...student, photoUrl: '' });
      playSound('success');
      toast({ title: 'Profile photo removed' });
    } catch (err: any) {
      console.error('Failed to remove photo', err);
      playSound('error');
      toast({ variant: 'destructive', title: 'Error', description: 'Could not remove the photo.' });
    } finally {
      setIsPhotoUploading(false);
    }
  };

  const handleCustomEmojiUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!student?.id || !schoolId) {
      playSound('error');
      toast({ variant: 'destructive', title: 'Save the student first, then upload a sticker.' });
      return;
    }
    if (!functions) {
      playSound('error');
      toast({ variant: 'destructive', title: 'Server connection not found.' });
      return;
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];
    const maxSizeBytes = 2 * 1024 * 1024;
    if (!allowedTypes.includes(file.type)) {
      playSound('error');
      toast({ variant: 'destructive', title: 'Unsupported file type', description: 'Use PNG, JPG, WebP, or GIF.' });
      return;
    }
    if (file.size > maxSizeBytes) {
      playSound('error');
      toast({ variant: 'destructive', title: 'File too large', description: 'Must be under 2MB.' });
      return;
    }

    try {
      setIsCustomEmojiUploading(true);
      const imageBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.includes(',') ? result.split(',')[1] : result;
          resolve(base64 || '');
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });

      const uploadStudentCustomEmoji = httpsCallable<
        { schoolId: string; studentId: string; imageBase64: string; contentType: string },
        { customEmojiUrl: string }
      >(functions, 'uploadStudentCustomEmoji');

      const res = await uploadStudentCustomEmoji({
        schoolId,
        studentId: student.id,
        imageBase64,
        contentType: file.type || 'image/png',
      });

      if (!res.data?.customEmojiUrl) throw new Error('No URL returned');
      await updateStudent({ ...student, customEmojiUrl: res.data.customEmojiUrl });
      playSound('success');
      toast({ title: 'Sticker / emoji updated!' });
    } catch (err: unknown) {
      console.error('Custom emoji upload failed', err);
      playSound('error');
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: String((err as { message?: string })?.message ?? 'Could not upload sticker.'),
      });
    } finally {
      setIsCustomEmojiUploading(false);
    }
  };

  const handleRemoveCustomEmoji = async () => {
    if (!student?.id || !schoolId) return;
    try {
      setIsCustomEmojiUploading(true);
      await updateStudent({ ...student, customEmojiUrl: '' });
      playSound('success');
      toast({ title: 'Sticker / emoji removed' });
    } catch (err: unknown) {
      console.error('Failed to remove custom emoji', err);
      playSound('error');
      toast({ variant: 'destructive', title: 'Error', description: 'Could not remove sticker.' });
    } finally {
      setIsCustomEmojiUploading(false);
    }
  };

  const handleSave = async () => {
    if (!firstName || !lastName) {
      playSound('error');
      toast({ variant: 'destructive', title: 'First and last name are required.' });
      return;
    }
    if (!nfcId) {
      playSound('error');
      toast({ variant: 'destructive', title: 'Student ID is required.' });
      return;
    }

    // Duplicate check
    const isDuplicate = allStudents.some(s =>
      (s.nfcId === nfcId || s.id === nfcId) && (!isEditing || s.id !== student?.id)
    );

    if (isDuplicate) {
      playSound('error');
      toast({
        variant: 'destructive',
        title: 'Duplicate Student ID',
        description: `The ID "${nfcId}" is already assigned to another student.`
      });
      return;
    }

    if (!firestore || !schoolId) {
      playSound('error');
      toast({ variant: 'destructive', title: 'Database connection not found.' });
      return;
    }

    const finalClassId = classId === 'none' ? '' : classId;
    const normalizedNickname = nickname.trim();
    const normalizedTheme = theme ? (normalizeStudentTheme(theme) ?? theme) : undefined;

    if (isEditing && student) {
      const updatedStudent: Student = {
        ...student,
        firstName,
        middleName: middleName || undefined,
        lastName,
        // Important: when clearing a nickname, persist the empty string so Firestore overwrites the old value.
        nickname: normalizedNickname ? normalizedNickname : '',
        points: parseInt(points) || 0,
        classId: finalClassId,
        nfcId,
        teacherIds: selectedTeacherIds,
        theme: normalizedTheme,
        parentEmail: encryptField(parentEmail.trim()) || undefined,
        parentPhone: encryptField(parentPhone.trim()) || undefined,
        studentEmail: encryptField(studentEmail.trim()) || undefined,
        studentPhone: encryptField(studentPhone.trim()) || undefined,
        birthday: birthday || undefined,
        welcomePageEnabled: studentWelcomeAllowed ? true : false,
        welcomeBackScreenEnabled: welcomeBackAllowed ? true : false,
        welcomeGreetingStyleId: welcomeGreetingStyleId.trim() || undefined,
      };
      await updateStudent(updatedStudent);
      playSound('success');
      toast({ title: 'Student updated!' });
    } else {
      const newStudent = {
        nfcId,
        firstName,
        middleName: middleName || undefined,
        lastName,
        nickname: normalizedNickname || undefined,
        points: parseInt(points) || 0,
        classId: finalClassId,
        teacherIds: selectedTeacherIds,
        ...(normalizedTheme ? { theme: normalizedTheme } : {}),
        parentEmail: encryptField(parentEmail.trim()) || undefined,
        parentPhone: encryptField(parentPhone.trim()) || undefined,
        studentEmail: encryptField(studentEmail.trim()) || undefined,
        studentPhone: encryptField(studentPhone.trim()) || undefined,
        birthday: birthday || undefined,
        welcomePageEnabled: studentWelcomeAllowed ? true : false,
        welcomeBackScreenEnabled: welcomeBackAllowed ? true : false,
        welcomeGreetingStyleId: welcomeGreetingStyleId.trim() || undefined,
      };
      await addStudent(newStudent);
      playSound('success');
      toast({ title: 'Student added!' });
    }
    setIsOpen(false);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent size="lg" className="flex flex-col p-0 overflow-hidden max-h-[var(--dialog-max-h,min(90vh,calc(100dvh-2rem)))]">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>{isEditing ? `Edit ${getStudentNickname(student!)} ${student!.lastName}` : 'New Student'}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="grid gap-4">
          {isEditing && (
            <div className="space-y-2">
              <Label>Profile Photo</Label>
              <div className="flex items-center gap-3">
                <div className="relative group">
                  <div className="h-12 w-12 rounded-full overflow-hidden bg-muted border border-border/60 flex items-center justify-center text-xs font-semibold text-muted-foreground">
                    {student?.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={student.photoUrl} alt="Student profile" className={settings.photoDisplayMode === 'cover' ? 'h-full w-full object-cover' : 'h-full w-full object-contain'} />
                    ) : (
                      <span>{(firstName[0] || '')}{(lastName[0] || '')}</span>
                    )}
                  </div>
                  {student?.photoUrl && (
                    <button
                      onClick={handleRemovePhoto}
                      className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remove photo"
                      disabled={isPhotoUploading}
                      type="button"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <div className="flex-1">
                  <Input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    onChange={handlePhotoUpload}
                    disabled={isPhotoUploading}
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">PNG/JPG/WebP under 5MB.</p>
                </div>
              </div>
            </div>
          )}
          {isEditing && (
            <div className="space-y-2">
              <Label>Sticker / emoji (by name)</Label>
              <div className="flex items-center gap-3">
                <div className="relative group">
                  <div className="h-12 w-12 rounded-lg overflow-hidden bg-muted border border-border/60 flex items-center justify-center text-[10px] font-semibold text-muted-foreground">
                    {student?.customEmojiUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={student.customEmojiUrl} alt="" className="h-full w-full object-contain" />
                    ) : (
                      <span>None</span>
                    )}
                  </div>
                  {student?.customEmojiUrl ? (
                    <button
                      type="button"
                      onClick={() => void handleRemoveCustomEmoji()}
                      className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remove sticker"
                      disabled={isCustomEmojiUploading}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  ) : null}
                </div>
                <div className="flex-1">
                  <Input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                    onChange={(e) => void handleCustomEmojiUpload(e)}
                    disabled={isCustomEmojiUploading}
                  />
                    <p className="text-[11px] text-muted-foreground mt-1">PNG/JPG/WebP/GIF under 2MB. Shown next to their name on the student portal, rewards shop, and ID card.</p>
                </div>
              </div>
              {isCustomEmojiUploading ? (
                <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" aria-hidden />
                  Uploading…
                </p>
              ) : null}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="firstName">First Name</Label>
              <Input id="firstName" value={firstName} onChange={e => setFirstName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="lastName">Last Name</Label>
              <Input id="lastName" value={lastName} onChange={e => setLastName(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="middleName">Middle Name (Optional)</Label>
              <Input id="middleName" value={middleName} onChange={e => setMiddleName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="nickname">Nickname (Optional)</Label>
              <Input id="nickname" value={nickname} onChange={e => setNickname(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="birthday">Birthday (Optional)</Label>
            <Input id="birthday" type="date" value={birthday} onChange={e => setBirthday(e.target.value)} />
          </div>
          {settings.enableStudentWelcomeBackScreen && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/20 p-4">
              <div className="space-y-0.5">
                <Label htmlFor="student-welcome-back-allowed">Welcome back splash</Label>
                <p className="text-xs text-muted-foreground">
                  Short full-screen greeting when this student opens the kiosk. The school can set how long it stays on screen in Settings.
                </p>
              </div>
              <Checkbox
                id="student-welcome-back-allowed"
                checked={welcomeBackAllowed}
                onCheckedChange={(v) => setWelcomeBackAllowed(v === true)}
              />
            </div>
          )}
          {STUDENT_WELCOME_STYLES_LIVE && settings.enableStudentWelcome && (
            <div className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <Label htmlFor="student-welcome-allowed">Style welcome page</Label>
                  <p className="text-xs text-muted-foreground">
                    When off, this student will not see the welcome style picker on the kiosk (school setting must also be on).
                  </p>
                </div>
                <Checkbox
                  id="student-welcome-allowed"
                  checked={studentWelcomeAllowed}
                  onCheckedChange={(v) => setStudentWelcomeAllowed(v === true)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="welcome-style">Default welcome style (optional)</Label>
                <Select value={welcomeGreetingStyleId || '__default__'} onValueChange={(v) => setWelcomeGreetingStyleId(v === '__default__' ? '' : v)}>
                  <SelectTrigger id="welcome-style">
                    <SelectValue placeholder="Let student choose on first visit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__default__">No preset (student picks on kiosk)</SelectItem>
                    {WELCOME_GREETING_STYLES.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.emoji} {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <div className="space-y-1">
            <Label htmlFor="student-id">Student ID (for scanning)</Label>
            <div className="flex gap-2">
              <Input
                id="student-id"
                value={nfcId}
                onChange={e => setNfcId(e.target.value)}
                placeholder="Tap card or enter ID..."
              />
              <Button
                type="button"
                variant="outline"
                className="whitespace-nowrap"
                onClick={() => {
                  const randomId = Math.floor(10000000 + Math.random() * 90000000).toString();
                  setNfcId(randomId);
                }}
              >
                Random
              </Button>
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="points">Points</Label>
            <Input id="points" type="number" value={points} onChange={e => setPoints(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="parentEmail">Parent Email (Optional)</Label>
              <Input
                id="parentEmail"
                type="email"
                value={parentEmail}
                onChange={e => setParentEmail(e.target.value)}
                placeholder="alerts@parents.com"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="parentPhone">Parent Phone (Optional)</Label>
              <Input
                id="parentPhone"
                type="tel"
                value={parentPhone}
                onChange={e => setParentPhone(e.target.value)}
                placeholder="555-0123"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="studentEmail">Student Email (Optional)</Label>
              <Input
                id="studentEmail"
                type="email"
                value={studentEmail}
                onChange={e => setStudentEmail(e.target.value)}
                placeholder="student@school.edu"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="studentPhone">Student Phone (Optional)</Label>
              <Input
                id="studentPhone"
                type="tel"
                value={studentPhone}
                onChange={e => setStudentPhone(e.target.value)}
                placeholder="555-0123"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="class">Assign to Class</Label>
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger id="class"><SelectValue placeholder="Select a class..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {allClasses
                  ?.slice()
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Student Theme (optional)</Label>
            <p className="text-xs text-muted-foreground">
              Use AI to generate a personalized look for this student&apos;s portal and ID card.
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => setIsThemeModalOpen(true)}
              >
                <Wand2 className="w-4 h-4 mr-1 text-purple-500" />
                {theme ? 'Edit Theme' : 'Generate Theme'}
              </Button>
              {theme && (
                <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Theme set
                </span>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <Label>Assign to Teacher(s)</Label>
            <ScrollArea className="h-32 rounded-md border p-2">
              <div className="space-y-2">
                {allTeachers.map(teacher => (
                  <div key={teacher.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`teacher-${teacher.id}`}
                      checked={selectedTeacherIds.includes(teacher.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedTeacherIds(prev => [...prev, teacher.id]);
                        } else {
                          setSelectedTeacherIds(prev => prev.filter(id => id !== teacher.id));
                        }
                      }}
                    />
                    <Label htmlFor={`teacher-${teacher.id}`} className="font-normal">{teacher.name}</Label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
          {isEditing && student?.id && settings.enableFaceLogin ? (
            <AdminFaceEnrollmentPanel
              key={student.id}
              studentId={student.id}
              studentLabel={[firstName, lastName].filter(Boolean).join(' ').trim() || undefined}
            />
          ) : null}
          </div>
        </div>
        <DialogFooter className="px-6 py-4 border-t bg-muted/30">
          <Button type="button" variant="secondary" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button type="submit" onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
      {isThemeModalOpen && (
        <ThemeGeneratorModal
          isOpen={isThemeModalOpen}
          onOpenChange={setIsThemeModalOpen}
          studentName={
            [firstName, lastName].filter(Boolean).join(' ').trim() || firstName || 'Student'
          }
          previewStudent={{
            id: student?.id ?? 'preview',
            firstName: firstName || 'Student',
            lastName: lastName || '',
            middleName: middleName || undefined,
            nickname: nickname || undefined,
            points: parseInt(points, 10) || 0,
            nfcId: nfcId || '00000000',
            classId: classId === 'none' ? undefined : classId,
            photoUrl: student?.photoUrl,
            customEmojiUrl: student?.customEmojiUrl,
            theme,
          }}
          classLabel={
            classId === 'none'
              ? 'Unassigned'
              : (allClasses.find((c) => c.id === classId)?.name ?? 'Unassigned')
          }
          currentTheme={theme}
          onSave={(newTheme) => {
            setTheme(newTheme);
            setIsThemeModalOpen(false);
          }}
          onRemoveTheme={() => {
            setTheme(undefined);
            toast({
              title: 'Theme removed',
              description: 'Save the student to apply this change to the database.',
            });
          }}
        />
      )}
    </Dialog>
      {cropImageSrc && (
        <ImageCropper
          imageSrc={cropImageSrc!}
          aspectRatio={1}
          onCropComplete={handleCropComplete}
          onCancel={() => setCropImageSrc(null)}
        />
      )}
    </>
  );
}
