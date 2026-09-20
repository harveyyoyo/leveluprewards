import { redirect } from 'next/navigation';

/** Old Houses Realm hall-of-fame URL — redirects to /houses/hall-of-fame. */
export default function HousesRealmHallOfFameRedirect({
  params,
}: {
  params: { schoolId: string };
}) {
  redirect(`/${params.schoolId}/houses/hall-of-fame`);
}
