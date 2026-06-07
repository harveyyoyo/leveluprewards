
'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useAppContext } from '@/components/AppProvider';
import { SchoolDeveloperLoginForm } from '@/components/auth/SchoolDeveloperLoginForm';
import { useFirestore, useFirebase, useCollection, useMemoFirebase, useFunctions } from '@/firebase';
import { collection, doc, getDoc, setDoc, query, getDocs, orderBy, limit } from 'firebase/firestore';
import { schoolPublicDocRef, mainSchoolDocToPublicPayload } from '@/lib/schoolPublic';
import { isAllowedDeveloperGoogleUser } from '@/lib/developerAccess';
import {
  Plus, Trash2, Server, Pencil, Database, Download, Upload, ShieldCheck, LifeBuoy, RefreshCw, Link2, Check, Loader2, Image as ImageIcon, LogOut, Headset, MonitorSmartphone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import type { BackupInfo } from '@/lib/types';
import {
  formatActivePillars,
  PRODUCT_PILLAR_KEYS,
  PRODUCT_PILLAR_LABELS,
  type ProductPillarKey,
} from '@/lib/productPillars';
import { OfficePortalEntryLink } from '@/components/office/OfficePortalEntryLink';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { useSettings } from '@/components/providers/SettingsProvider';
import { Helper } from '@/components/ui/helper';
import { httpsCallable } from 'firebase/functions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ImageCropper } from '@/components/admin/ImageCropper';
import {
  isAllowedLogoFile,
  isSvgLogoFile,
  LOGO_UPLOAD_ACCEPT,
  LOGO_UPLOAD_MAX_BYTES,
  resolveLogoContentType,
} from '@/lib/logoUpload';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  getHomeLogoMode,
  setHomeLogoMode,
  subscribeHomeLogoMode,
  type HomeLogoMode,
} from '@/lib/homeLogoMode';
import { DeveloperRemoteSupportViewer } from '@/components/support/DeveloperRemoteSupportViewer';
import { DeveloperSchoolInsightsPanel } from '@/components/developer/DeveloperSchoolInsightsPanel';
import { DeveloperSchoolScreensSheet } from '@/components/developer/DeveloperSchoolScreensSheet';
import {
  isJewishOrthodoxSchool,
  SCHOOL_PROFILE_LABELS,
  type SchoolProfileType,
} from '@/lib/schoolProfile';

function schoolAccessPasscodeFrom(data: { schoolAccessPasscode?: string; passcode?: string }): string {
  return (data.schoolAccessPasscode || data.passcode || '').trim();
}

function adminPasscodeFrom(data: { adminPasscode?: string; passcode?: string }): string {
  return (data.adminPasscode || data.passcode || '').trim();
}

interface SchoolInfo {
  id: string;
  name: string;
  passcode?: string;
  schoolAccessPasscode?: string;
  adminPasscode?: string;
  schoolProfile?: SchoolProfileType;
  appSettings?: {
    payClassroom?: boolean;
    payAttendance?: boolean;
    payLibrary?: boolean;
    payHomework?: boolean;
    payOffice?: boolean;
  };
  pillarAccess?: Partial<Record<ProductPillarKey, boolean>>;
  featureSettingsDefaults?: Partial<Record<ProductPillarKey, boolean>>;
}

