'use client';

import { useMemo, useState } from 'react';
import { Copy, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

type PillarPortalUrlFieldProps = {
  href: string;
  description?: string;
};

export function PillarPortalUrlField({ href, description }: PillarPortalUrlFieldProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const fullUrl = useMemo(() => {
    if (href.startsWith('http://') || href.startsWith('https://')) return href;
    if (typeof window === 'undefined') return href;
    return `${window.location.origin}${href.startsWith('/') ? href : `/${href}`}`;
  }, [href]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      toast({ title: 'Link copied' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ variant: 'destructive', title: 'Could not copy link' });
    }
  };

  return (
    <div className="mt-3 space-y-2 rounded-xl border border-teal-200/60 bg-teal-50/50 p-3 dark:border-teal-900/40 dark:bg-teal-950/20">
      {description ? <p className="text-[11px] text-muted-foreground leading-snug">{description}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Input readOnly value={fullUrl} className="font-mono text-xs flex-1 min-w-[200px] h-9 rounded-lg" />
        <Button type="button" variant="outline" size="sm" className="rounded-lg gap-1.5" onClick={() => void copy()}>
          <Copy className="h-3.5 w-3.5" />
          {copied ? 'Copied' : 'Copy'}
        </Button>
        <Button type="button" variant="outline" size="sm" className="rounded-lg gap-1.5" asChild>
          <a href={fullUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-3.5 w-3.5" />
            Open
          </a>
        </Button>
      </div>
    </div>
  );
}
