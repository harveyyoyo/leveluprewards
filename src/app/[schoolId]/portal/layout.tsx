import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Main Portal - levelUp EDU',
  description: 'Choose student kiosk, teacher tools, or admin access for your school rewards hub.',
};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return children;
}