export default function DeveloperPage() {
  const {
    loginState, isInitialized, isUserLoading, logout, createSchool, deleteSchool, updateSchool,
    devCreateBackup, devRestoreFromBackup, devDownloadBackup, devBackupAllSchools,
    devVerifyBackup, devMigrateSchoolData, devResetSampleSchool, devSyncSchoolPublicIndex,
    startDeveloperSupportSession,
  } = useAppContext();
  const firestore = useFirestore();
  const functions = useFunctions();
  const { user: firebaseUser } = useFirebase();
  const { toast } = useToast();
  const playSound = useArcadeSound();
  const { settings, updateSettings } = useSettings();

  const allowedDeveloper = isAllowedDeveloperGoogleUser(firebaseUser);

  const [isCreateSchoolDialogOpen, setIsCreateSchoolDialogOpen] = useState(false);
  const [newSchoolId, setNewSchoolId] = useState('');
  const [newSchoolName, setNewSchoolName] = useState('');
  const [newSchoolAccessPasscode, setNewSchoolAccessPasscode] = useState('1234');
  const [newAdminPasscode, setNewAdminPasscode] = useState('1234');

  const [createdSchoolInfo, setCreatedSchoolInfo] = useState<{ id: string; schoolAccessPasscode: string; adminPasscode: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingSchool, setEditingSchool] = useState<SchoolInfo | null>(null);
  const [editingSchoolName, setEditingSchoolName] = useState('');
  const [editingSchoolAccessPasscode, setEditingSchoolAccessPasscode] = useState('');
  const [editingAdminPasscode, setEditingAdminPasscode] = useState('');
  const [editingJewishOrthodox, setEditingJewishOrthodox] = useState(false);
  const [pillarSchool, setPillarSchool] = useState<SchoolInfo | null>(null);
  const [editingPillars, setEditingPillars] = useState<Record<ProductPillarKey, boolean>>({
    payClassroom: true,
    payAttendance: true,
    payLibrary: true,
    payHomework: true,
    payOffice: false,
  });
  const [editingPillarAccess, setEditingPillarAccess] = useState<Record<ProductPillarKey, boolean>>({
    payClassroom: true,
    payAttendance: true,
    payLibrary: true,
    payHomework: true,
    payOffice: true,
  });
  const [backupSchool, setBackupSchool] = useState<SchoolInfo | null>(null);
  const [schoolBackups, setSchoolBackups] = useState<BackupInfo[]>([]);
  const [insightFocusSchoolId, setInsightFocusSchoolId] = useState<string | null>(null);
  const [screensSchool, setScreensSchool] = useState<SchoolInfo | null>(null);
  const [supportStartingSchool, setSupportStartingSchool] = useState<string | null>(null);

  type FaceEnrollmentRow = {
    studentId: string;
    enabled: boolean;
    scanCount: number;
    updatedAt: number | null;
  };
  const [faceEnrollmentSchool, setFaceEnrollmentSchool] = useState<string | null>(null);
  const [faceEnrollments, setFaceEnrollments] = useState<FaceEnrollmentRow[] | null>(null);
  const [faceEnrollmentBusy, setFaceEnrollmentBusy] = useState(false);

  const loadFaceEnrollments = useCallback(async (schoolId: string) => {
    if (!functions) return;
    setFaceEnrollmentBusy(true);
    setFaceEnrollmentSchool(schoolId);
    try {
      const fn = httpsCallable(functions, 'listSchoolFaceEnrollments');
      const res = await fn({ schoolId });
      const rows = (res.data as { enrollments?: FaceEnrollmentRow[] })?.enrollments ?? [];
      setFaceEnrollments(rows);
      toast({
        title: `Face enrollments · ${schoolId}`,
        description:
          rows.length === 0
            ? 'No faceAuth records in Firestore.'
            : `${rows.length} record${rows.length === 1 ? '' : 's'} (see list below).`,
      });
    } catch (e: unknown) {
      setFaceEnrollments(null);
      toast({
        variant: 'destructive',
        title: 'Could not load face enrollments',
        description: (e as Error)?.message || 'Deploy listSchoolFaceEnrollments or check developer login.',
      });
    } finally {
      setFaceEnrollmentBusy(false);
    }
  }, [functions, toast]);

  const clearSampleFaceEnrollments = useCallback(async (schoolId: string, exceptStudentIds: string[] = []) => {
    if (!functions) return;
    setFaceEnrollmentBusy(true);
    try {
      const fn = httpsCallable(functions, 'devClearSampleSchoolFaceAuth');
      const res = await fn({ schoolId, exceptStudentIds });
      const cleared = (res.data as { cleared?: number })?.cleared ?? 0;
      toast({
        title: `Cleared face enrollments · ${schoolId}`,
        description:
          cleared === 0
            ? 'Nothing removed.'
            : `Removed ${cleared} record${cleared === 1 ? '' : 's'}${exceptStudentIds.length ? ` (kept ${exceptStudentIds.join(', ')})` : ''}.`,
      });
      await loadFaceEnrollments(schoolId);
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: 'Could not clear face enrollments',
        description: (e as Error)?.message || 'Deploy devClearSampleSchoolFaceAuth or check developer login.',
      });
    } finally {
      setFaceEnrollmentBusy(false);
    }
  }, [functions, loadFaceEnrollments, toast]);

  const [orphanSchoolId, setOrphanSchoolId] = useState('');
  const [latestBackup, setLatestBackup] = useState<{ id: string } | null>(null);
  const [isFindingBackup, setIsFindingBackup] = useState(false);

  const [appLogoUrl, setAppLogoUrl] = useState<string | null>(null);
  const [appLogoHistory, setAppLogoHistory] = useState<string[]>([]);
  const [isAppLogoUploading, setIsAppLogoUploading] = useState(false);
  const appLogoInputRef = useRef<HTMLInputElement | null>(null);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);

  const [homeLogoMode, setHomeLogoModeState] = useState<HomeLogoMode>('animated');

  const schoolsQuery = useMemoFirebase(() => (loginState === 'developer' && !isUserLoading) ? collection(firestore, 'schools') : null, [loginState, firestore, isUserLoading]);
  const { data: allSchools, isLoading: schoolsLoading, error: schoolsError } = useCollection<SchoolInfo>(schoolsQuery);

  // Note: Admin roles are provisioned by backend-only code (Cloud Functions / Admin SDK).
  // We intentionally do not write to roles collections from the client.

  // Developer can manually create sample schools if needed using the controls below.

  useEffect(() => {
    setHomeLogoModeState(getHomeLogoMode());
    return subscribeHomeLogoMode(() => setHomeLogoModeState(getHomeLogoMode()));
  }, []);

  // Load current app-wide logo and history from global app config
  useEffect(() => {
    if (!firestore) return;
    const load = async () => {
      try {
        const ref = doc(firestore, 'appConfig', 'global');
        const snap = await getDoc(ref);
        const data = snap.data() as { appLogoUrl?: string; appLogoHistory?: { url?: string }[] } | undefined;
        const currentUrl = data?.appLogoUrl?.trim();
        if (currentUrl) {
          setAppLogoUrl(currentUrl);
        }
        const seen = new Set<string>();
        const urls: string[] = [];
        if (currentUrl) {
          seen.add(currentUrl);
          urls.push(currentUrl);
        }
        if (Array.isArray(data?.appLogoHistory)) {
          data!.appLogoHistory!.forEach((entry) => {
            const u = entry?.url?.trim();
            if (u && !seen.has(u)) {
              seen.add(u);
              urls.push(u);
            }
          });
        }
        setAppLogoHistory(urls);
      } catch (e) {
        console.error('Failed to load app logo', e);
      }
    };
    load();
  }, [firestore]);

  const handleSetAppLogoUrl = async (url: string) => {
    if (!functions) return;
    try {
      const setLogo = httpsCallable<{ url: string }, { success: boolean; logoUrl: string }>(functions, 'setAppLogoUrl');
      await setLogo({ url });
      setAppLogoUrl(url);
      playSound('success');
      toast({ title: 'App logo restored', description: 'Using selected previous logo.' });
    } catch (e) {
      console.error('setAppLogoUrl failed', e);
      playSound('error');
      toast({ variant: 'destructive', title: 'Failed to restore logo', description: String(e) });
    }
  };

  const handleAppLogoUploadClick = () => {
    appLogoInputRef.current?.click();
  };

  const handleAppLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isAllowedLogoFile(file)) {
      playSound('error');
      toast({
        variant: 'destructive',
        title: 'Unsupported file type',
        description: 'Please use PNG, JPG, WebP, or SVG.',
      });
      e.target.value = '';
      return;
    }
    if (file.size > LOGO_UPLOAD_MAX_BYTES) {
      playSound('error');
      toast({
        variant: 'destructive',
        title: 'File too large',
        description: 'Logo must be under 10MB.',
      });
      e.target.value = '';
      return;
    }

    e.target.value = '';

    if (isSvgLogoFile(file)) {
      await processAppLogoUpload(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCropImageSrc(reader.result as string);
      setPendingLogoFile(file);
    };
    reader.readAsDataURL(file);
  };

  const processAppLogoUpload = async (blob: Blob) => {
    if (!functions || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Cannot upload app logo',
        description: 'Cloud Functions are not available. Refresh and try again.',
      });
      return;
    }

    try {
      setIsAppLogoUploading(true);
      toast({ title: 'Uploading app logo…', description: 'Please wait.' });

      const imageBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.includes(',') ? result.split(',')[1] : result;
          resolve(base64 || '');
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      });

      const uploadLogo = httpsCallable<{ imageBase64: string; contentType: string }, { logoUrl: string }>(functions, 'uploadAppLogo');
      const res = await uploadLogo({
        imageBase64,
        contentType: resolveLogoContentType(blob, pendingLogoFile?.name),
      });

      const data = res.data;
      if (!data?.logoUrl) {
        throw new Error('No logo URL returned');
      }

      setAppLogoUrl(data.logoUrl);
      setAppLogoHistory((prev) => [data.logoUrl, ...prev.filter((url) => url !== data.logoUrl)]);
      playSound('success');
      toast({ title: 'App logo updated!', description: 'This logo can be used across the app shell.' });
      setCropImageSrc(null);
      setPendingLogoFile(null);
    } catch (error: unknown) {
      console.error('App logo upload failed', error);
      playSound('error');
      const err = error as { code?: string; message?: string; details?: unknown };
      const code = err?.code ?? '';
      const message = String(err?.message ?? '');
      let description = message;
      if (!description && err?.details) {
        try {
          description = typeof err.details === 'string' ? err.details : JSON.stringify(err.details);
        } catch {
          // ignore
        }
      }
      if (code === 'functions/unauthenticated') {
        description = 'You must be logged in as a developer. Please sign in again.';
      } else if (code === 'functions/permission-denied') {
        description = 'You need developer access to update the app logo.';
      } else if (code === 'functions/invalid-argument') {
        description = message || 'Invalid image. Use PNG, JPG, or WebP under 10MB.';
      } else if (!message || message === 'undefined') {
        description = 'Could not save the logo. Try again or use a smaller image.';
      }
      toast({
        variant: 'destructive',
        title: 'App logo upload failed',
        description,
      });
    } finally {
      setIsAppLogoUploading(false);
    }
  };

  const handleFindLatestBackup = async () => {
    if (!firestore || !orphanSchoolId) return;
    setIsFindingBackup(true);
    setLatestBackup(null);
    try {
      const backupsRef = collection(firestore, 'schools', orphanSchoolId, 'backups');
      const q = query(backupsRef, orderBy('__name__', 'desc'), limit(1));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        playSound('error');
        toast({ variant: 'destructive', title: 'No Backups Found', description: `No backups were found for school ID "${orphanSchoolId}". A backup must exist to restore data.` });
      } else {
        const backupDoc = snapshot.docs[0];
        setLatestBackup({ id: backupDoc.id });
      }
    } catch (e) {
      playSound('error');
      toast({ variant: 'destructive', title: 'Error Finding Backup', description: (e as Error).message });
    } finally {
      setIsFindingBackup(false);
    }
  }

  const handleRestoreOrphan = async () => {
    if (!orphanSchoolId || !latestBackup) return;
    await devRestoreFromBackup(orphanSchoolId, latestBackup.id);
    setOrphanSchoolId('');
    setLatestBackup(null);
  }

  const handleCreateSchool = async () => {
    if (!newSchoolId) {
      playSound('error');
      toast({ variant: 'destructive', title: "School ID cannot be empty." });
      return;
    }
    const result = await createSchool(newSchoolId, newSchoolName, {
      schoolAccessPasscode: newSchoolAccessPasscode,
      adminPasscode: newAdminPasscode,
    });
    if (result) {
      setCreatedSchoolInfo({
        id: result.cleanId,
        schoolAccessPasscode: result.schoolAccessPasscode,
        adminPasscode: result.adminPasscode,
      });
    }
    setIsCreateSchoolDialogOpen(false);
    setNewSchoolId('');
    setNewSchoolName('');
    setNewSchoolAccessPasscode('1234');
    setNewAdminPasscode('1234');
  };

  const handleOpenEditModal = async (school: SchoolInfo) => {
    setEditingSchool(school);
    setEditingSchoolName(school.name);
    setEditingSchoolAccessPasscode('');
    setEditingAdminPasscode('');
    setEditingJewishOrthodox(isJewishOrthodoxSchool(school, school.id));

    if (!firestore) return;
    try {
      const snap = await getDoc(doc(firestore, 'schools', school.id));
      const data = (snap.data() ?? school) as SchoolInfo;
      setEditingSchool(data);
      setEditingSchoolName(data.name);
      setEditingSchoolAccessPasscode(schoolAccessPasscodeFrom(data));
      setEditingAdminPasscode(adminPasscodeFrom(data));
      setEditingJewishOrthodox(isJewishOrthodoxSchool(data, school.id));
    } catch {
      setEditingSchoolAccessPasscode(schoolAccessPasscodeFrom(school));
      setEditingAdminPasscode(adminPasscodeFrom(school));
      setEditingJewishOrthodox(isJewishOrthodoxSchool(school, school.id));
    }
  }

  const handleCloseEditModal = () => {
    setEditingSchool(null);
    setEditingSchoolName('');
    setEditingSchoolAccessPasscode('');
    setEditingAdminPasscode('');
    setEditingJewishOrthodox(false);
  }

  const handleUpdateSchool = async () => {
    if (!editingSchool) return;

    const updates: {
      name?: string;
      passcode?: string;
      schoolAccessPasscode?: string;
      adminPasscode?: string;
      schoolProfile?: SchoolProfileType;
    } = {};
    if (editingSchoolName && editingSchoolName !== editingSchool.name) {
      updates.name = editingSchoolName;
    }
    const currentSchoolAccessPasscode = schoolAccessPasscodeFrom(editingSchool);
    const currentAdminPasscode = adminPasscodeFrom(editingSchool);
    if (editingSchoolAccessPasscode !== currentSchoolAccessPasscode) {
      updates.passcode = editingSchoolAccessPasscode;
      updates.schoolAccessPasscode = editingSchoolAccessPasscode;
    }
    if (editingAdminPasscode !== currentAdminPasscode) {
      updates.adminPasscode = editingAdminPasscode;
    }
    const nextProfile: SchoolProfileType = editingJewishOrthodox ? 'jewish_orthodox' : 'standard';
    const currentProfile: SchoolProfileType = isJewishOrthodoxSchool(editingSchool, editingSchool.id)
      ? 'jewish_orthodox'
      : 'standard';
    if (nextProfile !== currentProfile) {
      updates.schoolProfile = nextProfile;
    }

    if (Object.keys(updates).length > 0) {
      await updateSchool(editingSchool.id, updates);
      playSound('success');
      toast({ title: `School "${editingSchool.id}" updated!` });
    } else {
      toast({ title: 'No changes were made.' });
    }
    handleCloseEditModal();
  }

  const handleOpenPillarsModal = async (school: SchoolInfo) => {
    if (!firestore) return;
    setPillarSchool(school);
    const apply = (data: SchoolInfo) => {
      const app = data.appSettings ?? {};
      const defaults = data.featureSettingsDefaults ?? {};
      const access = data.pillarAccess ?? {};
      setEditingPillarAccess({
        payClassroom: access.payClassroom !== false,
        payAttendance: access.payAttendance !== false,
        payLibrary: access.payLibrary !== false,
        payHomework: access.payHomework !== false,
        payOffice: access.payOffice !== false,
      });
      setEditingPillars({
        payClassroom: defaults.payClassroom ?? app.payClassroom ?? true,
        payAttendance: defaults.payAttendance ?? app.payAttendance ?? true,
        payLibrary: defaults.payLibrary ?? app.payLibrary ?? true,
        payHomework: defaults.payHomework ?? app.payHomework ?? true,
        payOffice: defaults.payOffice ?? app.payOffice ?? false,
      });
    };
    try {
      const snap = await getDoc(doc(firestore, 'schools', school.id));
      apply((snap.data() ?? school) as SchoolInfo);
    } catch {
      apply(school);
    }
  };

  const handleClosePillarsModal = () => {
    setPillarSchool(null);
    setEditingPillars({
      payClassroom: true,
      payAttendance: true,
      payLibrary: true,
      payHomework: true,
      payOffice: false,
    });
    setEditingPillarAccess({
      payClassroom: true,
      payAttendance: true,
      payLibrary: true,
      payHomework: true,
      payOffice: true,
    });
  };

  const handleSavePillars = async () => {
    if (!firestore || !pillarSchool) return;
    try {
      const snap = await getDoc(doc(firestore, 'schools', pillarSchool.id));
      const existingApp = (snap.data()?.appSettings ?? {}) as Record<string, unknown>;
      const existingDefaults = (snap.data()?.featureSettingsDefaults ?? {}) as Record<string, unknown>;
      const nextAppSettings: Record<string, unknown> = { ...existingApp };
      const nextDefaults: Record<string, unknown> = { ...existingDefaults };
      const nextAccess: Record<ProductPillarKey, boolean> = { ...editingPillarAccess };

      for (const key of PRODUCT_PILLAR_KEYS) {
        nextDefaults[key] = editingPillarAccess[key] && editingPillars[key];
        if (!editingPillarAccess[key]) {
          nextAppSettings[key] = false;
        } else if (typeof nextAppSettings[key] !== 'boolean') {
          nextAppSettings[key] = editingPillars[key];
        }
      }

      const payload = {
        appSettings: nextAppSettings,
        featureSettingsDefaults: nextDefaults,
        pillarAccess: nextAccess,
        updatedAt: Date.now(),
      };
      await setDoc(doc(firestore, 'schools', pillarSchool.id), payload, { merge: true });
      await setDoc(
        schoolPublicDocRef(firestore, pillarSchool.id),
        mainSchoolDocToPublicPayload(payload as Record<string, unknown>),
        { merge: true },
      );
      playSound('success');
      toast({
        title: `Product pillars updated for "${pillarSchool.id}"`,
        description: `Access: ${formatActivePillars(nextAccess)} · Defaults: ${formatActivePillars(nextDefaults)}`,
      });
      handleClosePillarsModal();
    } catch (e) {
      playSound('error');
      toast({ variant: 'destructive', title: 'Pillar update failed', description: (e as Error).message });
    }
  };

  const handleOpenBackupModal = async (school: SchoolInfo) => {
    if (!firestore) return;
    setBackupSchool(school);
    const backupsColRef = collection(firestore, 'schools', school.id, 'backups');
    const snapshot = await getDocs(query(backupsColRef));
    const backupList: BackupInfo[] = snapshot.docs.map(d => ({
      id: d.id,
      ...d.data(),
    } as BackupInfo)).sort((a, b) => {
      const timeA = a.createdAt || 0;
      const timeB = b.createdAt || 0;
      return timeB - timeA;
    });
    setSchoolBackups(backupList);
  }

  const handleCloseBackupModal = () => {
    setBackupSchool(null);
    setSchoolBackups([]);
  }

  const handleCreateBackup = async () => {
    if (!backupSchool) return;
    await devCreateBackup(backupSchool.id);
    handleOpenBackupModal(backupSchool); // Refresh list
  }

  const handleRestoreBackup = async (backupId: string) => {
    if (!backupSchool) return;
    await devRestoreFromBackup(backupSchool.id, backupId);
  }

  const handleBackupAll = async () => {
    if (!allSchools) return;
    await devBackupAllSchools();
  }

  const handleVerifyBackup = async (backupId: string) => {
    if (!backupSchool) return;
    toast({ title: "Verifying...", description: "Checking backup integrity via SHA-256 hash." });
    const result = await devVerifyBackup(backupSchool.id, backupId);
    if (result.verified) {
      playSound('success');
    } else {
      playSound('error');
    }
    toast({
      title: result.verified ? "Backup Verified" : "Verification Failed",
      description: result.reason,
      variant: result.verified ? "default" : "destructive",
    });
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getSchoolUrl = (id: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const sid = id.trim().toLowerCase();
    const params = new URLSearchParams({
      school: sid,
      next: `/${sid}/portal`,
    });
    return `${origin}/login?${params.toString()}`;
  };

  const handleCopyUrl = async (id: string) => {
    const url = getSchoolUrl(id);
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    playSound('click');
    toast({ title: 'Link copied!' });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleStartSupportSession = async (school: SchoolInfo) => {
    setSupportStartingSchool(school.id);
    playSound('click');
    const ok = await startDeveloperSupportSession(school.id);
    setSupportStartingSchool(null);
    if (!ok) {
      playSound('error');
      toast({
        variant: 'destructive',
        title: 'Could not open school admin',
        description: 'Confirm your developer access and try again.',
      });
      return;
    }
    playSound('login');
    toast({
      title: `Opening admin for ${school.id}`,
      description: 'Opening the school admin dashboard.',
    });
    window.location.assign(`/${school.id}/admin`);
  };

  if (!isInitialized || isUserLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Button disabled variant="ghost" size="lg" className="text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading…
        </Button>
      </div>
    );
  }

  if (!allowedDeveloper || loginState !== 'developer') {
    return <SchoolDeveloperLoginForm mode="developer-only" />;
  }

  return (
    <TooltipProvider>
      <div className="relative mx-auto w-full max-w-6xl px-4 pb-12 pt-6 sm:px-6 sm:pt-8">
        <header className="mb-8">
          <Card className="overflow-hidden border bg-card/90 shadow-md backdrop-blur-sm supports-[backdrop-filter]:bg-card/80">
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
              <Helper content="This page is for system administrators. It allows you to manage all school instances, create backups, and perform system-wide operations.">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground ring-1 ring-border">
                    <Server className="h-5 w-5" aria-hidden />
                  </div>
                  <div>
                    <h1 id="developer-console-title" className="font-headline text-2xl font-bold tracking-tight sm:text-3xl">Developer Mode</h1>
                    <p className="mt-1 text-sm text-muted-foreground">Manage every school instance, backups, and system-wide settings.</p>
                  </div>
                </div>
              </Helper>
        <div className="flex flex-col gap-2 sm:flex-row sm:shrink-0">
              <Button type="button" variant="secondary" className="gap-2" asChild>
                <a href="/developer/media-library">
                  <ImageIcon className="h-4 w-4" aria-hidden />
                  Media library
                </a>
              </Button>
              <Button type="button" variant="outline" className="gap-2" onClick={() => logout()}>
                <LogOut className="h-4 w-4" aria-hidden />
                Sign out
              </Button>
            </div>
            </CardContent>
          </Card>
        </header>

        <DeveloperSchoolInsightsPanel
          focusSchoolId={insightFocusSchoolId}
          onFocusSchool={setInsightFocusSchoolId}
        />

        <DeveloperSchoolScreensSheet
          schoolId={screensSchool?.id ?? ''}
          schoolName={screensSchool?.name ?? ''}
          open={!!screensSchool}
          onOpenChange={(open) => {
            if (!open) setScreensSchool(null);
          }}
          onOpenSchoolAdmin={async (schoolId) => {
            const school = allSchools?.find((item) => item.id === schoolId);
            if (school) await handleStartSupportSession(school);
          }}
        />

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
          <section className="space-y-6 lg:col-span-7" aria-labelledby="dev-schools-heading">
            <Card className="shadow-md">
              <CardHeader className="space-y-4 pb-2">
                <div className="flex flex-col gap-2">
                  <Helper content="This is a list of all separate school databases in the system. You can create new schools or manage existing ones from here.">
                    <CardTitle id="dev-schools-heading" className="flex flex-wrap items-center gap-2 text-xl sm:text-2xl">
                      <span>School Instances</span>
                      <Badge variant="secondary" className="font-mono text-xs font-semibold tabular-nums">
                        {allSchools?.length ?? 0}
                      </Badge>
                    </CardTitle>
                  </Helper>
                  <CardDescription>
                    Create schools, sync the student portal index, and use each row for plans, backups, migration, and edits. Click a school name to open full usage insights.
                  </CardDescription>
                </div>
                <Separator />
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => setIsCreateSchoolDialogOpen(true)}><Plus className="mr-2 h-4 w-4" />Create New School</Button>
                  <Button variant="outline" onClick={() => void devSyncSchoolPublicIndex()}>
                    <RefreshCw className="mr-2 h-4 w-4" />Sync student portal index
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
            {schoolsLoading ? <p>Loading schools...</p> : schoolsError ? (
              <Alert variant="destructive">
                <AlertTitle>Cannot load schools</AlertTitle>
                <AlertDescription className="space-y-2 text-sm">
                  <p>
                    Firestore only allows listing all schools when your account UID is in{' '}
                    <code className="rounded bg-background px-1 py-0.5 text-xs">appConfig/global.developerUids</code>.
                    That entry is added automatically when developer login succeeds and the{' '}
                    <code className="rounded bg-background px-1 py-0.5 text-xs">addDeveloperMe</code> Cloud Function runs.
                  </p>
                  <p>
                    Sign out, sign in again at <code className="rounded bg-background px-1 py-0.5 text-xs">/developer</code> with your allowed Google account so{' '}
                    <code className="rounded bg-background px-1 py-0.5 text-xs">addDeveloperMe</code> can run.
                    You can also add your UID manually in the Firebase console under that document.
                  </p>
                  {firebaseUser?.uid ? (
                    <p className="font-mono text-xs opacity-90 pt-1">Your UID: {firebaseUser.uid}</p>
                  ) : null}
                </AlertDescription>
              </Alert>
            ) : (
              <ul className="space-y-2">
                {allSchools && [...allSchools].sort((a, b) => a.id.localeCompare(b.id)).map((school) => (
                  <li key={school.id} className="flex flex-wrap gap-2 items-center justify-between rounded-xl border bg-secondary/80 p-3 shadow-sm">
                    <div
                      onClick={() => setInsightFocusSchoolId(school.id)}
                      className="min-w-0 flex-1 cursor-pointer rounded-md p-2 -m-2 transition-colors hover:bg-accent/50"
                      title="Open usage insights"
                    >
                      <p className="font-bold font-code break-all">{school.id}</p>
                      <p className="text-sm text-muted-foreground">{school.name}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <p className="inline-flex items-center rounded-md bg-background px-2 py-0.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground border">
                          {formatActivePillars(school.appSettings)}
                        </p>
                        {isJewishOrthodoxSchool(school, school.id) ? (
                          <p className="inline-flex items-center rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-widest text-amber-800 border border-amber-500/30 dark:text-amber-200">
                            {SCHOOL_PROFILE_LABELS.jewish_orthodox}
                          </p>
                        ) : null}
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleCopyUrl(school.id); }}
                        className="mt-1 flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
                      >
                        {copiedId === school.id ? <Check className="w-3 h-3" /> : <Link2 className="w-3 h-3" />}
                        {copiedId === school.id ? 'Copied!' : 'Copy school link'}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setScreensSchool(school);
                        }}
                        className="mt-1 flex items-center gap-1.5 text-xs text-sky-600 hover:underline font-medium dark:text-sky-400"
                      >
                        <MonitorSmartphone className="w-3 h-3" aria-hidden />
                        Kiosk &amp; portal screens
                      </button>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleStartSupportSession(school)}
                            disabled={supportStartingSchool === school.id}
                          >
                            {supportStartingSchool === school.id ? (
                              <Loader2 className="w-4 h-4 animate-spin text-primary" />
                            ) : (
                              <Headset className="w-4 h-4 text-primary" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Open school admin as developer.</p>
                        </TooltipContent>
                      </Tooltip>
                      <AlertDialog>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <RefreshCw className="w-4 h-4 text-orange-500" />
                              </Button>
                            </AlertDialogTrigger>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Migrate school data to new structure.</p>
                          </TooltipContent>
                        </Tooltip>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Migrate Data for {school.id}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will run scripts to move data from the main document to subcollections. Run this if the school's data is not showing up correctly after a restore. This action is safe to run multiple times.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => devMigrateSchoolData(school.id)}>Migrate</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => void handleOpenPillarsModal(school)}>
                            <ShieldCheck className="w-4 h-4 text-violet-500" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Manage product pillars (attendance, library, homework).</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => handleOpenBackupModal(school)}>
                            <Database className="w-4 h-4 text-green-500" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Manage Backups</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => void handleOpenEditModal(school)}>
                            <Pencil className="w-4 h-4 text-blue-500" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Edit school name and passcode.</p>
                        </TooltipContent>
                      </Tooltip>
                      <AlertDialog>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </AlertDialogTrigger>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Permanently delete this school and all its data.</p>
                          </TooltipContent>
                        </Tooltip>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the school database for <span className="font-bold font-code">{school.id}</span>. A final backup will be created automatically.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={async () => await deleteSchool(school.id)}>Continue</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </li>
                ))}
                {(!allSchools || allSchools.length === 0) && (
                  <p className="text-center text-muted-foreground italic py-4">No schools found. Create one to begin.</p>
                )}
              </ul>
            )}
          </CardContent>
            </Card>
          </section>

          <aside className="space-y-6 lg:col-span-5" aria-label="Developer utilities">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Headset className="h-5 w-5 text-muted-foreground" aria-hidden />
                  Live remote support
                </CardTitle>
                <CardDescription>
                  Staff can share their browser screen from Help and support. Open an active session here.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DeveloperRemoteSupportViewer schoolIds={(allSchools || []).map((school) => school.id)} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <Helper content="Stored in this browser only (localStorage). Visit the home page / to see the result.">
                  <CardTitle className="text-base">Home page (/) logo</CardTitle>
                </Helper>
                <CardDescription>
                  Choose animated cinematic SVG or the static PNG logo.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={homeLogoMode}
                  onValueChange={(v) => {
                    const m = v as HomeLogoMode;
                    setHomeLogoMode(m);
                    setHomeLogoModeState(m);
                    playSound('click');
                    toast({
                      title: 'Home logo preference saved',
                      description:
                        m === 'animated'
                          ? 'The landing page uses the cinematic animation.'
                          : 'The landing page uses the static /logo.png image.',
                    });
                  }}
                  className="gap-3"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="animated" id="home-logo-animated" />
                    <Label htmlFor="home-logo-animated" className="cursor-pointer font-normal leading-snug">
                      Animated (cinematic SVG)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="static" id="home-logo-static" />
                    <Label htmlFor="home-logo-static" className="cursor-pointer font-normal leading-snug">
                      Static image (<code className="rounded bg-muted px-1 py-0.5 text-xs">/logo.png</code>)
                    </Label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Sample Schools</CardTitle>
                <CardDescription>
                  Reset built-in demo schools to default data (rewards + School Office). This wipes local changes for that sample only.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Button
                  variant="outline"
                  onClick={() => void devResetSampleSchool('yeshiva')}
                  className="justify-center sm:flex-1"
                >
                  <span className="font-semibold">Reset &quot;yeshiva&quot;</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => void devResetSampleSchool('schoolabc')}
                  className="justify-center sm:flex-1"
                >
                  <span className="font-semibold">Reset &quot;schoolabc&quot;</span>
                </Button>
              </CardContent>
              <CardContent className="space-y-3 border-t pt-4">
                <p className="text-sm text-muted-foreground">
                  Face login stores embeddings in Firestore <code className="rounded bg-muted px-1 py-0.5 text-xs">faceAuth</code> (not visible in Admin student list unless you open each student). &quot;Unclear match&quot; means two or more enabled enrollments scored nearly the same.
                </p>
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <Button
                    variant="secondary"
                    disabled={faceEnrollmentBusy}
                    onClick={() => void loadFaceEnrollments('schoolabc')}
                  >
                    List face enrollments (schoolabc)
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={faceEnrollmentBusy}
                    onClick={() => void clearSampleFaceEnrollments('schoolabc', ['100'])}
                  >
                    Clear orphans (keep 100)
                  </Button>
                </div>
                {faceEnrollmentSchool === 'schoolabc' && faceEnrollments ? (
                  <ul className="rounded-md border bg-muted/30 p-3 text-sm">
                    {faceEnrollments.length === 0 ? (
                      <li className="text-muted-foreground">No faceAuth documents.</li>
                    ) : (
                      faceEnrollments.map((row) => (
                        <li key={row.studentId} className="font-mono text-xs">
                          {row.studentId}
                          {' · '}
                          {row.enabled ? 'enabled' : 'disabled'}
                          {' · '}
                          {row.scanCount} scan{row.scanCount === 1 ? '' : 's'}
                        </li>
                      ))
                    )}
                  </ul>
                ) : null}
              </CardContent>
            </Card>

            <Card className="overflow-hidden border shadow-md">
              <CardHeader className="border-b bg-muted/25 pb-4">
                <Helper content="Upload a global logo for the arcade app itself. This can be used in marketing pages, headers, and the portal shell.">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ImageIcon className="h-5 w-5 text-muted-foreground" aria-hidden /> App logo
                  </CardTitle>
                </Helper>
                <CardDescription className="text-pretty">
                  One image for the whole product (headers, portal shell, marketing). Not tied to individual schools.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="grid gap-6 sm:grid-cols-[minmax(0,200px)_1fr] sm:items-start">
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Live preview</span>
                    <div
                      className={cn(
                        'relative flex aspect-square w-full max-w-[200px] mx-auto sm:mx-0 overflow-hidden rounded-2xl border-2 border-border bg-muted shadow-inner',
                        'ring-1 ring-black/5 dark:ring-white/10',
                      )}
                      aria-live="polite"
                    >
                      {appLogoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={appLogoUrl}
                          alt=""
                          className={cn(
                            'h-full w-full',
                            settings.logoDisplayMode === 'cover' ? 'object-cover' : 'object-contain p-3',
                          )}
                        />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-4 text-center">
                          <ImageIcon className="h-10 w-10 text-muted-foreground/50" aria-hidden />
                          <span className="text-xs font-medium text-muted-foreground">No logo yet</span>
                        </div>
                      )}
                    </div>
                    <p className="text-center text-xs text-muted-foreground sm:text-left">
                      Preview uses your display mode below ({settings.logoDisplayMode === 'contain' ? 'fit entire image' : 'fill frame'}).
                    </p>
                  </div>

                  <div className="flex min-w-0 flex-col gap-5">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        In the app shell
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant={settings.logoDisplayMode === 'contain' ? 'default' : 'outline'}
                          className="min-w-[7rem]"
                          aria-pressed={settings.logoDisplayMode === 'contain'}
                          onClick={() => updateSettings({ logoDisplayMode: 'contain' })}
                        >
                          Fit
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={settings.logoDisplayMode === 'cover' ? 'default' : 'outline'}
                          className="min-w-[7rem]"
                          aria-pressed={settings.logoDisplayMode === 'cover'}
                          onClick={() => updateSettings({ logoDisplayMode: 'cover' })}
                        >
                          Fill
                        </Button>
                      </div>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        <span className="font-medium text-foreground/80">Fit</span> keeps the whole mark visible with padding.
                        <span className="mx-1 text-border">·</span>
                        <span className="font-medium text-foreground/80">Fill</span> crops to the frame like a cover photo.
                      </p>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Replace logo
                      </span>
                      <Button
                        type="button"
                        variant="secondary"
                        className="w-full sm:w-auto"
                        onClick={handleAppLogoUploadClick}
                        disabled={isAppLogoUploading}
                      >
                        {isAppLogoUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                        {isAppLogoUploading ? 'Uploading…' : 'Upload new image'}
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        PNG, JPG, WebP, or SVG · up to 10 MB · raster files can be cropped to a square after choosing.
                      </p>
                      <input
                        ref={appLogoInputRef}
                        type="file"
                        accept={LOGO_UPLOAD_ACCEPT}
                        className="sr-only"
                        tabIndex={-1}
                        onChange={handleAppLogoUpload}
                      />
                    </div>
                  </div>
                </div>

                {appLogoHistory.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <Label className="text-sm font-semibold">Version history</Label>
                        <span className="text-xs text-muted-foreground">Click to make active</span>
                      </div>
                      <div
                        className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 pt-0.5 [scrollbar-width:thin]"
                        role="list"
                        aria-label="Previous app logos"
                      >
                        {appLogoHistory.map((url, idx) => {
                          const isActive = url === appLogoUrl;
                          return (
                            <button
                              key={`${url}-${idx}`}
                              type="button"
                              role="listitem"
                              title={isActive ? 'Current logo' : 'Restore this logo'}
                              onClick={() => handleSetAppLogoUrl(url)}
                              className={cn(
                                'relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 bg-muted/80 transition-shadow hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                                isActive ? 'border-primary shadow-md ring-2 ring-primary/30' : 'border-border',
                              )}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={url}
                                alt=""
                                className={settings.logoDisplayMode === 'cover' ? 'h-full w-full object-cover' : 'h-full w-full object-contain p-1.5'}
                              />
                              {isActive && (
                                <span className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full border border-primary/20 bg-primary text-primary-foreground shadow-md" title="Currently active">
                                  <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Alert variant="destructive" className="border-2">
              <Helper content="This tool attempts to recover the main document for a school that was accidentally deleted or had its data overwritten. It finds the most recent backup file and restores it. You must know the exact School ID.">
                <AlertTitle className="flex items-center gap-2 font-bold">
                  <LifeBuoy className="h-4 w-4" />
                  Emergency Data Recovery
                </AlertTitle>
              </Helper>
              <AlertDescription>
                If a school was accidentally deleted or its data overwritten, you can attempt to restore it here. This will restore the main school document from its most recent backup. You may then need to use the &quot;Migrate Data&quot; tool on the school.
              </AlertDescription>
              <div className="mt-4 flex flex-col items-stretch gap-2 sm:flex-row sm:items-end">
                <div className="w-full flex-1 sm:w-auto">
                  <Label htmlFor="orphan-id" className="font-bold">Orphaned School ID</Label>
                  <Input
                    id="orphan-id"
                    placeholder="e.g. elisheva"
                    value={orphanSchoolId}
                    onChange={e => setOrphanSchoolId(e.target.value.trim().toLowerCase())}
                  />
                </div>
                <Button className="shrink-0" onClick={handleFindLatestBackup} disabled={!orphanSchoolId || isFindingBackup}>
                  {isFindingBackup ? 'Searching…' : 'Find Latest Backup'}
                </Button>
              </div>
              {latestBackup && (
                <div className="mt-4 flex flex-col items-stretch gap-3 rounded-lg bg-secondary p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-bold">Latest Backup Found!</p>
                    <p className="font-code text-sm">Date: {new Date(parseInt(latestBackup.id)).toLocaleString()}</p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button className="shrink-0">Restore This Backup</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will restore the school document &apos;{orphanSchoolId}&apos; using the backup from {new Date(parseInt(latestBackup.id)).toLocaleString()}. The school will reappear in the list.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRestoreOrphan}>Restore</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </Alert>

            <Card>
              <CardHeader>
                <Helper content="These actions affect all schools in the system simultaneously.">
                  <CardTitle className="text-base">Global Actions</CardTitle>
                </Helper>
                <CardDescription>System-wide backup and scheduler information.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="flex flex-col justify-between rounded-lg border bg-secondary p-4">
                  <Helper content="This will create a full data snapshot for every single school instance in the database. This is useful for creating a system-wide save point.">
                    <div>
                      <h3 className="flex items-center gap-2 font-bold"><Database className="h-4 w-4 shrink-0" aria-hidden />One-Click Backup</h3>
                      <p className="mt-1 text-sm text-muted-foreground">Create a new backup for every school instance instantly.</p>
                    </div>
                  </Helper>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="secondary" className="mt-4 w-full sm:w-auto">Backup All Schools</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will trigger a backup for all {allSchools?.length || 0} school databases. This may take a few moments to complete.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleBackupAll}>Continue</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
                <div className="flex flex-col justify-between rounded-lg border bg-secondary p-4">
                  <div>
                    <h3 className="flex items-center gap-2 font-bold"><ShieldCheck className="h-4 w-4 shrink-0" aria-hidden />Scheduled Daily Backups</h3>
                        <p className="mt-1 text-sm text-muted-foreground">Full-depth backups of all schools run automatically every 24 hours via Cloud Scheduler. Includes all students, classes, teachers, reward items, coupons, categories, and activity history. Old backups are automatically pruned after 30 days.</p>
                  </div>
                  <div className="mt-4 flex items-center gap-2 rounded bg-background p-2 text-xs text-muted-foreground">
                    <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span>Each backup is signed with a SHA-256 integrity hash for verification.</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>

        <Dialog open={isCreateSchoolDialogOpen} onOpenChange={setIsCreateSchoolDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New School</DialogTitle>
              <DialogDescription>
                Enter the new school's details below. The ID should be short and contain no spaces.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-1">
                <Label htmlFor="new-school-id">School ID</Label>
                <Input
                  id="new-school-id"
                  placeholder="e.g., 'washington_hs'"
                  value={newSchoolId}
                  onChange={(e) => setNewSchoolId(e.target.value.trim().toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="new-school-name">School Name</Label>
                <Input
                  id="new-school-name"
                  placeholder="e.g., Washington High School"
                  value={newSchoolName}
                  onChange={(e) => setNewSchoolName(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="new-school-access-passcode">School Login Passcode</Label>
                <Input
                  id="new-school-access-passcode"
                  placeholder="1234"
                  value={newSchoolAccessPasscode}
                  onChange={(e) => setNewSchoolAccessPasscode(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="new-admin-passcode">Admin Login Passcode</Label>
                <Input
                  id="new-admin-passcode"
                  placeholder="1234"
                  value={newAdminPasscode}
                  onChange={(e) => setNewAdminPasscode(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setIsCreateSchoolDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateSchool}>Create School</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!createdSchoolInfo} onOpenChange={() => setCreatedSchoolInfo(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>School Created Successfully!</AlertDialogTitle>
              <AlertDialogDescription>
                Send the school their unique link and passcodes below.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 text-center my-4 space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">School Link</p>
                <div className="bg-white dark:bg-slate-900 rounded-md p-2 flex items-center gap-2">
                  <code className="text-xs break-all flex-1 text-left">{createdSchoolInfo && getSchoolUrl(createdSchoolInfo.id)}</code>
                  <Button size="sm" variant="outline" onClick={() => createdSchoolInfo && handleCopyUrl(createdSchoolInfo.id)}>
                    {copiedId === createdSchoolInfo?.id ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="grid gap-4 border-t pt-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">School Login</p>
                  <p className="font-code font-bold text-3xl tracking-widest text-primary">{createdSchoolInfo?.schoolAccessPasscode}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Admin Login</p>
                  <p className="font-code font-bold text-3xl tracking-widest text-primary">{createdSchoolInfo?.adminPasscode}</p>
                </div>
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setCreatedSchoolInfo(null)}>Close</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={!!editingSchool} onOpenChange={handleCloseEditModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit School: <span className="font-code">{editingSchool?.id}</span></DialogTitle>
              <DialogDescription>
                Update the school&apos;s name, login passcodes, or community profile.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <Label className="text-sm font-bold">Jewish Orthodox school</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Unlocks community-specific options such as Hebrew dates and Jewish holidays on the bulletin board.
                      Yeshiva and other Orthodox schools should have this enabled.
                    </p>
                  </div>
                  <Switch
                    checked={editingJewishOrthodox}
                    onCheckedChange={setEditingJewishOrthodox}
                    aria-label="Jewish Orthodox school"
                  />
                </div>
                {editingJewishOrthodox ? (
                  <p className="text-[11px] font-medium text-amber-800 dark:text-amber-200">
                    Profile: {SCHOOL_PROFILE_LABELS.jewish_orthodox}
                  </p>
                ) : null}
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-school-name" className="text-right">Name</Label>
                <Input
                  id="edit-school-name"
                  value={editingSchoolName}
                  onChange={(e) => setEditingSchoolName(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="new-school-access-passcode-edit" className="text-right">School Login</Label>
                <Input
                  id="new-school-access-passcode-edit"
                  value={editingSchoolAccessPasscode}
                  onChange={(e) => setEditingSchoolAccessPasscode(e.target.value)}
                  className="col-span-3 font-code tracking-widest"
                  autoComplete="off"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="new-admin-passcode-edit" className="text-right">Admin Login</Label>
                <Input
                  id="new-admin-passcode-edit"
                  value={editingAdminPasscode}
                  onChange={(e) => setEditingAdminPasscode(e.target.value)}
                  className="col-span-3 font-code tracking-widest"
                  autoComplete="off"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={handleCloseEditModal}>Cancel</Button>
              <Button onClick={handleUpdateSchool}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!pillarSchool} onOpenChange={(open) => !open && handleClosePillarsModal()}>
            <DialogContent size="md">
            <DialogHeader>
              <DialogTitle>Product pillars: <span className="font-code">{pillarSchool?.id}</span></DialogTitle>
              <DialogDescription>
                Choose which product pillars this school can use, then choose which accessible pillars start on by default. Unavailable pillars still appear in school settings, but are disabled.
              </DialogDescription>
            </DialogHeader>
            {pillarSchool ? (
                <div className="space-y-4 py-2">
                  {PRODUCT_PILLAR_KEYS.map((key) => {
                    const hasAccess = editingPillarAccess[key];
                    return (
                    <div key={key} className={cn("rounded-xl border p-4 space-y-3", !hasAccess && "bg-muted/40 opacity-75")}>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <Label className="text-sm font-bold">{PRODUCT_PILLAR_LABELS[key]}</Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            {key === 'payClassroom' &&
                              'Classroom seating, quick awards, and full-screen classroom view for teachers.'}
                            {key === 'payAttendance' && 'Class sign-in, attendance rewards, and related admin tabs.'}
                            {key === 'payLibrary' && 'Library catalog, checkout scans, and library notifications.'}
                            {key === 'payHomework' && 'Teacher homework rewards (not shown on the student portal).'}
                            {key === 'payOffice' && 'Grades, billing, and office-only student roster (not shared with rewards).'}
                          </p>
                        </div>
                        {key === 'payOffice' && hasAccess && editingPillars[key] ? (
                          <OfficePortalEntryLink
                            schoolId={pillarSchool.id}
                            className="text-xs font-bold text-teal-700 underline underline-offset-4 hover:text-teal-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 dark:text-teal-300 dark:hover:text-teal-100"
                          />
                        ) : null}
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="flex items-center justify-between rounded-lg border bg-background/70 p-3">
                          <div>
                            <Label className="text-xs font-bold uppercase tracking-wide">Available</Label>
                            <p className="text-[11px] text-muted-foreground">Included for this school</p>
                          </div>
                          <Switch
                            checked={hasAccess}
                            onCheckedChange={(checked) => {
                              setEditingPillarAccess((prev) => ({ ...prev, [key]: checked }));
                              if (!checked) setEditingPillars((prev) => ({ ...prev, [key]: false }));
                            }}
                            aria-label={`${PRODUCT_PILLAR_LABELS[key]} access`}
                          />
                        </div>
                        <div className="flex items-center justify-between rounded-lg border bg-background/70 p-3">
                          <div>
                            <Label className="text-xs font-bold uppercase tracking-wide">Default on</Label>
                            <p className="text-[11px] text-muted-foreground">Starts enabled when settings are first created</p>
                          </div>
                          <Switch
                            checked={hasAccess && editingPillars[key]}
                            disabled={!hasAccess}
                            onCheckedChange={(checked) =>
                              setEditingPillars((prev) => ({ ...prev, [key]: checked }))
                            }
                            aria-label={`${PRODUCT_PILLAR_LABELS[key]} default`}
                          />
                        </div>
                      </div>
                    </div>
                  );})}
                </div>
            ) : null}
            <DialogFooter>
              <Button variant="secondary" onClick={handleClosePillarsModal}>Cancel</Button>
              <Button onClick={() => void handleSavePillars()}>Save pillars</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!backupSchool} onOpenChange={handleCloseBackupModal}>
            <DialogContent size="lg">
            <DialogHeader>
              <DialogTitle>Manage Backups for <span className="font-code">{backupSchool?.id}</span></DialogTitle>
              <DialogDescription>
                      Full-depth backups include all students, classes, teachers, reward items, coupons, categories, and activity history. Scheduled backups run daily via Cloud Scheduler.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Button onClick={handleCreateBackup} className="mb-4"><Plus className="mr-2" />Create Full Backup</Button>
              <ul className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {schoolBackups.length > 0 ? schoolBackups.map(backup => (
                  <li key={backup.id} className="bg-secondary p-3 rounded border space-y-1.5">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <span className="font-code text-sm">
                          {backup.createdAt ? new Date(backup.createdAt).toLocaleString() : 'Unknown date'}
                        </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {backup.type && (
                            <span className={cn("text-xs px-1.5 py-0.5 rounded font-medium",
                              backup.type === 'manual' && 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
                              backup.type === 'scheduled' && 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
                              backup.type === 'pre-delete' && 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
                              backup.type === 'pre-restore' && 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
                            )}>
                              {backup.type}
                            </span>
                          )}
                          {backup.status && (
                            <span className={cn("text-xs px-1.5 py-0.5 rounded font-medium",
                              backup.status === 'complete' && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
                              backup.status === 'failed' && 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
                            )}>
                              {backup.status}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        {backup.status !== 'failed' && (
                          <>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="sm" variant="outline" onClick={() => devDownloadBackup(backupSchool!.id, backup.id)}><Download className="h-4 w-4" /></Button>
                              </TooltipTrigger>
                              <TooltipContent><p>Download</p></TooltipContent>
                            </Tooltip>
                            <AlertDialog>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <AlertDialogTrigger asChild>
                                    <Button size="sm" variant="outline"><Upload className="h-4 w-4" /></Button>
                                  </AlertDialogTrigger>
                                </TooltipTrigger>
                                <TooltipContent><p>Full Restore</p></TooltipContent>
                              </Tooltip>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Restore from this backup?</AlertDialogTitle>
                                  <AlertDialogDescription>
                    This will fully restore {backupSchool?.id} from the backup taken on {backup.createdAt ? new Date(backup.createdAt).toLocaleString() : 'unknown date'}. All current data (students, classes, teachers, reward items, coupons, categories, and activities) will be replaced. A safety backup will be created first.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleRestoreBackup(backup.id)}>Restore</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                            {backup.storagePath && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="sm" variant="outline" onClick={() => handleVerifyBackup(backup.id)}><ShieldCheck className="h-4 w-4" /></Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Verify SHA-256 Integrity</p></TooltipContent>
                              </Tooltip>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    {backup.totalDocs != null && backup.totalDocs > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {backup.totalDocs.toLocaleString()} docs &middot; {formatBytes(backup.sizeBytes || 0)}
                        {backup.collections && ` (${backup.collections.students || 0} students, ${backup.collections.activities || 0} activities)`}
                      </p>
                    )}
                    {backup.error && (
                      <p className="text-xs text-red-500 dark:text-red-400">{backup.error}</p>
                    )}
                  </li>
                )) : <p className="text-center text-sm text-muted-foreground italic py-4">No backups found for this school.</p>}
              </ul>
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={handleCloseBackupModal}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {cropImageSrc && (
          <ImageCropper 
            imageSrc={cropImageSrc}
            onCancel={() => { setCropImageSrc(null); setPendingLogoFile(null); }}
            onCropComplete={processAppLogoUpload}
            showSkip
            onSkip={() => pendingLogoFile && processAppLogoUpload(pendingLogoFile)}
            title="App Logo Cropper"
            aspectRatio={1}
          />
        )}
      </div>
    </TooltipProvider>
  )
}
