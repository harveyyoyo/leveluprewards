import { redirect } from 'next/navigation';

export default function ClassroomRealmManageRedirect({
  params,
}: {
  params: { schoolId: string };
}) {
  redirect(`/${params.schoolId}/classroom`);
}
