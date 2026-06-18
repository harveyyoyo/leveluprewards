import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SchoolSessionGate } from '@/components/auth/SchoolSessionGate';

/** Next.js 14: sync params. Next.js 15+: params may be a Promise — normalize both. */
type SchoolRouteParams =
  | { schoolId?: string | string[] | undefined }
  | Promise<{ schoolId?: string | string[] | undefined }>;

import { normalizeSchoolId } from '@/lib/schoolId';

function normalizeSchoolSegment(raw: unknown): string {
  const id = normalizeSchoolId(typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : '');
  if (!id) notFound();
  return id;
}

async function resolvedSchoolParams(params: SchoolRouteParams): Promise<{ schoolId: string }> {
  const p = params instanceof Promise ? await params : params;
  const raw = Array.isArray(p.schoolId) ? p.schoolId[0] : p?.schoolId;
  return { schoolId: normalizeSchoolSegment(raw) };
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
