import Link from 'next/link';
import { LevelUpLogoBrutalist } from '@/components/LevelUpLogoBrutalist';
import { Button } from '@/components/ui/button';

export default function RootPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
      <div className="flex w-full max-w-md flex-col items-center gap-8 text-center">
        <div className="flex w-full flex-col items-center">
          <LevelUpLogoBrutalist className="items-center text-center [&_h1]:text-center" />
        </div>

        <div className="w-full space-y-3">
          <Button asChild className="h-12 w-full rounded-xl font-bold">
            <Link href="/login">School Login</Link>
          </Button>
          <Button asChild variant="outline" className="h-12 w-full rounded-xl font-bold">
            <Link href="/developer">Developer Tools</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
