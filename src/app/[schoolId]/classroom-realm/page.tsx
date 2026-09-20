import { redirect } from 'next/navigation';

/** Old Classroom Realm hub — Classroom is the live page now. */
export default function ClassroomRealmHomeRedirect({
  params,
}: {
  params: { schoolId: string };
}) {
  redirect(`/${params.schoolId}/classroom`);
}
