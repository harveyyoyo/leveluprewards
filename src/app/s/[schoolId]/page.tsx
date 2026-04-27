'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppContext } from '@/components/AppProvider';
import { useFirebase } from '@/firebase';
import { getDoc } from 'firebase/firestore';
import { schoolPublicDocRef } from '@/lib/schoolPublic';
import { useSettings } from '@/components/providers/SettingsProvider';
import { Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PublicSchoolPage() {
    const { schoolId } = useParams<{ schoolId: string }>();
    const router = useRouter();
    const { login, isInitialized, isUserLoading } = useAppContext();
    const { firestore } = useFirebase();
    const { settings } = useSettings();
    const isGraphic = settings.graphicMode === 'graphics';

    const [notFound, setNotFound] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isInitialized || isUserLoading) return;

        if (!firestore || !schoolId) return;

        let cancelled = false;
        (async () => {
            try {
                const snap = await getDoc(schoolPublicDocRef(firestore, schoolId));
                if (cancelled) return;

                if (snap.exists() && snap.data()?.active !== false) {
                    // Automatically log them in as a student
                    await login('student', { schoolId });
                    if (!cancelled) {
                        router.push(`/${schoolId}/portal`);
                    }
                } else {
                    setNotFound(true);
                }
            } catch (error) {
                console.error("Error fetching school:", error);
                if (!cancelled) setNotFound(true);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [isInitialized, isUserLoading, firestore, schoolId, router, login]);

    if (loading || !isInitialized || isUserLoading) {
        return (
            <div className={cn(
                "min-h-screen flex flex-col items-center justify-center gap-4 font-sans",
                isGraphic ? 'bg-background text-foreground' : 'bg-background text-muted-foreground'
            )}>
                <Loader2 className="w-8 h-8 animate-spin" />
                <p className="font-medium text-sm">Loading&hellip;</p>
            </div>
        );
    }

    if (notFound) {
        return (
            <div className={cn(
                "min-h-screen flex flex-col items-center justify-center gap-6 px-6 font-sans",
                isGraphic ? 'bg-background text-foreground' : 'bg-background text-foreground'
            )}>
                <div className={cn(
                    "w-full max-w-sm rounded-2xl p-8 text-center border",
                    isGraphic ? 'bg-card/10 backdrop-blur-xl border-border' : 'bg-card border-border shadow-lg'
                )}>
                    <AlertCircle className={cn("w-12 h-12 mx-auto mb-4", isGraphic ? 'text-destructive' : 'text-red-500')} />
                    <h2 className="text-lg font-bold mb-2">School Not Found</h2>
                    <p className={cn("text-sm mb-6", isGraphic ? 'text-muted-foreground' : 'text-slate-500')}>
                        There is no school with the ID <span className="font-bold font-code">{schoolId}</span>. Please check the link and try again.
                    </p>
                    <button
                        onClick={() => router.push('/')}
                        className={cn(
                            "w-full h-12 font-bold rounded-xl transition-all",
                            isGraphic ? 'bg-foreground/10 hover:bg-foreground/20 text-foreground' : 'bg-slate-800 hover:bg-slate-700 text-white'
                        )}
                    >
                        Go to Login
                    </button>
                </div>
            </div>
        );
    }

    return null;
}
