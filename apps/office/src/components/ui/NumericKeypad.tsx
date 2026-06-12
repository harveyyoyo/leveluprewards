'use client';

import * as React from 'react';
import { Delete } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useArcadeSound } from '@/hooks/useArcadeSound';

interface NumericKeypadProps {
  value: string;
  onChange: (newValue: string) => void;
  onSubmit?: () => void;
  className?: string;
}

export function NumericKeypad({ value, onChange, onSubmit, className }: NumericKeypadProps) {
  const playSound = useArcadeSound();

  const handleKeyPress = (key: string) => {
    playSound('click');
    onChange(value + key);
  };

  const handleBackspace = () => {
    playSound('click');
    if (value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const handleClear = () => {
    playSound('click');
    onChange('');
  };

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  return (
    <div className={`mx-auto w-full max-w-[320px] p-1 select-none ${className || ''}`} data-testid="numeric-keypad">
      <div className="grid grid-cols-3 gap-2">
        {keys.map((key) => (
          <Button
            key={key}
            type="button"
            variant="outline"
            className="h-12 text-xl font-black rounded-xl border border-border/60 bg-card hover:bg-accent hover:text-accent-foreground active:scale-95 transition-transform duration-100 flex items-center justify-center shadow-sm"
            onClick={() => handleKeyPress(key)}
          >
            {key}
          </Button>
        ))}
        <Button
          type="button"
          variant="outline"
          className="h-12 text-xs font-bold uppercase tracking-wider rounded-xl border border-border/60 bg-card hover:bg-accent hover:text-accent-foreground active:scale-95 transition-transform duration-100 text-muted-foreground flex items-center justify-center shadow-sm"
          onClick={handleClear}
          title="Clear all"
        >
          Clear
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-12 text-xl font-black rounded-xl border border-border/60 bg-card hover:bg-accent hover:text-accent-foreground active:scale-95 transition-transform duration-100 flex items-center justify-center shadow-sm"
          onClick={() => handleKeyPress('0')}
        >
          0
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-12 rounded-xl border border-border/60 bg-card hover:bg-accent hover:text-accent-foreground active:scale-95 transition-transform duration-100 text-muted-foreground flex items-center justify-center shadow-sm"
          onClick={handleBackspace}
          title="Backspace"
        >
          <Delete className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
