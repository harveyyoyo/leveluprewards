'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';

export function LevelUpKioskLogo({ className, src }: { className?: string; src?: string }) {
  return (
    <div className={cn("relative flex items-center justify-center p-1", className)}>
      {/* Subtle Glow Effect */}
      <div className="absolute inset-0 bg-primary/10 rounded-full blur-xl animate-pulse opacity-50" />
      
      {/* Logo Container with floating and glow animations */}
      <div className="relative z-10 animate-float transition-all duration-500 hover:scale-105">
        <Image
          src={src || "/logo.png"}
          alt="LevelUp Logo"
          width={80}
          height={80}
          className="object-contain drop-shadow-md"
          priority
        />
      </div>
      
      {/* Simple outer ring */}
      <div className="absolute -inset-2 border border-primary/10 rounded-full opacity-40" />
    </div>
  );
}
