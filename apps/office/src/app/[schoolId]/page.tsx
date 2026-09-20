import { redirect } from 'next/navigation';

type OfficeSchoolRootPageProps = {
  params: { schoolId: string };
};

/** Public office-host URLs use /{schoolId}; internal routes live under /{schoolId}/office. */
export default function OfficeSchoolRootPage({ params }: OfficeSchoolRootPageProps) {
  const schoolId = params.schoolId?.trim().toLowerCase();
  if (!schoolId) {
    redirect('/office-bootstrap');
  }
  redirect(`/${schoolId}/office`);
}
