import { redirect } from 'next/navigation';

export default function ClassroomRealmClassScreenRedirect({
  params,
}: {
  params: { schoolId: string };
}) {
  redirect(`/${params.schoolId}/classroom?audience=student`);
}
