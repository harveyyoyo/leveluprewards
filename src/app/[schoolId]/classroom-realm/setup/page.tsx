import { redirect } from 'next/navigation';

export default function ClassroomRealmSetupRedirect({
  params,
}: {
  params: { schoolId: string };
}) {
  redirect(`/${params.schoolId}/classroom`);
}
