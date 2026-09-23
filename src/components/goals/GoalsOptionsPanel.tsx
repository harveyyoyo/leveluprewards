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
          Goals settings
        </CardTitle>
        <CardDescription>
          Choose where goal progress appears and which messages people see. Each explanation tells you what turning the setting on or off does.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {[
          { title: 'Celebrations and reminders', keys: ['celebrateOnAward', 'teacherAlmostThereNudge'] },
          { title: 'Where progress appears', keys: ['showOnClassroom', 'showNeedMoreInShop', 'hallwaySpotlight'] },
        ].map((group) => <section key={group.title} className="space-y-3">
          <h3 className="font-semibold text-base">{group.title}</h3>
          {GOALS_OPTION_FIELDS.filter((field) => group.keys.includes(field.key)).map((field) => (
          <div
            key={field.key}
            className="flex items-start justify-between gap-4 rounded-xl border bg-muted/10 px-3 py-3"
          >
            <div className="min-w-0 space-y-2">
              <Label htmlFor={`goals-opt-${field.key}`} className="text-sm font-semibold">
                {field.label}
              </Label>
              <p id={`goals-opt-${field.key}-hint`} className="text-sm text-muted-foreground leading-relaxed">{field.hint}</p>
            </div>
            <Switch
              id={`goals-opt-${field.key}`}
              aria-describedby={`goals-opt-${field.key}-hint`}
              checked={opts[field.key]}
              disabled={props.disabled}
              onCheckedChange={(checked) => {
                props.onChange({ ...opts, [field.key]: checked });
              }}
            />
          </div>
        ))}</section>)}
      </CardContent>
    </Card>
  );
}
