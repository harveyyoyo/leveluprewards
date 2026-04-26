'use client';

import { Cog, Edit, Gift, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Helper } from '@/components/ui/helper';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DynamicIcon from '@/components/DynamicIcon';
import { VendingMotorPanel } from '@/components/VendingMotorPanel';
import { cn } from '@/lib/utils';
import type { Prize, VendingMotorConfig } from '@/lib/types';

export function AdminPrizesTab({
  prizes,
  onAddPrize,
  onEditPrize,
  onDeletePrize,
  onToggleInStock,
  onUpdatePrize,
}: {
  prizes: Prize[] | null | undefined;
  onAddPrize: () => void;
  onEditPrize: (p: Prize) => void;
  onDeletePrize: (prizeId: string) => void;
  onToggleInStock: (p: Prize, inStock: boolean) => void;
  onUpdatePrize: (p: Prize) => void;
}) {
  return (
    <div className="space-y-4">
      <VendingMotorPanel />
      <Card className="border-t-4 border-destructive shadow-md">
        <CardHeader className="flex flex-row justify-between items-center py-6">
          <div>
            <Helper content="Manage items available for student redemption in the Prize Shop.">
              <CardTitle className="flex items-center gap-2">
                <Gift className="text-destructive w-5 h-5" /> Prize Shop
              </CardTitle>
            </Helper>
            <CardDescription>Items available for student redemption.</CardDescription>
          </div>
          <Button onClick={onAddPrize} className="rounded-xl">
            <Plus className="mr-2 h-4 w-4" /> Add Prize
          </Button>
        </CardHeader>
        <CardContent>
          <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto pr-2">
            {prizes
              ?.sort((a, b) => a.points - b.points)
              .map((p) => {
                const motor = p.vendingMotor;
                const motorEnabled = motor?.enabled === true;
                const motorAxis = motor?.axis ?? 'E';
                const updateMotor = (patch: Partial<VendingMotorConfig> & { enabled?: boolean }) => {
                  const nextEnabled = patch.enabled ?? motorEnabled;
                  if (!nextEnabled) {
                    onUpdatePrize({ ...p, vendingMotor: undefined });
                    return;
                  }
                  onUpdatePrize({
                    ...p,
                    vendingMotor: {
                      enabled: true,
                      axis: (patch.axis ?? motorAxis) as 'X' | 'Y' | 'Z' | 'E',
                      distance: motor?.distance ?? 360,
                      feedRate: motor?.feedRate ?? 500,
                      returnToStart: motor?.returnToStart,
                      customGcode: motor?.customGcode,
                    },
                  });
                };

                return (
                <li
                  key={p.id}
                  className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-secondary/30 p-4 rounded-2xl border group transition-all hover:bg-background"
                >
                  <div className="flex items-center gap-4 flex-grow">
                    <div className="flex flex-col items-center">
                      <Switch
                        checked={p.inStock}
                        onCheckedChange={(checked) => onToggleInStock(p, checked)}
                        className="data-[state=checked]:bg-green-500 scale-75"
                      />
                      <p className="text-[10px] font-bold mt-1 uppercase tracking-tighter opacity-50">{p.inStock ? 'On' : 'Off'}</p>
                    </div>
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center bg-background border flex-shrink-0", !p.inStock && "opacity-40 grayscale")}>
                      <DynamicIcon name={p.icon} className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className={cn("font-bold text-base leading-none mb-1", !p.inStock && "line-through opacity-40")}>{p.name}</p>
                        {motorEnabled ? (
                          <span
                            className="inline-flex items-center gap-0.5 rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-800"
                            title={`Motor axis: ${motorAxis}`}
                          >
                            <Cog className="h-3 w-3" />
                            {motorAxis}
                          </span>
                        ) : null}
                      </div>
                      <p className="text-xs font-bold text-primary">{p.points} points</p>
                    </div>
                  </div>
                  <div className="flex gap-1 self-end sm:self-center">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className={cn(
                            "h-8 w-8 rounded-full",
                            motorEnabled ? "text-emerald-700" : "text-muted-foreground",
                          )}
                          title="Vending motor"
                        >
                          <Cog className="w-4 h-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72 p-3 z-[250]" align="end">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-bold leading-tight">Vending motor</p>
                              <p className="text-xs text-muted-foreground leading-snug">
                                Triggers after this prize is redeemed on the kiosk.
                              </p>
                            </div>
                            <Switch
                              checked={motorEnabled}
                              onCheckedChange={(checked) => updateMotor({ enabled: checked })}
                              className="data-[state=checked]:bg-emerald-500"
                            />
                          </div>
                          <div className={cn("grid grid-cols-1 gap-2", !motorEnabled && "opacity-50 pointer-events-none")}>
                            <div className="space-y-1">
                              <Label className="text-[10px] font-bold uppercase tracking-tighter opacity-60">Axis</Label>
                              <Select
                                value={motorAxis}
                                onValueChange={(v) => updateMotor({ axis: v as 'X' | 'Y' | 'Z' | 'E' })}
                              >
                                <SelectTrigger className="h-8 text-xs px-2">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="X">X</SelectItem>
                                  <SelectItem value="Y">Y</SelectItem>
                                  <SelectItem value="Z">Z</SelectItem>
                                  <SelectItem value="E">E</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => onEditPrize(p)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-red-500" onClick={() => onDeletePrize(p.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </li>
                );
              })}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

