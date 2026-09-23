'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { OfficeCustomFieldDef } from '@/lib/office/types';
import { cn } from '@/lib/utils';

const BLANK = '__blank__';

/** Editor for one school-defined student field; the value is kept as typed until saved. */
export function OfficeCustomFieldInput({
  def,
  value,
  onChange,
}: {
  def: OfficeCustomFieldDef;
  value: string | boolean | null;
  onChange: (value: string | boolean | null) => void;
}) {
  const id = `custom-${def.id}`;
  const text = typeof value === 'string' ? value : '';

  return (
    <div className={cn('space-y-1.5', def.type === 'longText' && 'col-span-2')}>
      <Label htmlFor={id}>{def.label}</Label>
      {def.type === 'longText' ? (
        <Textarea id={id} value={text} onChange={(e) => onChange(e.target.value)} className="min-h-[64px] rounded-xl" />
      ) : def.type === 'yesNo' || def.type === 'choice' ? (
        <Select
          value={def.type === 'yesNo' ? (value === true ? 'yes' : value === false ? 'no' : BLANK) : text || BLANK}
          onValueChange={(v) => {
            if (v === BLANK) onChange(null);
            else if (def.type === 'yesNo') onChange(v === 'yes');
            else onChange(v);
          }}
        >
          <SelectTrigger id={id} className="rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={BLANK}>—</SelectItem>
            {def.type === 'yesNo' ? (
              <>
                <SelectItem value="yes">Yes</SelectItem>
                <SelectItem value="no">No</SelectItem>
              </>
            ) : (
              <>
                {/* Keep a stored value visible even if it was later taken off the list. */}
                {text && !(def.options ?? []).includes(text) ? <SelectItem value={text}>{text}</SelectItem> : null}
                {(def.options ?? []).map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </>
            )}
          </SelectContent>
        </Select>
      ) : (
        <Input
          id={id}
          type={def.type === 'number' ? 'number' : def.type === 'date' ? 'date' : 'text'}
          value={text}
          onChange={(e) => onChange(e.target.value)}
          className="rounded-xl"
        />
      )}
    </div>
  );
}
