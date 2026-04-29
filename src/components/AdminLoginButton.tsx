'use client';

import Link from 'next/link';
import { useAppContext } from './AppProvider';
import { UserCog } from 'lucide-react';
import { Button } from './ui/button';
import { useArcadeSound } from '@/hooks/useArcadeSound';

export function AdminLoginButton() {
  const { loginState, schoolId } = useAppContext();
  const playSound = useArcadeSound();

  if (loginState !== 'student' || !schoolId) {
    return null;
  }

  return (
    <Button 
      variant="ghost" 
      size="sm" 
      asChild 
      className="h-8 px-1.5 sm:px-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all"
    >
      <Link 
        href={`/login?school=${encodeURIComponent(schoolId)}`} 
        onClick={() => playSound('click')}
        className="flex items-center gap-1.5"
      >
        <UserCog className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Admin Login</span>
      </Link>
    </Button>
  );
}
