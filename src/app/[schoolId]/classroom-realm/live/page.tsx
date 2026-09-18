import { redirect } from 'next/navigation';

export default function ClassroomRealmLiveRedirect({
  params,
  searchParams,
}: {
  params: { schoolId: string };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (typeof value === 'string') q.set(key, value);
  }
  const qs = q.toString();
  redirect(`/${params.schoolId}/classroom${qs ? `?${qs}` : ''}`);
}
