import { cn } from '@/lib/utils';
import Image from 'next/image';

export default function Logo({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'relative flex items-center justify-center overflow-visible',
        className,
      )}
    >
      <Image
        src="/logo.png"
        alt="levelUp EDU Logo"
        fill
        sizes="(max-width: 768px) 80vw, 520px"
        className="object-contain"
        priority
      />
    </div>
  );
}
