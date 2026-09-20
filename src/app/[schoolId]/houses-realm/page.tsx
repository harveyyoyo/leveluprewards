import { redirect } from 'next/navigation';

/** Old Houses Realm URL — Houses lives at /houses now. */
export default function HousesRealmHomeRedirect({
  params,
}: {
  params: { schoolId: string };
}) {
  redirect(`/${params.schoolId}/houses`);
}
