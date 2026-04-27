'use client';

import { Ticket } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Helper } from '@/components/ui/helper';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Coupon } from '@/lib/types';

export function AdminCouponsTab({
  availableCoupons,
  redeemedCoupons,
  getStudentName,
}: {
  availableCoupons: Coupon[];
  redeemedCoupons: Coupon[];
  getStudentName: (id?: string) => string;
}) {
  return (
    <Card className="border-t-4 border-primary shadow-md">
      <CardHeader>
        <Helper content="This section shows all coupons that have been generated in the system, separated into those that are still available and those that have already been redeemed by a student.">
          <CardTitle className="flex items-center gap-2">
            <Ticket className="w-5 h-5 text-destructive" /> Coupon Management
          </CardTitle>
        </Helper>
        <CardDescription>View all available and redeemed coupons in the system.</CardDescription>
      </CardHeader>
      <CardContent className="grid md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">Available Coupons ({availableCoupons.length})</h3>
          <ScrollArea className="h-[500px] border rounded-lg bg-background/50">
            {availableCoupons.length >= 1 ? (
              <ul className="p-3 space-y-2">
                {availableCoupons.map((coupon) => (
                  <li key={coupon.id} className="p-3 bg-card rounded-lg border">
                    <div className="flex justify-between items-center font-bold">
                      <span className="font-code text-primary">{coupon.code}</span>
                      <span>{coupon.value} pts</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      <p>
                        {coupon.category} / by {coupon.teacher}
                      </p>
                      <p>Created on {new Date(coupon.createdAt).toLocaleDateString()}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-center text-sm text-muted-foreground p-8">No available coupons.</p>
            )}
          </ScrollArea>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4">Redeemed Coupons ({redeemedCoupons.length})</h3>
          <ScrollArea className="h-[500px] border rounded-lg bg-background/50">
            {redeemedCoupons.length >= 1 ? (
              <ul className="p-3 space-y-2">
                {redeemedCoupons.map((coupon) => (
                  <li key={coupon.id} className="p-3 bg-card rounded-lg border opacity-70">
                    <div className="flex justify-between items-center font-bold">
                      <span className="font-code">{coupon.code}</span>
                      <span>{coupon.value} pts</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      <p>
                        {coupon.category} / by {coupon.teacher}
                      </p>
                      <p>
                        Used by {getStudentName(String(coupon.usedBy || '')) || 'Unknown'} on{' '}
                        {coupon.usedAt ? new Date(coupon.usedAt).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-center text-sm text-muted-foreground p-8">No redeemed coupons.</p>
            )}
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}

