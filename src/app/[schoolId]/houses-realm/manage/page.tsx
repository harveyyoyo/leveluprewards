import { redirect } from 'next/navigation';

/** Old Houses Realm manage URL — redirects to /houses/manage. */
export default function HousesRealmManageRedirect({
  params,
}: {
  params: { schoolId: string };
}) {
  redirect(`/${params.schoolId}/houses/manage`);
}
