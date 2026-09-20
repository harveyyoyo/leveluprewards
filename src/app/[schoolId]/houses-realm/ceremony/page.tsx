import { redirect } from 'next/navigation';

/** Old Houses Realm ceremony URL — redirects to /houses/ceremony. */
export default function HousesRealmCeremonyRedirect({
  params,
}: {
  params: { schoolId: string };
}) {
  redirect(`/${params.schoolId}/houses/ceremony`);
}
