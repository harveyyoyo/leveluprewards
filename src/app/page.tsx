'use client';

import Link from 'next/link';
import Logo from '@/components/Logo';

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <Link href="/login" aria-label="Go to login">
        <Logo className="h-24 w-auto" />
      </Link>
    </main>
  );
}
