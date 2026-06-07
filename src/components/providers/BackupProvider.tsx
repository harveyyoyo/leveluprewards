
'use client';

import React, {
    createContext,
    useContext,
    useCallback,
    useMemo,
} from 'react';
import { useFirebase } from '@/firebase';
import {
    doc,
    setDoc,
    deleteDoc,
    updateDoc,
    collection,
    writeBatch,
    getDocs,
    getDoc,
} from 'firebase/firestore';
import {
    mainSchoolDocToPublicPayload,
    schoolPublicDocRef,
    schoolPublicPatchFromSchoolUpdates,
} from '@/lib/schoolPublic';
import { httpsCallable } from "firebase/functions";
import { useToast } from '@/hooks/use-toast';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import type { HistoryItem, StaffAccount, Student, Teacher } from '@/lib/types';
import { DEFAULT_PLAN } from '@/lib/plans';
import { isPublicSampleSchoolId, SAMPLE_SCHOOL_ACCESS_PASSCODE } from '@/lib/sampleSchools';
import { syncSchoolStaffDirectory } from '@/lib/syncSchoolStaffDirectory';
import { DEMO_STUDENT_THEMES } from '@/lib/demoStudentThemes';
import {
    seedOfficeDemoDataForSchool,
    type OfficeDemoVariant,
} from '@/lib/office/seedOfficeDemoData';
import type { SchoolProfileType } from '@/lib/schoolProfile';

interface BackupContextType {
    createSchool: (schoolId: string, name?: string, passcodes?: SchoolPasscodeUpdates) => Promise<CreateSchoolResult | null>;
    deleteSchool: (schoolId: string) => Promise<void>;
    updateSchool: (schoolId: string, updates: SchoolPasscodeUpdates & { name?: string }) => Promise<void>;
    devCreateBackup: (schoolId: string) => Promise<void>;
    devRestoreFromBackup: (schoolId: string, backupId: string) => Promise<void>;
    devDownloadBackup: (schoolId: string, backupId: string) => Promise<void>;
    devBackupAllSchools: () => Promise<void>;
    devVerifyBackup: (schoolId: string, backupId: string) => Promise<{ verified: boolean; reason: string }>;
    devMigrateSchoolData: (schoolId: string) => Promise<void>;
    devResetSampleSchool: (schoolId: string) => Promise<void>;
    devSeedOfficeDemoData: (schoolId: string) => Promise<void>;
    devSyncSchoolPublicIndex: () => Promise<void>;
}

const BackupContext = createContext<BackupContextType | null>(null);

type SchoolPasscodeUpdates = {
    passcode?: string;
    schoolAccessPasscode?: string;
    adminPasscode?: string;
    schoolProfile?: SchoolProfileType;
};

type CreateSchoolResult = {
    passcode: string;
    schoolAccessPasscode: string;
    adminPasscode: string;
    cleanId: string;
};

