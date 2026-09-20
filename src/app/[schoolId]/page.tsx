import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { isOfficeHostname } from '@/lib/officeRouting';

type SchoolRootPageProps = {
  params: { schoolId: string };
};

/** On the office subdomain, /{schoolId} should open School Office (not 404). */
export default function SchoolRootPage({ params }: SchoolRootPageProps) {
  const host =
    headers().get('x-forwarded-host') ??
    headers().get('x-fh-requested-host') ??
    headers().get('host') ??
    '';

  if (!isOfficeHostname(host)) {
    notFound();
  }

  const schoolId = params.schoolId?.trim().toLowerCase();
  if (!schoolId) {
    notFound();
  }

  redirect(`/${schoolId}/office`);
}
