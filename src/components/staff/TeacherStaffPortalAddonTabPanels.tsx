'use client';

import { useCallback, useMemo, useState, type ReactNode } from 'react';
import {
  collection,
  doc,
  getDocs,
  limit,
  query,
  setDoc,
  updateDoc,
  where,
  deleteDoc,
} from 'firebase/firestore';
import { useConfirm } from '@/components/providers/ConfirmProvider';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useAppContext } from '@/components/AppProvider';
import { useToast } from '@/hooks/use-toast';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { useFirestore, useCollection, useMemoFirebase, useFunctions } from '@/firebase';
import { TeacherPortalTabPane } from '@/components/staff/TeacherPortalTabPane';
import { StaffPortalSchoolwideFeatureNotice } from '@/components/staff/StaffPortalSchoolwideFeatureNotice';
import { teacherPortalPanelClassName, teacherPortalTabContentClassName } from '@/components/staff/teacherPortalLayout';
import { AdminHousesTab } from '@/app/[schoolId]/admin/sections/AdminHousesTab';
import { AdminStatsTab } from '@/app/[schoolId]/admin/sections/AdminStatsTab';
import { AdminHallOfFameTab } from '@/app/[schoolId]/admin/sections/AdminHallOfFameTab';
import { AdminDisplaysTab } from '@/app/[schoolId]/admin/sections/AdminDisplaysTab';
import { AdminLibraryTab } from '@/app/[schoolId]/admin/sections/AdminLibraryTab';
import { AdminBonusPointsTab } from '@/app/[schoolId]/admin/sections/AdminBonusPointsTab';
import { AdminBadgesTab } from '@/app/[schoolId]/admin/sections/AdminBadgesTab';
import { AdminNotificationsTab } from '@/app/[schoolId]/admin/sections/AdminNotificationsTab';
import { AdminIntegrationsTab } from '@/app/[schoolId]/admin/sections/AdminIntegrationsTab';
import { AdminStudentPortalTab } from '@/app/[schoolId]/admin/sections/AdminStudentPortalTab';
import { AdminBrandingTab } from '@/app/[schoolId]/admin/sections/AdminBrandingTab';
import { LibraryItemModal } from '@/components/library/LibraryItemModal';
import { AchievementModal } from '@/components/badges/AchievementModal';
import { BadgeModal } from '@/components/badges/BadgeModal';
import { ImageCropper } from '@/components/admin/ImageCropper';
import { useSchoolLogoUpload } from '@/app/[schoolId]/admin/hooks/useSchoolLogoUpload';
import { normalizeLibraryUpc } from '@/lib/library/libraryScanCode';
import type { LibraryItemInput } from '@/lib/types';
import { addAchievement, updateAchievement, addBadge, updateBadge, deleteBadge } from '@/lib/db';
import type {
  Achievement,
  Badge,
  Category,
  Class,
  Coupon,
  House,
  LibraryItem,
  Student,
  Teacher,
} from '@/lib/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export type TeacherStaffPortalAddonTabPanelsProps = {
  activeTab: string;
  teacherTabEnabled: (tabId: string) => boolean;
  isWide: boolean;
  schoolId: string;
  students: Student[] | null | undefined;
  classes: Class[] | null | undefined;
  categories: Category[] | null | undefined;
  teachers: Teacher[] | null | undefined;
  coupons: Coupon[] | null | undefined;
  schoolName?: string;
  schoolLogoUrl?: string | null;
};

function AddonPane({
  tabId,
  activeTab,
  isWide,
  children,
}: {
  tabId: string;
  activeTab: string;
  isWide: boolean;
  children: ReactNode;
}) {
  return (
    <TeacherPortalTabPane tabId={tabId} activeTab={activeTab} className={teacherPortalTabContentClassName}>
      <div className={teacherPortalPanelClassName(isWide)}>
        <StaffPortalSchoolwideFeatureNotice activeTab={tabId} />
        {children}
      </div>
    </TeacherPortalTabPane>
  );
}

