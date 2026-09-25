'use client';

import { usePathname } from 'next/navigation';
import { Link2 } from 'lucide-react';
import { useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useDemoShareKeys } from '@/hooks/useDemoShareKeys';
import { demoLinkForSchoolPage } from '@/lib/demoSchoolLink';
import { isAllowedDeveloperGoogleUser } from '@/lib/developerAccess';
import { isPublicSampleSchoolId } from '@/lib/sampleSchools';

/** Owner only, demo schools only: copies a link that opens this page without the passcode. */
export function DemoShareButton({ schoolId }: { schoolId: string }) {
  const pathname = usePathname();
  const { user } = useFirebase();
  const { toast } = useToast();
  const isDemoSchool = isPublicSampleSchoolId(schoolId);
  const { keys, error } = useDemoShareKeys(isDemoSchool);

  if (!isDemoSchool || !isAllowedDeveloperGoogleUser(user)) return null;

  const share = async () => {
    const link = keys
      ? demoLinkForSchoolPage(window.location.origin, pathname, window.location.search, keys)
      : null;
    if (!link) {
      toast({
        variant: 'destructive',
        title: 'Could not make a share link',
        description: error ?? 'Wait a moment and try again.',
      });
      return;
    }
    try {
      await navigator.clipboard.writeText(link);
      toast({ title: 'Share link copied!', description: 'It opens this page with no passcode.' });
    } catch {
      toast({ variant: 'destructive', title: 'Could not copy the link', description: link });
    }
  };

  return (
    <button
      type="button"
      onClick={() => void share()}
      title="Copy a link that opens this page without the passcode"
      className="no-print fixed bottom-24 left-3 z-40 inline-flex items-center gap-1.5 rounded-full border border-border bg-card/90 px-3 py-2 text-xs font-semibold text-foreground shadow-lg backdrop-blur transition-colors hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <Link2 className="h-4 w-4" aria-hidden />
      Share
    </button>
  );
}
