'use client';

import Link from 'next/link';
import { Monitor, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type MobileDisplayUnavailableProps = {
  schoolId: string;
  area: 'admin' | 'parent';
};

export function MobileDisplayUnavailable({ schoolId, area }: MobileDisplayUnavailableProps) {
  const title = area === 'admin' ? 'Admin needs a larger screen' : 'Parent portal needs a larger screen';
  const description =
    area === 'admin'
      ? 'Mobile mode keeps only teacher and student essentials. Switch to Web or App in Settings, or open Admin on a tablet or computer.'
      : 'Mobile mode focuses on teacher and student tasks. Switch to Web or App in Settings to open the parent portal.';

  return (
    <div className="mx-auto flex min-h-[min(70vh,640px)] w-full max-w-lg flex-col items-center justify-center px-4 py-10">
      <Card className="w-full border-emerald-500/25 bg-card/95 shadow-lg">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Smartphone className="h-7 w-7" aria-hidden />
          </div>
          <CardTitle className="text-xl font-black tracking-tight">{title}</CardTitle>
          <CardDescription className="text-sm leading-relaxed">{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button asChild className="h-11 rounded-xl font-bold">
            <Link href={`/${schoolId}/portal`}>Back to portal</Link>
          </Button>
          <Button asChild variant="outline" className="h-11 rounded-xl font-bold">
            <Link href={`/${schoolId}/teacher`}>
              <Monitor className="mr-2 h-4 w-4" />
              Open teacher tools
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
