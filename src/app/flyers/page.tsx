import { redirect } from 'next/navigation';
import { MARKETING_FLYERS_HREF } from '@/lib/marketingLandings';

export const metadata = {
  title: 'Flyers — levelUp EDU',
  description: 'Printable flyers for LevelUp school rewards — preview, open, and print.',
};

export default function FlyersPage() {
  redirect(MARKETING_FLYERS_HREF);
}
