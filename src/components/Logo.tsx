import { cn } from '@/lib/utils';

export default function Logo({ className }: { className?: string }) {
  return (
    <img
      src="/logo.png"
      alt="levelUp EDU Logo"
      className={cn('object-contain', className)}
    />
  );
}
