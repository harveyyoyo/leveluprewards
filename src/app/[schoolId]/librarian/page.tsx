'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, doc, getDocs, limit, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { Loader2, LogIn, LogOut } from 'lucide-react';
import { useAppContext } from '@/components/AppProvider';
import { useFirestore, useFunctions, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { StaffPortalLayoutProvider } from '@/components/staff/StaffPortalLayoutContext';
import { StaffPortalContentWidth } from '@/components/staff/StaffPortalContentWidth';
import { LibraryManagementPanel } from '@/components/library/LibraryManagementPanel';
import { LibraryItemModal } from '@/components/library/LibraryItemModal';
import { useCollection } from '@/firebase';
import type { LibraryItem, LibraryItemInput, Student } from '@/lib/types';
import { normalizeLibraryUpc } from '@/lib/library/libraryScanCode';
import { forceReturnLibraryItem } from '@/lib/library/libraryOperations';
import { getLibraryPolicyFromSettings } from '@/lib/library/libraryPolicy';

export default function LibrarianPage() {
  const { loginState, isInitialized, schoolId, login, logout, userName, isLibrarian, isAdmin, categories } =
    useAppContext();
  const router = useRouter();
  const firestore = useFirestore();
  const functions = useFunctions();
  const { settings } = useSettings();
  const playSound = useArcadeSound();
  const { toast } = useToast();
  const [username, setUsername] = useState('');
  const [passcode, setPasscode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false);
  const [editingLibraryItem, setEditingLibraryItem] = useState<LibraryItem | null>(null);

  const libraryQuery = useMemoFirebase(
    () => (firestore && schoolId && (isLibrarian || isAdmin) ? collection(firestore, 'schools', schoolId, 'library') : null),
    [firestore, schoolId, isLibrarian, isAdmin],
  );
  const { data: library } = useCollection<LibraryItem>(libraryQuery);

  const studentsQuery = useMemoFirebase(
    () => (firestore && schoolId && (isLibrarian || isAdmin) ? collection(firestore, 'schools', schoolId, 'students') : null),
    [firestore, schoolId, isLibrarian, isAdmin],
  );
  const { data: students } = useCollection<Student>(studentsQuery);

  const studentNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of students ?? []) {
      map.set(s.id, `${s.firstName} ${s.lastName}`.trim());
    }
    return map;
  }, [students]);

  const libraryPolicy = useMemo(
    () => getLibraryPolicyFromSettings(settings, categories),
    [settings, categories],
  );

  useEffect(() => {
    if (!isInitialized || !schoolId) return;
    if (loginState === 'admin' || loginState === 'developer') return;
    if (loginState === 'teacher') router.replace(`/${schoolId}/teacher`);
    else if (loginState === 'secretary') router.replace(`/${schoolId}/secretary`);
    else if (loginState === 'prizeClerk') router.replace(`/${schoolId}/admin`);
    else if (loginState === 'reports') router.replace(`/${schoolId}/reports`);
  }, [isInitialized, loginState, schoolId, router]);

  const handleLogin = async () => {
    if (isSubmitting || !schoolId) return;
    setIsSubmitting(true);
    try {
      const authResult = await login('librarian', { schoolId, username: username.trim(), passcode });
      if (authResult.ok) {
        playSound('login');
        toast({ title: 'Signed in' });
      } else {
        playSound('error');
        toast({ variant: 'destructive', title: 'Login failed', description: authResult.message });
        setPasscode('');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const libraryUpcTaken = useCallback(
    async (upc: string, excludeId?: string) => {
      if (!firestore || !schoolId) return false;
      const snap = await getDocs(
        query(collection(firestore, 'schools', schoolId, 'library'), where('upc', '==', upc), limit(5)),
      );
      return snap.docs.some((d) => d.id !== excludeId);
    },
    [firestore, schoolId],
  );

  const handleSaveLibraryItem = async (data: LibraryItemInput, existingId?: string) => {
    if (!firestore || !schoolId) throw new Error('School not ready.');
    const upc = normalizeLibraryUpc(data.upc);
    if (await libraryUpcTaken(upc, existingId)) {
      throw new Error('Another item already uses this barcode.');
    }
    const payload = {
      name: data.name.trim(),
      upc,
      author: data.author ?? null,
      isbn: data.isbn ?? null,
      category: data.category ?? null,
      shelfLocation: data.shelfLocation ?? null,
      copyNumber: data.copyNumber ?? null,
      notes: data.notes ?? null,
    };
    if (existingId) {
      await updateDoc(doc(firestore, 'schools', schoolId, 'library', existingId), payload);
    } else {
      await setDoc(doc(collection(firestore, 'schools', schoolId, 'library')), {
        ...payload,
        status: 'available',
        checkedOutTo: null,
        checkedOutAt: null,
        createdAt: Date.now(),
        addedBy: userName || 'Librarian',
      });
    }
  };

  const handleReturnLibraryItem = async (itemId: string) => {
    if (!firestore || !schoolId) return;
    const item = library?.find((i) => i.id === itemId);
    if (!item) return;
    const res = await forceReturnLibraryItem(firestore, schoolId, item, {
      policy: libraryPolicy,
      functions,
    });
    playSound('success');
    toast({ title: 'Item returned', description: res.message });
  };

  const handleDeleteLibraryItem = async (itemId: string) => {
    if (!firestore || !schoolId) return;
    const { deleteDoc } = await import('firebase/firestore');
    await deleteDoc(doc(firestore, 'schools', schoolId, 'library', itemId));
    playSound('trash');
    toast({ title: 'Item deleted' });
  };

  if (!isInitialized || !schoolId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (settings.payLibrary === false) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <p className="text-muted-foreground">Library is not enabled for this school.</p>
      </div>
    );
  }

  if (!isLibrarian && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Library desk</CardTitle>
            <CardDescription>Sign in with your librarian account.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Username</Label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
            </div>
            <div className="space-y-2">
              <Label>Passcode</Label>
              <Input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void handleLogin()}
              />
            </div>
            <Button className="w-full rounded-xl" onClick={() => void handleLogin()} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
              Sign in
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <StaffPortalLayoutProvider>
      <div className="min-h-screen bg-background p-4 md:p-8">
        <StaffPortalContentWidth className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-black">Library</h1>
              <p className="text-sm text-muted-foreground">{userName}</p>
            </div>
            <Button variant="outline" className="rounded-xl" onClick={() => logout({ staffNavigateTo: 'portal' })}>
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </Button>
          </div>

          <LibraryManagementPanel
            libraryItems={library}
            students={students}
            schoolId={schoolId}
            getStudentName={(id) => (id ? studentNameById.get(id) : undefined) ?? 'Unknown'}
            showIntakeScanner
            onAddLibraryItem={() => {
              setEditingLibraryItem(null);
              setIsLibraryModalOpen(true);
            }}
            onEditLibraryItem={(item) => {
              setEditingLibraryItem(item);
              setIsLibraryModalOpen(true);
            }}
            onDeleteLibraryItem={(id) => void handleDeleteLibraryItem(id)}
            onReturnLibraryItem={(id) => void handleReturnLibraryItem(id)}
            onRegisterFromScan={handleSaveLibraryItem}
            upcTaken={(upc) => libraryUpcTaken(upc)}
            categories={categories}
          />
        </StaffPortalContentWidth>

        <LibraryItemModal
          isOpen={isLibraryModalOpen}
          setIsOpen={setIsLibraryModalOpen}
          item={editingLibraryItem}
          onSave={handleSaveLibraryItem}
          upcTaken={libraryUpcTaken}
          schoolId={schoolId}
        />
      </div>
      </StaffPortalLayoutProvider>
    </ErrorBoundary>
  );
}
