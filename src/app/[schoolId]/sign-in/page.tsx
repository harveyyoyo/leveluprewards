import { redirect } from 'next/navigation';

export default function SchoolSignInPageRedirect({ params }: { params: { schoolId: string } }) {
  redirect(`/${String(params?.schoolId ?? '').trim().toLowerCase()}/portal`);
}
