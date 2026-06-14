'use client';

import * as React from 'react';
import { Delete } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useArcadeSound } from '@/hooks/useArcadeSound';

interface AlphanumericKeyboardProps {
  value: string;
  onChange: (newValue: string) => void;
  className?: string;
}

export function AlphanumericKeyboard({ value, onChange, className }: AlphanumericKeyboardProps) {
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

  const row1 = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
  const row2 = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'];
  const row3 = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'];
  const row4 = ['z', 'x', 'c', 'v', 'b', 'n', 'm', '-'];

  return (
    <div className={`mx-auto w-full max-w-[420px] p-2 select-none flex flex-col gap-1.5 ${className || ''}`} data-testid="alphanumeric-keyboard">
      {/* Row 1 */}
      <div className="flex justify-center gap-1">
        {row1.map((key) => (
          <Button
            key={key}
            type="button"
            variant="outline"
            onMouseDown={(e) => e.preventDefault()}
            className="h-10 w-8 sm:h-12 sm:w-10 text-sm sm:text-base font-black rounded-lg border border-border/60 bg-card hover:bg-accent hover:text-accent-foreground active:scale-95 transition-transform duration-100 flex items-center justify-center shadow-sm"
            onClick={() => handleKeyPress(key)}
          >
            {key}
          </Button>
        ))}
      </div>

      {/* Row 2 */}
      <div className="flex justify-center gap-1">
        {row2.map((key) => (
          <Button
            key={key}
            type="button"
            variant="outline"
            onMouseDown={(e) => e.preventDefault()}
            className="h-10 w-8 sm:h-12 sm:w-10 text-sm sm:text-base font-black rounded-lg border border-border/60 bg-card hover:bg-accent hover:text-accent-foreground active:scale-95 transition-transform duration-100 flex items-center justify-center shadow-sm"
            onClick={() => handleKeyPress(key)}
          >
            {key}
          </Button>
        ))}
      </div>

      {/* Row 3 */}
      <div className="flex justify-center gap-1">
        {row3.map((key) => (
          <Button
            key={key}
            type="button"
            variant="outline"
            onMouseDown={(e) => e.preventDefault()}
            className="h-10 w-8 sm:h-12 sm:w-10 text-sm sm:text-base font-black rounded-lg border border-border/60 bg-card hover:bg-accent hover:text-accent-foreground active:scale-95 transition-transform duration-100 flex items-center justify-center shadow-sm"
            onClick={() => handleKeyPress(key)}
          >
            {key}
          </Button>
        ))}
      </div>

      {/* Row 4 */}
      <div className="flex justify-center gap-1">
        {row4.map((key) => (
          <Button
            key={key}
            type="button"
            variant="outline"
            onMouseDown={(e) => e.preventDefault()}
            className="h-10 w-8 sm:h-12 sm:w-10 text-sm sm:text-base font-black rounded-lg border border-border/60 bg-card hover:bg-accent hover:text-accent-foreground active:scale-95 transition-transform duration-100 flex items-center justify-center shadow-sm"
            onClick={() => handleKeyPress(key)}
          >
            {key}
          </Button>
        ))}
      </div>

      {/* Row 5 */}
      <div className="flex justify-center gap-1">
        <Button
          type="button"
          variant="outline"
          onMouseDown={(e) => e.preventDefault()}
          className="h-10 px-2 sm:px-4 sm:h-12 text-xs font-bold uppercase tracking-wider rounded-lg border border-border/60 bg-card hover:bg-accent hover:text-accent-foreground active:scale-95 transition-transform duration-100 text-muted-foreground flex items-center justify-center shadow-sm"
          onClick={handleClear}
          title="Clear all"
        >
          Clear
        </Button>
        <Button
          type="button"
          variant="outline"
          onMouseDown={(e) => e.preventDefault()}
          className="h-10 flex-1 max-w-[150px] sm:h-12 text-xs font-bold uppercase tracking-wider rounded-lg border border-border/60 bg-card hover:bg-accent hover:text-accent-foreground active:scale-95 transition-transform duration-100 text-muted-foreground flex items-center justify-center shadow-sm"
          onClick={() => handleKeyPress(' ')}
          title="Space"
        >
          Space
        </Button>
        <Button
          type="button"
          variant="outline"
          onMouseDown={(e) => e.preventDefault()}
          className="h-10 px-3 sm:px-4 sm:h-12 rounded-lg border border-border/60 bg-card hover:bg-accent hover:text-accent-foreground active:scale-95 transition-transform duration-100 text-muted-foreground flex items-center justify-center shadow-sm"
          onClick={handleBackspace}
          title="Backspace"
        >
          <Delete className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>
      </div>
    </div>
  );
}
