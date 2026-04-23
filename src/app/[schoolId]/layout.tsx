import { Metadata } from 'next';
import { SchoolSessionGate } from '@/components/SchoolSessionGate';

export async function generateMetadata({ params }: { params: { schoolId: string } }): Promise<Metadata> {
  const schoolId = params.schoolId;
  return {
    manifest: `/api/manifest?schoolId=${schoolId}`,
  };
}

export default function SchoolLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { schoolId: string };
}) {
  return <SchoolSessionGate routeSchoolId={params.schoolId}>{children}</SchoolSessionGate>;
}