export function BackupProvider({ children }: { children: React.ReactNode }) {
    const { toast } = useToast();
    const { auth, firestore, functions } = useFirebase();
    const playSound = useArcadeSound();

    const createSchool = useCallback(async (schoolId: string, name?: string, passcodes: SchoolPasscodeUpdates = {}): Promise<CreateSchoolResult | null> => {
        if (!functions || !auth.currentUser) return null;
        const cleanId = schoolId.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
        if (!cleanId) {
            playSound('error');
            toast({ variant: 'destructive', title: "Invalid School ID" });
            return null;
        }

        try {
            const createSchoolFn = httpsCallable(functions, 'createSchoolByDeveloper');
            const result = await createSchoolFn({ schoolId: cleanId, name, ...passcodes });
            const response = result.data as { cleanId: string; passcode: string; schoolAccessPasscode?: string; adminPasscode?: string; repaired?: boolean };
            playSound('success');
            toast({
                title: response.repaired ? `School "${response.cleanId}" repaired!` : `School "${response.cleanId}" created!`,
                description: response.repaired ? 'Missing starter data was restored after a partial create.' : undefined,
            });
            return {
                passcode: response.schoolAccessPasscode || response.passcode,
                schoolAccessPasscode: response.schoolAccessPasscode || response.passcode,
                adminPasscode: response.adminPasscode || response.passcode,
                cleanId: response.cleanId,
            };
        } catch (e) {
            playSound('error');
            const code = (e as any)?.code;
            const message = (e as Error).message || 'Could not create school.';
            toast({
                variant: 'destructive',
                title: code === 'functions/already-exists' ? `School ID "${cleanId}" already exists.` : 'School creation failed',
                description: message,
            });
            return null;
        }
    }, [functions, auth, toast, playSound]);

    const devCreateBackup = useCallback(async (schoolId: string) => {
        const createBackupFn = httpsCallable(functions, 'createBackupTrigger');
        try {
            await createBackupFn({ schoolId });
            playSound('success');
            toast({ title: 'Full Backup Created', description: 'All school data backed up to secure storage.' });
        } catch (error) {
            playSound('error');
            console.error(error);
            toast({ variant: 'destructive', title: 'Backup Failed', description: (error as any).message });
        }
    }, [toast, playSound, functions]);

    const devRestoreFromBackup = useCallback(async (schoolId: string, backupId: string) => {
        const restoreFn = httpsCallable(functions, 'restoreFromFullBackup');
        try {
            await restoreFn({ schoolId, backupId });
            playSound('success');
            toast({ title: 'Full Restore Complete', description: 'All school data has been restored, including students, classes, activities, and more.' });
        } catch (e) {
            playSound('error');
            toast({ variant: 'destructive', title: 'Restore Failed', description: (e as Error).message });
        }
    }, [functions, playSound, toast]);

    const devDownloadBackup = useCallback(async (schoolId: string, backupId: string) => {
        const downloadFn = httpsCallable(functions, 'downloadFullBackup');
        try {
            const result = await downloadFn({ schoolId, backupId });
            const response = result.data as any;
            playSound('swoosh');
            const dataStr = JSON.stringify(response.data, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            const dateStr = response.metadata?.createdAt
                ? new Date(response.metadata.createdAt).toISOString().split('T')[0]
                : backupId;
            link.download = `reward-arcade-full-backup-${schoolId}-${dateStr}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (e) {
            playSound('error');
            toast({ variant: 'destructive', title: 'Download Failed', description: (e as Error).message });
        }
    }, [functions, playSound, toast]);

    const devBackupAllSchools = useCallback(async () => {
        playSound('swoosh');
        try {
            const backupAllFn = httpsCallable(functions, 'backupAllSchools');
            const result = await backupAllFn({});
            const response = result.data as any;
            if (response.failed > 0) {
                playSound('error');
                toast({
                    variant: 'destructive',
                    title: `Backup Complete with Errors`,
                    description: `${response.succeeded}/${response.total} schools backed up. ${response.failed} failed.`,
                });
            } else {
                playSound('success');
                toast({
                    title: 'All Schools Backed Up',
                    description: `${response.total} school(s) fully backed up to secure storage.`,
                });
            }
        } catch (e) {
            playSound('error');
            console.error('Backup of all schools failed', e);
            toast({ variant: 'destructive', title: 'Backup Failed', description: (e as Error).message });
        }
    }, [functions, playSound, toast]);

    const devVerifyBackup = useCallback(async (schoolId: string, backupId: string) => {
        const verifyFn = httpsCallable(functions, 'verifyBackupIntegrity');
        try {
            const result = await verifyFn({ schoolId, backupId });
            return result.data as { verified: boolean; reason: string };
        } catch (e) {
            return { verified: false, reason: (e as Error).message || 'Verification failed.' };
        }
    }, [functions]);

    const seedOfficeForSampleSchool = useCallback(async (
        cleanId: OfficeDemoVariant,
        students: any[],
        classes: any[],
        teachers: Teacher[] = [],
    ) => {
        if (!firestore) return;
        await seedOfficeDemoDataForSchool(firestore, cleanId, {
            variant: cleanId,
            students,
            classes,
        });
        const schoolRef = doc(firestore, 'schools', cleanId);
        const schoolSnap = await getDoc(schoolRef);
        const existingAppSettings = (schoolSnap.data()?.appSettings as Record<string, unknown> | undefined) ?? {};
        const nextAppSettings = { ...existingAppSettings, payOffice: true };
        await updateDoc(schoolRef, {
            appSettings: nextAppSettings,
        });
        await setDoc(
            schoolPublicDocRef(firestore, cleanId),
            { active: true, appSettings: nextAppSettings, updatedAt: Date.now() },
            { merge: true },
        );

        const staffSnap = await getDocs(collection(firestore, 'schools', cleanId, 'staffAccounts'));
        const staffAccounts = staffSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as StaffAccount[];
        await syncSchoolStaffDirectory(firestore, cleanId, teachers, staffAccounts);
    }, [firestore]);

    const ensureDeveloperIsAdminForSchool = useCallback(async (schoolId: string) => {
        if (!functions || !auth.currentUser) return;
        const fn = httpsCallable(functions, 'startDeveloperSupportSession');
        await fn({ schoolId });
    }, [functions, auth]);

    const devSeedOfficeDemoData = useCallback(async (schoolId: string) => {
        if (!firestore || !auth.currentUser) return;
        const cleanId = schoolId.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
        if (!isPublicSampleSchoolId(cleanId)) {
            playSound('error');
            toast({
                variant: 'destructive',
                title: 'Office seed only for sample schools',
                description: 'Use "yeshiva" or "schoolabc".',
            });
            return;
        }

        toast({ title: `Seeding office data for ${cleanId}...`, description: 'Roster, grades, and billing.' });

        try {
            // Seed touches staff directory + app settings; ensure dev can access this school.
            await ensureDeveloperIsAdminForSchool(cleanId);
            let students: any[];
            let classes: any[];
            let teachers: Teacher[];
            if (cleanId === 'yeshiva') {
                const { YESHIVA_DATA } = await import('@/lib/yeshivaData');
                students = YESHIVA_DATA.students ?? [];
                classes = YESHIVA_DATA.classes ?? [];
                teachers = YESHIVA_DATA.teachers ?? [];
            } else {
                const { SCHOOL_DATA } = await import('@/lib/schoolData');
                students = SCHOOL_DATA.students ?? [];
                classes = SCHOOL_DATA.classes ?? [];
                teachers = SCHOOL_DATA.teachers ?? [];
            }

            await seedOfficeForSampleSchool(cleanId as OfficeDemoVariant, students, classes, teachers);
            playSound('success');
            toast({
                title: `Office demo data ready for "${cleanId}"`,
                description: 'School Office pillar enabled. Sign in as admin to open the office portal.',
            });
        } catch (e) {
            playSound('error');
            toast({
                variant: 'destructive',
                title: 'Office seed failed',
                description: (e as Error).message,
            });
        }
    }, [firestore, auth, playSound, toast, seedOfficeForSampleSchool, ensureDeveloperIsAdminForSchool]);

    const devResetSampleSchool = useCallback(async (schoolId: string) => {
        if (!firestore || !auth.currentUser) return;
        const cleanId = schoolId.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
        if (cleanId !== 'yeshiva' && cleanId !== 'schoolabc') {
            playSound('error');
            toast({ variant: 'destructive', title: `Reset only allowed for sample schools.`, description: 'Use this on "yeshiva" or "schoolabc" only.' });
            return;
        }

        const schoolDocRef = doc(firestore, 'schools', cleanId);
        const SUBCOLLECTIONS = ["students", "classes", "teachers", "categories", "prizes", "coupons"];
        const BATCH_LIMIT = 499;

        toast({ title: `Resetting ${cleanId}...`, description: "Reapplying latest sample data." });

        try {
            // This reset deletes + recreates rewards collections. Firestore rules allow that only
            // for admins, so provision this developer as an admin for the sample school.
            await ensureDeveloperIsAdminForSchool(cleanId);

            // faceAuth is Admin-SDK only (client rules deny access); clear via Cloud Function.
            if (functions) {
                try {
                    const clearFace = httpsCallable(functions, 'devClearSampleSchoolFaceAuth');
                    await clearFace({ schoolId: cleanId });
                } catch (faceClearErr) {
                    console.warn('[devResetSampleSchool] faceAuth clear skipped', faceClearErr);
                }
            }

            // Clear subcollections (and student activities)
            for (const sub of SUBCOLLECTIONS) {
                const subcollectionRef = collection(firestore, 'schools', cleanId, sub);
                const snap = await getDocs(subcollectionRef);
                if (snap.empty) continue;

                if (sub === "students") {
                    for (const studentDoc of snap.docs) {
                        const activitiesRef = collection(studentDoc.ref, "activities");
                        const activitiesSnap = await getDocs(activitiesRef);
                        if (activitiesSnap.empty) continue;
                        for (let i = 0; i < activitiesSnap.docs.length; i += BATCH_LIMIT) {
                            const batch = writeBatch(firestore);
                            activitiesSnap.docs.slice(i, i + BATCH_LIMIT).forEach(d => batch.delete(d.ref));
                            await batch.commit();
                        }
                    }
                }

                for (let i = 0; i < snap.docs.length; i += BATCH_LIMIT) {
                    const batch = writeBatch(firestore);
                    snap.docs.slice(i, i + BATCH_LIMIT).forEach(d => batch.delete(d.ref));
                    await batch.commit();
                }
            }

            // Re-seed from built-in sample data
            let schoolData: Record<string, any>, newPasscode: string;
            if (cleanId === 'yeshiva') {
                const { YESHIVA_DATA } = await import('@/lib/yeshivaData');
                newPasscode = SAMPLE_SCHOOL_ACCESS_PASSCODE;
                schoolData = YESHIVA_DATA;
            } else {
                const { SCHOOL_DATA } = await import('@/lib/schoolData');
                newPasscode = SAMPLE_SCHOOL_ACCESS_PASSCODE;
                schoolData = SCHOOL_DATA;
            }

            const { students, classes, teachers, categories, prizes, coupons, ...schoolDocData } = schoolData;

            // Random theme rotation for the first 7 demo students (each reseed).
            const randomInt = (maxExclusive: number) => {
                if (maxExclusive <= 0) return 0;
                const g = (globalThis as any)?.crypto;
                if (g?.getRandomValues) {
                    const arr = new Uint32Array(1);
                    g.getRandomValues(arr);
                    return Number(arr[0] % maxExclusive);
                }
                return Math.floor(Math.random() * maxExclusive);
            };
            const pickRandomDemoThemes = (pool: typeof DEMO_STUDENT_THEMES, count: number) => {
                const copy = pool.slice();
                for (let i = pool.length - 1; i > 0; i -= 1) {
                    const j = randomInt(i + 1);
                    [copy[i], copy[j]] = [copy[j], copy[i]];
                }
                return copy.slice(0, Math.min(count, copy.length));
            };
            const themedPool = DEMO_STUDENT_THEMES;
            const randomizedThemes = pickRandomDemoThemes(themedPool, 7);
            const themedAt = Date.now();
            const studentsWithRandomThemes = Array.isArray(students)
                ? students.map((s: any, idx: number) => {
                    if (!s || typeof s !== 'object') return s;
                    // Strip any existing theme from sample data first, then apply only to the first 7.
                    const { theme: _theme, ...base } = s as any;
                    if (idx < randomizedThemes.length) {
                        return {
                            ...base,
                            theme: randomizedThemes[idx],
                            updatedAt: themedAt + (randomizedThemes.length - idx),
                        };
                    }
                    return base;
                })
                : students;
            const finalSchoolDocData = {
                ...schoolDocData,
                passcode: newPasscode,
                schoolAccessPasscode: newPasscode,
                adminPasscode: newPasscode,
                name: schoolData.name,
                plan: schoolDocData.plan ?? DEFAULT_PLAN,
                featureOverrides: schoolDocData.featureOverrides ?? {},
                schoolProfile: cleanId === 'yeshiva' ? 'jewish_orthodox' : 'standard',
                hasMigratedStudents: true,
                hasMigratedClasses: true,
                hasMigratedTeachers: true,
                hasMigratedPrizes: true,
                hasMigratedCoupons: true,
                hasMigratedCategories: true,
            };

            const allOps: Array<{ ref: any; data: any }> = [];

            const collectItems = (list: any[] | undefined, collectionName: string) => {
                if (!list) return;
                for (const item of list) {
                    const itemRef = doc(firestore, 'schools', cleanId, collectionName, item.id);
                    if (collectionName === 'students') {
                        const studentData: Student = {
                            ...item,
                            points: item.points || 0,
                            lifetimePoints: item.lifetimePoints || item.points || 0,
                            categoryPoints: item.categoryPoints || {},
                            categoryPointsByPeriod: item.categoryPointsByPeriod || {},
                            earnedAchievements: item.earnedAchievements || [],
                            earnedBadges: item.earnedBadges || [],
                        };
                        allOps.push({ ref: itemRef, data: studentData });
                    } else {
                        allOps.push({ ref: itemRef, data: item });
                    }
                }
            };

            collectItems(studentsWithRandomThemes, 'students');
            collectItems(classes, 'classes');
            collectItems(teachers, 'teachers');
            collectItems(categories, 'categories');
            collectItems(prizes, 'prizes');
            collectItems(coupons, 'coupons');

            const firstBatch = writeBatch(firestore);
            firstBatch.set(schoolDocRef, finalSchoolDocData);
            firstBatch.set(
                schoolPublicDocRef(firestore, cleanId),
                mainSchoolDocToPublicPayload(finalSchoolDocData as Record<string, unknown>),
            );
            await firstBatch.commit();

            const restOps = allOps;
            for (let i = 0; i < restOps.length; i += BATCH_LIMIT) {
                const chunk = restOps.slice(i, i + BATCH_LIMIT);
                const batch = writeBatch(firestore);
                for (const op of chunk) {
                    batch.set(op.ref, op.data);
                }
                await batch.commit();
            }

            await seedOfficeForSampleSchool(cleanId as OfficeDemoVariant, students ?? [], classes ?? [], teachers ?? []);

            const verifyStudentsSnap = await getDocs(collection(firestore, 'schools', cleanId, 'students'));
            const verifyClassesSnap = await getDocs(collection(firestore, 'schools', cleanId, 'classes'));

            playSound('success');
            toast({
                title: `Sample school "${cleanId}" reset`,
                description: `Restored ${verifyStudentsSnap.size} students and ${verifyClassesSnap.size} classes (plus rewards + School Office).`,
            });
        } catch (e) {
            playSound('error');
            toast({
                variant: 'destructive',
                title: `Reset failed for "${cleanId}"`,
                description: (e as Error).message || 'Unknown error while reseeding demo data.',
            });
        }
    }, [firestore, auth, functions, playSound, toast, seedOfficeForSampleSchool, ensureDeveloperIsAdminForSchool]);

    const deleteSchool = useCallback(async (schoolId: string) => {
        if (!firestore || !auth.currentUser) return;
        try {
            const createBackupFn = httpsCallable(functions, 'createBackupTrigger');
            await createBackupFn({ schoolId, type: 'pre-delete' });
            playSound('swoosh');
            toast({ title: "Final Backup Created", description: `A full backup for ${schoolId} has been saved before deletion.` });
            const delBatch = writeBatch(firestore);
            delBatch.delete(schoolPublicDocRef(firestore, schoolId));
            delBatch.delete(doc(firestore, 'schools', schoolId));
            await delBatch.commit();
            playSound('success');
            toast({ title: `School "${schoolId}" deleted!` });
        } catch (e) {
            playSound('error');
            toast({ variant: 'destructive', title: `School "${schoolId}" deletion failed!`, description: (e as Error).message });
        }
    }, [firestore, auth, toast, playSound, functions]);

    const updateSchool = useCallback(async (schoolId: string, updates: SchoolPasscodeUpdates & { name?: string }) => {
        if (!firestore) return;
        try {
            await updateDoc(doc(firestore, 'schools', schoolId), updates);
            const patch = schoolPublicPatchFromSchoolUpdates(updates as Record<string, unknown>);
            if (patch) {
                await setDoc(schoolPublicDocRef(firestore, schoolId), patch, { merge: true });
            }
            playSound('success');
        } catch (e) {
            playSound('error');
            toast({ variant: 'destructive', title: "School update failed", description: (e as Error).message });
        }
    }, [firestore, playSound, toast]);

    const devSyncSchoolPublicIndex = useCallback(async () => {
        if (!firestore || !auth.currentUser) return;
        try {
            const snap = await getDocs(collection(firestore, 'schools'));
            let n = 0;
            for (const d of snap.docs) {
                const payload = mainSchoolDocToPublicPayload(d.data() as Record<string, unknown>);
                await setDoc(schoolPublicDocRef(firestore, d.id), payload, { merge: true });
                n += 1;
            }
            playSound('success');
            toast({ title: 'Public school index synced', description: `Updated ${n} schoolPublic document(s).` });
        } catch (e) {
            playSound('error');
            toast({
                variant: 'destructive',
                title: 'Sync failed',
                description: (e as Error).message,
            });
        }
    }, [firestore, auth, playSound, toast]);

    const devMigrateSchoolData = useCallback(async (schoolId: string) => {
        if (!functions) return;
        const migrationFunctions = [
            'migrateStudentsToSubcollection',
            'migrateClassesToSubcollection',
            'migrateTeachersToSubcollection',
            'migratePrizesToSubcollection',
            'migrateCouponsToSubcollection',
            'migrateCategoriesToSubcollection'
        ];
        toast({ title: `Starting data migration for ${schoolId}...`, description: "This may take a moment." });
        try {
            for (const funcName of migrationFunctions) {
                const callable = httpsCallable(functions, funcName);
                const result = await callable({ schoolId });
                void result;
            }
            playSound('success');
            toast({ title: "Migration Complete!", description: `Data for ${schoolId} has been migrated to the new structure.` });
        } catch (error) {
            playSound('error');
            toast({ variant: 'destructive', title: 'Migration Failed', description: (error as any).message });
        }
    }, [functions, toast, playSound]);

    const value = useMemo(
        () => ({
            createSchool, deleteSchool, updateSchool,
            devCreateBackup, devRestoreFromBackup, devDownloadBackup, devBackupAllSchools,
            devVerifyBackup, devMigrateSchoolData, devResetSampleSchool, devSeedOfficeDemoData, devSyncSchoolPublicIndex,
        }),
        [
            createSchool, deleteSchool, updateSchool,
            devCreateBackup, devRestoreFromBackup, devDownloadBackup, devBackupAllSchools,
            devVerifyBackup, devMigrateSchoolData, devResetSampleSchool, devSeedOfficeDemoData, devSyncSchoolPublicIndex,
        ]
    );

    return (
        <BackupContext.Provider value={value}>
            {children}
        </BackupContext.Provider>
    );
}

export const useBackup = () => {
    const context = useContext(BackupContext);
    if (!context) {
        throw new Error('useBackup must be used within a BackupProvider');
    }
    return context;
};
