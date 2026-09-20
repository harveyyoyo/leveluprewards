import { redirect } from 'next/navigation';

/** Old Houses Realm setup URL — redirects to /houses/setup. */
export default function HousesRealmSetupRedirect({
  params,
}: {
  params: { schoolId: string };
}) {
  redirect(`/${params.schoolId}/houses/setup`);
}
