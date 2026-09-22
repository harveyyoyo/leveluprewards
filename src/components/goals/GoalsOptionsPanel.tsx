'use client';

import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings2 } from 'lucide-react';
import {
  GOALS_OPTION_FIELDS,
  resolveGoalsOptions,
  type GoalsOptions,
} from '@/lib/goals/goalsOptions';

export function GoalsOptionsPanel(props: {
  value: Partial<GoalsOptions> | undefined;
  onChange: (next: GoalsOptions) => void;
  disabled?: boolean;
}) {
  const opts = resolveGoalsOptions(props.value);

  return (
    <Card className="border-t-8 border-muted shadow-md max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-muted-foreground" />
          Goals options
        </CardTitle>
        <CardDescription>
          Keep the main screens simple. Turn extras on only when you want them.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {GOALS_OPTION_FIELDS.map((field) => (
          <div
            key={field.key}
            className="flex items-start justify-between gap-4 rounded-xl border bg-muted/10 px-3 py-3"
          >
            <div className="min-w-0 space-y-0.5">
              <Label htmlFor={`goals-opt-${field.key}`} className="text-sm font-semibold">
                {field.label}
              </Label>
              <p className="text-[11px] text-muted-foreground leading-snug">{field.hint}</p>
            </div>
            <Switch
              id={`goals-opt-${field.key}`}
              checked={opts[field.key]}
              disabled={props.disabled}
              onCheckedChange={(checked) => {
                props.onChange({ ...opts, [field.key]: checked });
              }}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
