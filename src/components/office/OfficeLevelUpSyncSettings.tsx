'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { useAppContext } from '@/components/AppProvider';
import { useAuthFetch } from '@/lib/authFetch';
import { useToast } from '@/hooks/use-toast';
import { useOfficeConfirm } from '@/components/office/useOfficeConfirm';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { saveOfficeSettings } from '@/lib/office/officeSettingsDoc';
import {
  OFFICE_SYNC_ITEMS,
  OFFICE_SYNC_MODES,
  type OfficeLevelUpSyncSettings,
  type OfficeSyncItem,
  type OfficeSyncMode,
} from '@/lib/office/officeLevelUpSync';
import { runOfficeLevelUpSync } from '@/lib/office/useOfficeLevelUpAutoSync';

/**
 * Settings → levelUp sync: for each kind of record, whether it's shared with levelUp and which
 * way. Turning one on first shows what would change, and nothing is written until it's confirmed.
 */
export function OfficeLevelUpSyncSettings({
  schoolId,
  current,
}: {
  schoolId: string;
  current: OfficeLevelUpSyncSettings | null | undefined;
}) {
  const firestore = useFirestore();
  const { userName } = useAppContext();
  const authFetch = useAuthFetch();
  const { toast } = useToast();
  const { confirm, confirmDialog } = useOfficeConfirm();
  const [busy, setBusy] = useState<OfficeSyncItem | null>(null);

  const change = async (item: OfficeSyncItem, mode: OfficeSyncMode) => {
    if (!firestore) return;
    setBusy(item);
    try {
      if (mode !== 'off') {
        const res = await authFetch('/api/office/levelup-sync', {
          method: 'POST',
          body: JSON.stringify({ schoolId, action: 'preview', item, mode }),
        });
        const data = (await res.json().catch(() => ({}))) as { lines?: string[]; error?: string };
        if (!res.ok) throw new Error(data.error || 'Could not check what would change.');
        const label = OFFICE_SYNC_MODES.find((m) => m.id === mode)?.label ?? mode;
        const ok = await confirm({
          title: `Share ${OFFICE_SYNC_ITEMS.find((i) => i.id === item)?.label.toLowerCase()}: ${label}?`,
          description: (
            <span className="block space-y-1.5">
              {(data.lines ?? []).map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
              <span className="block pt-1 text-xs">
                After this, changes are copied automatically. Removing a student is never copied — points and
                history in levelUp stay safe.
              </span>
            </span>
          ),
          confirmLabel: 'Turn on',
        });
        if (!ok) return;
      }
      await saveOfficeSettings(firestore, schoolId, { levelUpSync: { ...(current ?? {}), [item]: mode } }, userName);
      if (mode !== 'off') {
        const result = await runOfficeLevelUpSync(authFetch, schoolId);
        toast({ title: 'Sharing is on', description: result?.lines?.join(' ') });
      } else {
        toast({ title: 'Sharing is off', description: 'Nothing already copied is removed.' });
      }
    } catch (e) {
      toast({ variant: 'destructive', title: 'Could not change sharing', description: (e as Error).message });
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {confirmDialog}
      <h2 className="text-base font-bold">levelUp sync</h2>
      <p className="text-xs text-muted-foreground">
        Share records with levelUp (points, kiosk and ID cards) so they only need to be entered once. Each one can be
        off, or copied one way or both ways.
      </p>
      <div className="mt-4 divide-y rounded-xl border dark:divide-slate-800 dark:border-slate-800">
        {OFFICE_SYNC_ITEMS.map((item) => {
          const mode = current?.[item.id] ?? 'off';
          return (
            <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.ready ? item.detail : 'Coming next.'}</p>
              </div>
              <div className="flex items-center gap-2">
                {busy === item.id ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden /> : null}
                <Select
                  value={mode}
                  disabled={!item.ready || busy !== null}
                  onValueChange={(v) => void change(item.id, v as OfficeSyncMode)}
                >
                  <SelectTrigger className="w-44 rounded-xl" aria-label={`Share ${item.label}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OFFICE_SYNC_MODES.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
