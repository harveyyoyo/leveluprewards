import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SchoolSessionGate } from '@/components/auth/SchoolSessionGate';

/** Next.js 14: sync params. Next.js 15+: params may be a Promise — normalize both. */
type SchoolRouteParams =
  | { schoolId?: string | string[] | undefined }
  | Promise<{ schoolId?: string | string[] | undefined }>;

function normalizeSchoolSegment(raw: unknown): string {
  if (typeof raw !== 'string' || !raw.trim()) return '';
  return raw.trim();
}

async function resolvedSchoolParams(params: SchoolRouteParams): Promise<{ schoolId: string }> {
  const p = params instanceof Promise ? await params : params;
  const id = normalizeSchoolSegment(Array.isArray(p.schoolId) ? p.schoolId[0] : p?.schoolId);
  if (!id) notFound();
  return { schoolId: id };
}

export async function generateMetadata({ params }: { params: SchoolRouteParams }): Promise<Metadata> {
  const { schoolId } = await resolvedSchoolParams(params);
  return {
    manifest: `/api/manifest?schoolId=${schoolId}`,
  };
}

export default async function SchoolLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: SchoolRouteParams;
}) {
  const { schoolId } = await resolvedSchoolParams(params);
  return <SchoolSessionGate routeSchoolId={schoolId}>{children}</SchoolSessionGate>;
}
