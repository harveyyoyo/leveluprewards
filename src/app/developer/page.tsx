
'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/components/AppProvider';
import { useFirestore, useFirebase, useCollection, useMemoFirebase, useFunctions } from '@/firebase';
import { collection, doc, getDoc, setDoc, query, getDocs, orderBy, limit, getCountFromServer } from 'firebase/firestore';
import {
  Plus, Trash2, Pencil, Database, Download, Upload, ShieldCheck, LifeBuoy, RefreshCw, Link2, Check, Loader2, Image as ImageIcon, Sparkles, Server, FolderGit2
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import type { BackupInfo } from '@/lib/types';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { useSettings } from '@/components/providers/SettingsProvider';
import { Helper } from '@/components/ui/helper';
import { httpsCallable } from 'firebase/functions';
import { ANIMATED_BACKGROUND_STYLES, type AnimatedBackgroundStyle } from '@/lib/animatedBackdrop';
import { ImageCropper } from '@/components/ImageCropper';

interface SchoolInfo {
  id: string;
  name: string;
}

interface SchoolStats {
  students: number;
  classes: number;
  teachers: number;
  categories: number;
  prizes: number;
  coupons: number;
  usedCoupons: number;
  totalPointsAwarded: number;
}


const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

function SchoolListItemStats({ schoolId }: { schoolId: string }) {
  const [stats, setStats] = useState<{students: number, teachers: number, sizeBytes?: number} | null>(null);
  const firestore = useFirestore();

  useEffect(() => {
    if (!firestore || !schoolId) return;
    const fetchStats = async () => {
      try {
        const studentSnap = await getCountFromServer(collection(firestore, 'schools', schoolId, 'students'));
        const teacherSnap = await getCountFromServer(collection(firestore, 'schools', schoolId, 'teachers'));
        
        let sizeBytes: number | undefined;
        const backupsColRef = collection(firestore, 'schools', schoolId, 'backups');
        const backupSnap = await getDocs(query(backupsColRef, orderBy('createdAt', 'desc'), limit(1)));
        if (!backupSnap.empty) {
          sizeBytes = backupSnap.docs[0].data()?.sizeBytes;
        }

        setStats({
          students: studentSnap.data().count,
          teachers: teacherSnap.data().count,
          sizeBytes
        });
      } catch (error) {
        console.error("Error fetching list stats:", error);
      }
    };
    fetchStats();
  }, [firestore, schoolId]);

  if (!stats) return <div className="text-xs text-muted-foreground mt-1 h-5 animate-pulse flex items-center bg-slate-100 rounded px-2 w-32">Loading stats...</div>;

  return (
    <div className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-1.5">
      <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-medium border">{stats.students} students</span>
      <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-medium border">{stats.teachers} teachers</span>
      {stats.sizeBytes !== undefined ? (
        <span className="bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 px-1.5 py-0.5 rounded font-medium border border-indigo-200 dark:border-indigo-800" title="Based on last backup">
          Database size: ~{formatBytes(stats.sizeBytes)}
        </span>
      ) : (
        <span className="bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 px-1.5 py-0.5 rounded font-medium border border-amber-200 dark:border-amber-800" title="Based on last backup">
          Database size: Unknown (No backup)
        </span>
      )}
    </div>
  );
}

function SchoolStatsModal({ school, isOpen, onOpenChange }: { school: SchoolInfo | null, isOpen: boolean, onOpenChange: (open: boolean) => void }) {
  const [stats, setStats] = useState<SchoolStats | null>(null);
  const [loading, setLoading] = useState(true);
  const firestore = useFirestore();

  useEffect(() => {
    if (!isOpen || !school || !firestore) return;

    const fetchStats = async () => {
      setLoading(true);
      try {
        const collections = ['students', 'classes', 'teachers', 'categories', 'prizes', 'coupons'];
        const promises = collections.map(col => getDocs(collection(firestore, 'schools', school.id, col)));
        const snapshots = await Promise.all(promises);

        const couponsSnapshot = snapshots[5];
        const usedCoupons = couponsSnapshot.docs.filter(doc => doc.data().used).length;

        const totalPointsAwarded = couponsSnapshot.docs
          .filter((c) => c.data().used)
          .reduce((sum, c) => sum + c.data().value, 0) || 0;


        setStats({
          students: snapshots[0].size,
          classes: snapshots[1].size,
          teachers: snapshots[2].size,
          categories: snapshots[3].size,
          prizes: snapshots[4].size,
          coupons: snapshots[5].size,
          usedCoupons: usedCoupons,
          totalPointsAwarded: totalPointsAwarded
        });
      } catch (error) {
        console.error("Error fetching school stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [isOpen, school, firestore]);

  if (!school) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Database Stats for <span className="font-code">{school.id}</span></DialogTitle>
          <DialogDescription>
            {`An overview of the database statistics for "${school.name || school.id}".`}
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-4 text-center">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
          </div>
        ) : stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-4 text-center">
            <div className="bg-secondary p-4 rounded-lg">
              <p className="text-2xl font-bold">{stats.students}</p>
              <p className="text-sm text-muted-foreground">Students</p>
            </div>
            <div className="bg-secondary p-4 rounded-lg">
              <p className="text-2xl font-bold">{stats.classes}</p>
              <p className="text-sm text-muted-foreground">Classes</p>
            </div>
            <div className="bg-secondary p-4 rounded-lg">
              <p className="text-2xl font-bold">{stats.teachers}</p>
              <p className="text-sm text-muted-foreground">Teachers</p>
            </div>
            <div className="bg-secondary p-4 rounded-lg">
              <p className="text-2xl font-bold">{stats.coupons} / {stats.usedCoupons}</p>
              <p className="text-sm text-muted-foreground">Coupons (Used)</p>
            </div>
            <div className="bg-secondary p-4 rounded-lg">
              <p className="text-2xl font-bold">{stats.prizes}</p>
              <p className="text-sm text-muted-foreground">Prize Types</p>
            </div>
            <div className="bg-secondary p-4 rounded-lg">
              <p className="text-2xl font-bold">{(stats.totalPointsAwarded || 0).toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Points Awarded</p>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function DeveloperPage() {
  const {
    loginState, isInitialized, isUserLoading, createSchool, deleteSchool, updateSchool,
    devCreateBackup, devRestoreFromBackup, devDownloadBackup, devBackupAllSchools,
    devVerifyBackup, devMigrateSchoolData, devResetSampleSchool, userId
  } = useAppContext();
  const firestore = useFirestore();
  const functions = useFunctions();
  const { auth } = useFirebase();
  const router = useRouter();
  const { toast } = useToast();
  const playSound = useArcadeSound();
  const { settings, updateSettings } = useSettings();

  const [isCreateSchoolDialogOpen, setIsCreateSchoolDialogOpen] = useState(false);
  const [newSchoolId, setNewSchoolId] = useState('');
  const [newSchoolName, setNewSchoolName] = useState('');
  const [newSchoolPasscode, setNewSchoolPasscode] = useState('');

  const [createdSchoolInfo, setCreatedSchoolInfo] = useState<{ id: string; passcode: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingSchool, setEditingSchool] = useState<SchoolInfo | null>(null);
  const [editingSchoolName, setEditingSchoolName] = useState('');
  const [editingPasscode, setEditingPasscode] = useState('');
  const [backupSchool, setBackupSchool] = useState<SchoolInfo | null>(null);
  const [schoolBackups, setSchoolBackups] = useState<BackupInfo[]>([]);
  const [statsSchool, setStatsSchool] = useState<SchoolInfo | null>(null);

  const [orphanSchoolId, setOrphanSchoolId] = useState('');
  const [latestBackup, setLatestBackup] = useState<{ id: string } | null>(null);
  const [isFindingBackup, setIsFindingBackup] = useState(false);

  const [appLogoUrl, setAppLogoUrl] = useState<string | null>(null);
  const [appLogoHistory, setAppLogoHistory] = useState<string[]>([]);
  const [isAppLogoUploading, setIsAppLogoUploading] = useState(false);
  const [cropLogoSrc, setCropLogoSrc] = useState<string | null>(null);
  const appLogoInputRef = useRef<HTMLInputElement | null>(null);

  const schoolsQuery = useMemoFirebase(() => (loginState === 'developer' && !isUserLoading) ? collection(firestore, 'schools') : null, [loginState, firestore, isUserLoading]);
  const { data: allSchools, isLoading: schoolsLoading } = useCollection<SchoolInfo>(schoolsQuery);

  useEffect(() => {
    if (isInitialized && loginState !== 'developer') {
      router.replace('/');
    }
  }, [isInitialized, loginState, router]);

  // Note: Admin roles are provisioned by backend-only code (Cloud Functions / Admin SDK).
  // We intentionally do not write to roles collections from the client.

  // Developer can manually create sample schools if needed using the controls below.

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

    if (!functions || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Cannot upload app logo',
        description: 'Cloud Functions are not available. Refresh and try again.',
      });
      e.target.value = '';
      return;
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    const maxSizeBytes = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(file.type)) {
      playSound('error');
      toast({
        variant: 'destructive',
        title: 'Unsupported file type',
        description: 'Please use PNG, JPG, or WebP.',
      });
      e.target.value = '';
      return;
    }
    if (file.size > maxSizeBytes) {
      playSound('error');
      toast({
        variant: 'destructive',
        title: 'File too large',
        description: 'Logo must be under 5MB.',
      });
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCropLogoSrc(reader.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };
  const uploadProcessedLogo = async (imageBase64: string, contentType: string) => {
    if (!functions) return;
    try {
      setIsAppLogoUploading(true);
      toast({ title: 'Uploading app logo…', description: 'Please wait.' });

      const uploadLogo = httpsCallable<{ imageBase64: string; contentType: string }, { logoUrl: string }>(functions, 'uploadAppLogo');
      const res = await uploadLogo({
        imageBase64,
        contentType,
      });

      const data = res.data;
      if (!data?.logoUrl) {
        throw new Error('No logo URL returned');
      }

      setAppLogoUrl(data.logoUrl);
      setAppLogoHistory((prev) => [data.logoUrl, ...prev.filter((url) => url !== data.logoUrl)]);
      playSound('success');
      toast({ title: 'App logo updated!', description: 'This logo can be used across the app shell.' });
    } catch (error: unknown) {
      console.error('App logo upload failed', error);
      playSound('error');
      const err = error as { code?: string; message?: string; details?: unknown };
      const code = err?.code ?? '';
      const message = String(err?.message ?? '');
      let description = message || 'Could not save the logo. Try again or use a smaller image.';
      if (err?.details) {
        try {
          description += ' ' + (typeof err.details === 'string' ? err.details : JSON.stringify(err.details));
        } catch {
          // ignore
        }
      }
      if (code === 'functions/unauthenticated') {
        description = 'You must be logged in as a developer. Please sign in again.';
      } else if (code === 'functions/permission-denied') {
        description = 'You need developer access to update the app logo.';
      } else if (code === 'functions/invalid-argument') {
        description = message || 'Invalid image. Use PNG, JPG, or WebP under 5MB.';
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

  const handleSkipCrop = async () => {
    const src = cropLogoSrc;
    setCropLogoSrc(null);
    if (!src) return;
    
    const base64 = src.includes(',') ? src.split(',')[1] : src;
    const typeIndicator = src.substring(0, 30);
    const contentType = typeIndicator.includes('image/png') ? 'image/png' : typeIndicator.includes('image/webp') ? 'image/webp' : 'image/jpeg';
    
    await uploadProcessedLogo(base64, contentType);
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setCropLogoSrc(null);

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

    await uploadProcessedLogo(imageBase64, croppedBlob.type || 'image/jpeg');

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
    const result = await createSchool(newSchoolId, newSchoolName, newSchoolPasscode);
    if (result) {
      setCreatedSchoolInfo({ id: result.cleanId, passcode: result.passcode });
    }
    setIsCreateSchoolDialogOpen(false);
    setNewSchoolId('');
    setNewSchoolName('');
    setNewSchoolPasscode('');
  };

  const handleOpenEditModal = (school: SchoolInfo) => {
    setEditingSchool(school);
    setEditingSchoolName(school.name);
    setEditingPasscode(''); // Clear passcode for security
  }

  const handleCloseEditModal = () => {
    setEditingSchool(null);
    setEditingSchoolName('');
    setEditingPasscode('');
  }

  const handleUpdateSchool = async () => {
    if (!editingSchool) return;

    const updates: { name?: string; passcode?: string } = {};
    if (editingSchoolName && editingSchoolName !== editingSchool.name) {
      updates.name = editingSchoolName;
    }
    if (editingPasscode) {
      updates.passcode = editingPasscode;
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

  // Removed redefined formatBytes to avoid duplication

  const getSchoolUrl = (id: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/s/${id}`;
  };

  const handleCopyUrl = async (id: string) => {
    const url = getSchoolUrl(id);
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    playSound('click');
    toast({ title: 'Link copied!' });
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!isInitialized || loginState !== 'developer' || isUserLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Button disabled variant="ghost" size="lg" className="text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading...
        </Button>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6 px-4 sm:px-6 lg:px-8 pb-8 pt-2">

        <Card>
          <CardHeader>
            <CardTitle>Sample Schools</CardTitle>
            <CardDescription>
              Quickly reset the built-in demo schools back to their default data. This will wipe any changes (students, themes, prizes, etc.) for that sample only.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={() => devResetSampleSchool('yeshiva')}
              className="justify-between sm:w-auto"
            >
              <span className="font-bold">Reset &quot;yeshiva&quot;</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => devResetSampleSchool('schoolabc')}
              className="justify-between sm:w-auto"
            >
              <span className="font-bold">Reset &quot;schoolabc&quot;</span>
            </Button>
          </CardContent>
        </Card>

        <Card className="border shadow-md">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <Helper content="Upload a global logo for the arcade app itself. This can be used in marketing pages, headers, and the portal shell.">
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-slate-600" /> App Logo
                </CardTitle>
              </Helper>
              <CardDescription>Developer-level branding for the overall app (not per-school).</CardDescription>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="h-16 w-16 rounded-2xl overflow-hidden bg-muted border border-border/70 flex items-center justify-center text-xs font-semibold text-muted-foreground">
                {appLogoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={appLogoUrl} alt="Current app logo" className={settings.logoDisplayMode === 'cover' ? 'h-full w-full object-cover' : 'h-full w-full object-contain'} />
                ) : (
                  <span>App</span>
                )}
              </div>
              {appLogoHistory.length > 0 && (
                <div className="flex flex-col items-center gap-1 w-full">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Previous (click to use)</span>
                  <div className="flex flex-wrap justify-center gap-2 max-w-xs">
                    {appLogoHistory.map((url, idx) => (
                      <button
                        key={`${url}-${idx}`}
                        type="button"
                        onClick={() => handleSetAppLogoUrl(url)}
                        className="h-10 w-10 rounded-xl overflow-hidden border-2 border-border hover:border-primary transition-colors bg-muted/60 flex-shrink-0"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="Previous app logo" className={settings.logoDisplayMode === 'cover' ? 'h-full w-full object-cover' : 'h-full w-full object-contain'} />
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-1 w-full">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Display</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => updateSettings({ logoDisplayMode: 'contain' })}
                    className={`flex-1 py-1.5 px-3 rounded-md text-sm font-bold ${settings.logoDisplayMode === 'contain' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                  >
                    Fit
                  </button>
                  <button
                    type="button"
                    onClick={() => updateSettings({ logoDisplayMode: 'cover' })}
                    className={`flex-1 py-1.5 px-3 rounded-md text-sm font-bold ${settings.logoDisplayMode === 'cover' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                  >
                    Fill (crop)
                  </button>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="mt-1 rounded-full"
                onClick={handleAppLogoUploadClick}
                disabled={isAppLogoUploading}
              >
                {isAppLogoUploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
                Upload Logo
              </Button>
              <input
                ref={appLogoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                className="hidden"
                onChange={handleAppLogoUpload}
              />
              {cropLogoSrc && (
                <ImageCropper
                  imageSrc={cropLogoSrc}
                  onCropComplete={handleCropComplete}
                  onCancel={() => setCropLogoSrc(null)}
                  onSkip={handleSkipCrop}
                  freeform={true}
                />
              )}
            </div>
          </CardHeader>
        </Card>

        <Alert variant="destructive" className="border-2">
          <Helper content="This tool attempts to recover the main document for a school that was accidentally deleted or had its data overwritten. It finds the most recent backup file and restores it. You must know the exact School ID.">
            <AlertTitle className="font-bold flex items-center gap-2">
              <LifeBuoy className="h-4 w-4" />
              Emergency Data Recovery
            </AlertTitle>
          </Helper>
          <AlertDescription>
            If a school was accidentally deleted or its data overwritten, you can attempt to restore it here. This will restore the main school document from its most recent backup. You may then need to use the "Migrate Data" tool on the school.
          </AlertDescription>
          <div className="mt-4 flex flex-col sm:flex-row gap-2 items-start">
            <div className="flex-grow w-full sm:w-auto">
              <Label htmlFor="orphan-id" className="font-bold">Orphaned School ID</Label>
              <Input
                id="orphan-id"
                placeholder="e.g. elisheva"
                value={orphanSchoolId}
                onChange={e => setOrphanSchoolId(e.target.value.trim().toLowerCase())}
              />
            </div>
            <div className="self-end h-full">
              <Button onClick={handleFindLatestBackup} disabled={!orphanSchoolId || isFindingBackup}>
                {isFindingBackup ? "Searching..." : "Find Latest Backup"}
              </Button>
            </div>
          </div>
          {latestBackup && (
            <div className="mt-4 p-4 bg-secondary rounded-lg flex flex-col sm:flex-row justify-between items-center">
              <div>
                <p className="font-bold">Latest Backup Found!</p>
                <p className="text-sm font-code">Date: {new Date(parseInt(latestBackup.id)).toLocaleString()}</p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button>Restore This Backup</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will restore the school document '{orphanSchoolId}' using the backup from {new Date(parseInt(latestBackup.id)).toLocaleString()}. The school will reappear in the list below.
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
              <CardTitle>Global Actions</CardTitle>
            </Helper>
            <CardDescription>Perform actions across all school databases.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col justify-between bg-secondary p-4 rounded-lg border">
              <Helper content="This will create a full data snapshot for every single school instance in the database. This is useful for creating a system-wide save point.">
                <div>
                  <h3 className="font-bold flex items-center gap-2"><Database />One-Click Backup</h3>
                  <p className="text-sm text-muted-foreground mt-1">Create a new backup for every school instance instantly.</p>
                </div>
              </Helper>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="secondary" className="mt-4">Backup All Schools</Button>
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
            <div className="flex flex-col justify-between bg-secondary p-4 rounded-lg border">
              <div>
                <h3 className="font-bold flex items-center gap-2"><ShieldCheck />Scheduled Daily Backups</h3>
                <p className="text-sm text-muted-foreground mt-1">Full-depth backups of all schools run automatically every 24 hours via Cloud Scheduler. Includes all students, classes, teachers, prizes, coupons, categories, and activity history. Old backups are automatically pruned after 30 days.</p>
              </div>
              <div className="mt-4 text-xs text-muted-foreground bg-background p-2 rounded flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0" />
                <span>Each backup is signed with a SHA-256 integrity hash for verification.</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Helper content="Manage your Firebase project, including deployments, rollbacks, and Cloud Functions.">
              <CardTitle className="flex items-center gap-2">
                <Server className="w-5 h-5 text-indigo-500" />
                App Management & Rollbacks
              </CardTitle>
            </Helper>
            <CardDescription>Quick links to the Firebase Console for system-level administration.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col justify-between bg-secondary p-4 rounded-lg border">
              <div>
                <h3 className="font-bold flex items-center gap-2"><FolderGit2 className="w-5 h-5"/>Hosting & Deployments</h3>
                <p className="text-sm text-muted-foreground mt-1">View deployment history, and instantly roll back to an earlier version of the app if something goes wrong.</p>
              </div>
              <Button
                variant="secondary"
                className="mt-4"
                onClick={() => window.open('https://console.firebase.google.com/project/studio-1273073612-71183/hosting/sites/studio-1273073612-71183', '_blank')}
              >
                Open Firebase Hosting
              </Button>
            </div>
            <div className="flex flex-col justify-between bg-secondary p-4 rounded-lg border">
              <div>
                <h3 className="font-bold flex items-center gap-2"><ShieldCheck className="w-5 h-5"/>Main Console</h3>
                <p className="text-sm text-muted-foreground mt-1">Direct link to your Firebase project overview for managing databases, auth, and other config.</p>
              </div>
              <Button
                variant="secondary"
                className="mt-4"
                onClick={() => window.open('https://console.firebase.google.com/project/studio-1273073612-71183/overview', '_blank')}
              >
                Open Firebase Console
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Helper content="This is a list of all separate school databases in the system. You can create new schools or manage existing ones from here.">
              <CardTitle className="flex items-center justify-between">
                <span>School Instances</span>
                <span className="text-sm font-normal bg-slate-100 text-slate-600 px-2 py-1 rounded-md">{allSchools?.length || 0} total</span>
              </CardTitle>
            </Helper>
            <CardDescription>
              <Button onClick={() => setIsCreateSchoolDialogOpen(true)} className="mt-4"><Plus className="mr-2 h-4 w-4" />Create New School</Button>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {schoolsLoading ? <p>Loading schools...</p> : (
              <ul className="space-y-2">
                {allSchools && [...allSchools].sort((a, b) => a.id.localeCompare(b.id)).map((school) => (
                  <li key={school.id} className="flex flex-wrap gap-2 justify-between items-center bg-secondary p-3 rounded-lg border">
                    <div onClick={() => setStatsSchool(school)} className="flex-grow cursor-pointer rounded -m-2 p-2 transition-colors hover:bg-slate-200 dark:hover:bg-slate-700">
                      <p className="font-bold font-code break-all text-lg">{school.id}</p>
                      <p className="text-sm font-medium">{school.name}</p>
                      <SchoolListItemStats schoolId={school.id} />
                      <button
                        onClick={(e) => { e.stopPropagation(); handleCopyUrl(school.id); }}
                        className="mt-1 flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
                      >
                        {copiedId === school.id ? <Check className="w-3 h-3" /> : <Link2 className="w-3 h-3" />}
                        {copiedId === school.id ? 'Copied!' : 'Copy school link'}
                      </button>
                    </div>
                    <div className="flex items-center gap-0.5">
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
                          <Button variant="ghost" size="icon" onClick={() => handleOpenEditModal(school)}>
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

        <Dialog open={isCreateSchoolDialogOpen} onOpenChange={setIsCreateSchoolDialogOpen}>
          <DialogContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleCreateSchool();
              }}
            >
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
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="new-school-name">School Name</Label>
                  <Input
                    id="new-school-name"
                    placeholder="e.g., Washington High School"
                    value={newSchoolName}
                    onChange={(e) => setNewSchoolName(e.target.value)}
                    autoComplete="organization"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="new-school-passcode">Passcode</Label>
                  <Input
                    id="new-school-passcode"
                    type="password"
                    placeholder="(Leave blank to auto-generate)"
                    value={newSchoolPasscode}
                    onChange={(e) => setNewSchoolPasscode(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="secondary" onClick={() => setIsCreateSchoolDialogOpen(false)}>Cancel</Button>
                <Button type="submit">Create School</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <SchoolStatsModal
          school={statsSchool}
          isOpen={!!statsSchool}
          onOpenChange={(open) => !open && setStatsSchool(null)}
        />

        <AlertDialog open={!!createdSchoolInfo} onOpenChange={() => setCreatedSchoolInfo(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>School Created Successfully!</AlertDialogTitle>
              <AlertDialogDescription>
                Send the school their unique link and passcode below.
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
              <div className="border-t pt-4">
                <p className="text-sm text-muted-foreground">Passcode</p>
                <p className="font-code font-bold text-3xl tracking-widest text-primary">{createdSchoolInfo?.passcode}</p>
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setCreatedSchoolInfo(null)}>Close</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={!!editingSchool} onOpenChange={handleCloseEditModal}>
          <DialogContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleUpdateSchool();
              }}
            >
              <DialogHeader>
                <DialogTitle>Edit School: <span className="font-code">{editingSchool?.id}</span></DialogTitle>
                <DialogDescription>
                  Update the school's name or set a new passcode. Leaving the passcode field blank will not change it.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
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
                  <Label htmlFor="new-passcode" className="text-right">New Passcode</Label>
                  <Input
                    id="new-passcode"
                    type="password"
                    value={editingPasscode}
                    placeholder="(Leave blank to keep unchanged)"
                    onChange={(e) => setEditingPasscode(e.target.value)}
                    className="col-span-3"
                    autoComplete="new-password"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="secondary" onClick={handleCloseEditModal}>Cancel</Button>
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={!!backupSchool} onOpenChange={handleCloseBackupModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Manage Backups for <span className="font-code">{backupSchool?.id}</span></DialogTitle>
              <DialogDescription>
                Full-depth backups include all students, classes, teachers, prizes, coupons, categories, and activity history. Scheduled backups run daily via Cloud Scheduler.
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
                                    This will fully restore {backupSchool?.id} from the backup taken on {backup.createdAt ? new Date(backup.createdAt).toLocaleString() : 'unknown date'}. All current data (students, classes, teachers, prizes, coupons, categories, and activities) will be replaced. A safety backup will be created first.
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
      </div>
    </TooltipProvider>
  )
}
