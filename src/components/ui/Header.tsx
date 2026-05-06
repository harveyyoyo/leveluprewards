'use client';

import Link from 'next/link';
import { School, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/components/AppProvider';

export default function Header() {
  const { loginState, logout, schoolId } = useAppContext();

  // Do not render the header on login/kiosk pages
  if (loginState === 'loggedOut' || loginState === 'developer') {
    return null;
  }

  return (
    <header className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b shadow-md">
      <div className="container flex h-16 items-center">
        <div className="mr-4 flex">
          <Link href="/portal" className="flex items-center space-x-2">
            <School className="h-6 w-6" />
            {schoolId && <span className="font-bold sm:inline-block capitalize">{schoolId}</span>}
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-2">
          <Button variant="outline" onClick={() => logout()}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
}