export function TeacherStaffPortalAddonTabPanels({
  activeTab,
  teacherTabEnabled,
  isWide,
  schoolId,
  students,
  classes,
  categories,
  teachers,
  coupons,
  schoolName,
  schoolLogoUrl,
}: TeacherStaffPortalAddonTabPanelsProps) {
  const confirm = useConfirm();
  const { toast } = useToast();
  const playSound = useArcadeSound();
  const functions = useFunctions();
  const firestore = useFirestore();
  const { settings, updateSettings } = useSettings();
  const {
    addHouse,
    updateHouse,
    deleteHouse,
    updateStudent,
    updateTeacher,
    achievements,
    achievementsLoading,
    badges,
    badgesLoading,
  } = useAppContext();

  const housesQuery = useMemoFirebase(
    () => (settings.enableHouses ? collection(firestore, 'schools', schoolId, 'houses') : null),
    [firestore, schoolId, settings.enableHouses],
  );
  const { data: houses } = useCollection<House>(housesQuery);

  const libraryQuery = useMemoFirebase(
    () => (settings.payLibrary ? collection(firestore, 'schools', schoolId, 'library') : null),
    [firestore, schoolId, settings.payLibrary],
  );
  const { data: library } = useCollection<LibraryItem>(libraryQuery);

  const schoolDocRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'schools', schoolId) : null),
    [firestore, schoolId],
  );

  const [isPreviousLogosOpen, setIsPreviousLogosOpen] = useState(false);

  const {
    logoPreviewUrl,
    setLogoPreviewUrl,
    previousSchoolLogos,
    isLogoUploading,
    cropLogoSrc,
    setCropLogoSrc,
    handleLogoUpload,
    handleCropComplete,
    handleRemoveLogo,
  } = useSchoolLogoUpload({
    schoolId,
    schoolDocRef,
    firestore,
    schoolData: { logoUrl: schoolLogoUrl ?? undefined },
    functions,
    toast,
    playSound,
  });

  const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false);
  const [editingLibraryItem, setEditingLibraryItem] = useState<LibraryItem | null>(null);
  const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false);
  const [editingAchievement, setEditingAchievement] = useState<Achievement | null>(null);
  const [achievementToDelete, setAchievementToDelete] = useState<Achievement | null>(null);
  const [isAddingSamples, setIsAddingSamples] = useState(false);
  const [isAddSampleBadgesOpen, setIsAddSampleBadgesOpen] = useState(false);
  const [isCategoryBadgeModalOpen, setIsCategoryBadgeModalOpen] = useState(false);
  const [editingCategoryBadge, setEditingCategoryBadge] = useState<Badge | null>(null);
  const [categoryBadgeToDelete, setCategoryBadgeToDelete] = useState<Badge | null>(null);
  const [badgeTogglingId, setBadgeTogglingId] = useState<string | null>(null);
  const [isAddingSampleCategoryBadges, setIsAddingSampleCategoryBadges] = useState(false);
  const [isAddSampleCategoryBadgesOpen, setIsAddSampleCategoryBadgesOpen] = useState(false);
  const [, setBadgeEarnersFor] = useState<Badge | null>(null);

  const getStudentName = useCallback(
    (studentId?: string) => {
      if (!studentId) return 'Unknown';
      const s = (students || []).find((st) => st.id === studentId);
      return s ? `${s.firstName} ${s.lastName}`.trim() : 'Unknown';
    },
    [students],
  );

  const usedCouponsCount = coupons?.filter((c) => c.used).length || 0;
  const totalPointsAwarded =
    coupons?.filter((c) => c.used).reduce((sum, c) => sum + c.value, 0) || 0;

  const libraryUpcTaken = async (upc: string, excludeId?: string) => {
    if (!firestore || !schoolId) return false;
    const snap = await getDocs(
      query(collection(firestore, 'schools', schoolId, 'library'), where('upc', '==', upc), limit(5)),
    );
    return snap.docs.some((d) => d.id !== excludeId);
  };

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
        addedBy: 'Teacher',
      });
    }
  };

  const handleDeleteLibraryItem = async (itemId: string) => {
    if (!firestore || !schoolId) return;
    if (
      await confirm({
        title: 'Delete library item?',
        description: 'Are you sure you want to remove this item? This cannot be undone.',
        confirmLabel: 'Delete',
        destructive: true,
      })
    ) {
      await deleteDoc(doc(firestore, 'schools', schoolId, 'library', itemId));
      playSound('trash');
      toast({ title: 'Item deleted', description: 'The library item has been removed.' });
    }
  };

  const handleReturnLibraryItem = async (itemId: string) => {
    if (!firestore || !schoolId) return;
    const item = library?.find((i) => i.id === itemId);
    if (!item) return;
    if (
      await confirm({
        title: 'Force return item?',
        description: 'This will check the item back in and apply any late/on-time library points. Proceed?',
        confirmLabel: 'Return',
      })
    ) {
      const { forceReturnLibraryItem } = await import('@/lib/library/libraryOperations');
      const { getLibraryPolicyFromSettings } = await import('@/lib/library/libraryPolicy');
      const policy = getLibraryPolicyFromSettings(settings, categories);
      const res = await forceReturnLibraryItem(firestore, schoolId, item, { policy, functions });
      playSound('success');
      toast({ title: 'Item returned', description: res.message || 'The item is now available.' });
    }
  };

  const needsBadgeModals =
    teacherTabEnabled('bonuspoints') || teacherTabEnabled('category-badges');
  const needsLibraryModal = teacherTabEnabled('library');
  const needsBrandingCrop = teacherTabEnabled('branding');

  return (
    <>
      {teacherTabEnabled('insights') && (
        <AddonPane tabId="insights" activeTab={activeTab} isWide={isWide}>
          {settings.enableAdminAnalytics ? (
            <AdminStatsTab
              students={students}
              classes={classes}
              teachers={teachers}
              coupons={coupons}
              usedCouponsCount={usedCouponsCount}
              totalPointsAwarded={totalPointsAwarded}
            />
          ) : null}
        </AddonPane>
      )}

      {teacherTabEnabled('halloffame') && (
        <AddonPane tabId="halloffame" activeTab={activeTab} isWide={isWide}>
          <AdminHallOfFameTab schoolId={schoolId} />
        </AddonPane>
      )}

      {teacherTabEnabled('displays') && (
        <AddonPane tabId="displays" activeTab={activeTab} isWide={isWide}>
          <AdminDisplaysTab
            schoolId={schoolId}
            schoolLogoUrl={schoolLogoUrl ?? null}
            settings={settings}
            updateSettings={updateSettings}
          />
        </AddonPane>
      )}

      {teacherTabEnabled('library') && (
        <AddonPane tabId="library" activeTab={activeTab} isWide={isWide}>
          <AdminLibraryTab
            libraryItems={library}
            students={students}
            categories={categories}
            schoolId={schoolId}
            getStudentName={getStudentName}
            onAddLibraryItem={() => {
              setEditingLibraryItem(null);
              setIsLibraryModalOpen(true);
            }}
            onEditLibraryItem={(item) => {
              setEditingLibraryItem(item);
              setIsLibraryModalOpen(true);
            }}
            onDeleteLibraryItem={handleDeleteLibraryItem}
            onReturnLibraryItem={handleReturnLibraryItem}
            onRegisterFromScan={handleSaveLibraryItem}
            upcTaken={(upc) => libraryUpcTaken(upc)}
          />
        </AddonPane>
      )}

      {teacherTabEnabled('bonuspoints') && (
        <AddonPane tabId="bonuspoints" activeTab={activeTab} isWide={isWide}>
          <AdminBonusPointsTab
            achievementsLoading={achievementsLoading}
            achievements={achievements}
            isAddingSamples={isAddingSamples}
            setIsAddSampleBadgesOpen={setIsAddSampleBadgesOpen}
            setEditingAchievement={setEditingAchievement}
            setIsBadgeModalOpen={setIsBadgeModalOpen}
            setAchievementToDelete={setAchievementToDelete}
          />
        </AddonPane>
      )}

      {teacherTabEnabled('category-badges') && (
        <AddonPane tabId="category-badges" activeTab={activeTab} isWide={isWide}>
          <AdminBadgesTab
            categories={categories}
            badgesLoading={badgesLoading}
            badges={badges}
            students={students}
            badgeTogglingId={badgeTogglingId}
            setBadgeTogglingId={setBadgeTogglingId}
            onToggleBadge={async (b: Badge, checked: boolean) => {
              if (!firestore || !schoolId) return;
              await updateBadge(firestore, schoolId, { ...b, enabled: checked });
              toast({ title: checked ? 'Badge enabled' : 'Badge disabled' });
            }}
            setBadgeEarnersFor={setBadgeEarnersFor}
            setEditingCategoryBadge={setEditingCategoryBadge}
            setIsCategoryBadgeModalOpen={setIsCategoryBadgeModalOpen}
            setCategoryBadgeToDelete={setCategoryBadgeToDelete}
            setEditingCategoryBadgeNull={() => setEditingCategoryBadge(null)}
            setIsAddSampleCategoryBadgesOpen={setIsAddSampleCategoryBadgesOpen}
            isAddingSampleCategoryBadges={isAddingSampleCategoryBadges}
          />
        </AddonPane>
      )}

      {teacherTabEnabled('houses') && (
        <AddonPane tabId="houses" activeTab={activeTab} isWide={isWide}>
          <AdminHousesTab
            schoolId={schoolId}
            houses={houses}
            students={students}
            teachers={teachers}
            onAddHouse={addHouse}
            onUpdateHouse={updateHouse}
            onDeleteHouse={async (id, houseStudents) => {
              const house = (houses || []).find((h) => h.id === id);
              const ok = await confirm({
                title: house ? `Delete house "${house.name}"?` : 'Delete this house?',
                description:
                  houseStudents.length > 0
                    ? `${houseStudents.length} student(s) will be unassigned from this house.`
                    : 'No students are assigned to this house.',
                confirmLabel: 'Delete house',
                destructive: true,
              });
              if (!ok) return;
              await deleteHouse(id, houseStudents);
            }}
            onUpdateStudent={updateStudent}
            onUpdateTeacher={updateTeacher}
          />
        </AddonPane>
      )}

      {teacherTabEnabled('notifications') && (
        <AddonPane tabId="notifications" activeTab={activeTab} isWide={isWide}>
          <AdminNotificationsTab />
        </AddonPane>
      )}

      {teacherTabEnabled('integrations') && (
        <AddonPane tabId="integrations" activeTab={activeTab} isWide={isWide}>
          <AdminIntegrationsTab />
        </AddonPane>
      )}

      {teacherTabEnabled('student-portal') && (
        <AddonPane tabId="student-portal" activeTab={activeTab} isWide={isWide}>
          <AdminStudentPortalTab schoolId={schoolId} students={students ?? []} />
        </AddonPane>
      )}

      {teacherTabEnabled('branding') && (
        <AddonPane tabId="branding" activeTab={activeTab} isWide={isWide}>
          <AdminBrandingTab
            schoolId={schoolId}
            firestore={firestore}
            schoolDocRef={schoolDocRef}
            schoolData={{ logoUrl: schoolLogoUrl ?? undefined }}
            logoPreviewUrl={logoPreviewUrl}
            setLogoPreviewUrl={setLogoPreviewUrl}
            previousSchoolLogos={previousSchoolLogos}
            isPreviousLogosOpen={isPreviousLogosOpen}
            setIsPreviousLogosOpen={setIsPreviousLogosOpen}
            logoDisplayMode={settings.logoDisplayMode}
            setLogoDisplayMode={(v) => updateSettings({ logoDisplayMode: v })}
            handleLogoUpload={handleLogoUpload}
            handleRemoveLogo={handleRemoveLogo}
            isLogoUploading={isLogoUploading}
            toast={toast}
            playSound={(s) => playSound(s)}
          />
        </AddonPane>
      )}

      {needsLibraryModal ? (
        <LibraryItemModal
          isOpen={isLibraryModalOpen}
          setIsOpen={setIsLibraryModalOpen}
          item={editingLibraryItem}
          onSave={handleSaveLibraryItem}
          upcTaken={libraryUpcTaken}
          schoolId={schoolId}
        />
      ) : null}

      {needsBadgeModals ? (
        <>
          <AchievementModal
            isOpen={isBadgeModalOpen}
            setIsOpen={setIsBadgeModalOpen}
            achievement={editingAchievement}
            categories={categories || []}
            onSave={async (data) => {
              if (!firestore || !schoolId) return;
              if (editingAchievement && 'id' in data) {
                await updateAchievement(firestore, schoolId, data as Achievement);
              } else {
                await addAchievement(firestore, schoolId, data as Omit<Achievement, 'id'>);
              }
              setEditingAchievement(null);
            }}
          />
          <BadgeModal
            isOpen={isCategoryBadgeModalOpen}
            setIsOpen={setIsCategoryBadgeModalOpen}
            badge={editingCategoryBadge}
            categories={categories || []}
            onSave={async (data) => {
              if (!firestore || !schoolId) return;
              if (editingCategoryBadge && 'id' in data) {
                await updateBadge(firestore, schoolId, data as Badge);
              } else {
                await addBadge(firestore, schoolId, data as Omit<Badge, 'id'>);
              }
              setEditingCategoryBadge(null);
            }}
          />
          <AlertDialog open={!!categoryBadgeToDelete} onOpenChange={(open) => !open && setCategoryBadgeToDelete(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete badge &quot;{categoryBadgeToDelete?.name}&quot;?</AlertDialogTitle>
                <AlertDialogDescription>
                  Students will no longer earn this badge. Already earned badges are not removed.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setCategoryBadgeToDelete(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive hover:bg-destructive/90"
                  onClick={async () => {
                    if (categoryBadgeToDelete && firestore && schoolId) {
                      await deleteBadge(firestore, schoolId, categoryBadgeToDelete.id);
                      setCategoryBadgeToDelete(null);
                      playSound('success');
                      toast({ title: 'Badge deleted' });
                    }
                  }}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      ) : null}

      {needsBrandingCrop && cropLogoSrc ? (
        <ImageCropper
          imageSrc={cropLogoSrc}
          onCropComplete={handleCropComplete}
          onCancel={() => setCropLogoSrc(null)}
        />
      ) : null}
    </>
  );
}
