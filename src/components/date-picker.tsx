'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

type Props = {
  value: string | null;
  onChange: (iso: string | null) => void;
  label: string;
};

export function DatePicker({ value, onChange, label }: Props) {
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(() => {
    const d = value ? new Date(value) : new Date();
    return startOfMonth(d);
  });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const selected = value ? new Date(value) : null;
  const today = new Date();
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const totalDays = daysInMonth(year, month);

  function selectDay(day: number) {
    const d = new Date(year, month, day);
    onChange(d.toISOString());
    setOpen(false);
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange(null);
  }

  function formatDisplay(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  const cells: (number | null)[] = [
    ...Array<null>(firstDow).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="relative" ref={ref}>
      <p className="text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wide">{label}</p>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center justify-between w-full px-2 py-1.5 rounded text-sm hover:bg-accent/50 transition-colors group"
      >
        <span className={selected ? 'text-foreground' : 'text-muted-foreground'}>
          {selected ? formatDisplay(value!) : 'No date'}
        </span>
        {selected && (
          <span onClick={clear} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground">
            <X className="h-3 w-3" />
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 w-64 bg-popover border border-border rounded-lg shadow-lg z-30 p-3">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setCursor(new Date(year, month - 1, 1))}
              className="p-1 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium">{MONTHS[month]} {year}</span>
            <button
              onClick={() => setCursor(new Date(year, month + 1, 1))}
              className="p-1 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map(d => (
              <div key={d} className="text-center text-xs text-muted-foreground py-1">{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {cells.map((day, i) => {
              if (!day) return <div key={i} />;
              const thisDay = new Date(year, month, day);
              const isSelected = selected ? isSameDay(thisDay, selected) : false;
              const isToday = isSameDay(thisDay, today);
              return (
                <button
                  key={i}
                  onClick={() => selectDay(day)}
                  className={[
                    'h-7 w-7 mx-auto rounded text-sm transition-colors flex items-center justify-center',
                    isSelected
                      ? 'bg-primary text-primary-foreground font-medium'
                      : isToday
                      ? 'text-primary font-medium hover:bg-accent'
                      : 'hover:bg-accent text-foreground',
                  ].join(' ')}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Today shortcut */}
          <div className="mt-3 pt-2 border-t border-border">
            <button
              onClick={() => { onChange(today.toISOString()); setOpen(false); }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
