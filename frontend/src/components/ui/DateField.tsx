import { useEffect, useLayoutEffect, useRef, useState, type ButtonHTMLAttributes } from 'react';
import { createPortal } from 'react-dom';
import { DayPicker } from 'react-day-picker';
import { pt } from 'react-day-picker/locale';
import { addMonths, format, isSameMonth, isValid, parse, setYear, startOfMonth } from 'date-fns';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import 'react-day-picker/style.css';

const ISO_FORMAT = 'yyyy-MM-dd';
const DISPLAY_FORMAT = 'dd/MM/yyyy';
const POPOVER_WIDTH = 300;
const YEARS_PER_PAGE = 12;

function parseIso(value?: string) {
  if (!value) return undefined;
  const parsed = parse(value, ISO_FORMAT, new Date());
  return isValid(parsed) ? parsed : undefined;
}

interface DateFieldProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'value' | 'onChange' | 'type' | 'onBlur'> {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  invalid?: boolean;
  onBlur?: () => void;
  placeholder?: string;
}

/** Selector de data com formato dd/mm/aaaa, armazenando o valor como ISO (yyyy-MM-dd). */
export function DateField({ value, onChange, min, max, invalid, disabled, onBlur, className, placeholder, ...props }: DateFieldProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'days' | 'years'>('days');
  const [yearPageStart, setYearPageStart] = useState(0);
  const [coords, setCoords] = useState<{ top: number; left: number; openUp: boolean } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const selected = parseIso(value);
  const minDate = parseIso(min);
  const maxDate = parseIso(max);
  const displayValue = selected ? format(selected, DISPLAY_FORMAT) : '';

  const [displayMonth, setDisplayMonth] = useState(() => selected ?? maxDate ?? new Date());

  const updatePosition = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const estimatedHeight = 360;
    const openUp = rect.bottom + estimatedHeight > window.innerHeight && rect.top > estimatedHeight;
    setCoords({
      top: openUp ? rect.top - 4 : rect.bottom + 4,
      left: Math.min(rect.left, window.innerWidth - POPOVER_WIDTH - 8),
      openUp,
    });
  };

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handle = () => updatePosition();
    window.addEventListener('scroll', handle, true);
    window.addEventListener('resize', handle);
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || popoverRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => {
      window.removeEventListener('scroll', handle, true);
      window.removeEventListener('resize', handle);
      document.removeEventListener('mousedown', handleClick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const openPicker = () => {
    setView('days');
    setDisplayMonth(selected ?? maxDate ?? new Date());
    setYearPageStart(Math.floor((selected ?? maxDate ?? new Date()).getFullYear() / YEARS_PER_PAGE) * YEARS_PER_PAGE);
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    onBlur?.();
  };

  const years = Array.from({ length: YEARS_PER_PAGE }, (_, i) => yearPageStart + i);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => (open ? close() : openPicker())}
        aria-invalid={invalid || undefined}
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-lg border bg-white px-3.5 py-2 text-left text-sm shadow-sm transition-all',
          'focus:outline-none focus:ring-2',
          invalid
            ? 'border-rose-300 bg-rose-50/40 focus:border-rose-500 focus:ring-rose-500/10'
            : 'border-slate-300 focus:border-emerald-800 focus:ring-emerald-800/10',
          disabled && 'cursor-not-allowed bg-slate-50 opacity-60',
          className,
        )}
        {...props}
      >
        <span className={displayValue ? 'text-slate-900' : 'text-slate-400'}>{displayValue || placeholder || 'dd/mm/aaaa'}</span>
        <CalendarDays className="h-4 w-4 shrink-0 text-slate-400" />
      </button>

      {open &&
        coords &&
        createPortal(
          <div
            ref={popoverRef}
            className="rdp-popover fixed z-50 rounded-xl border border-slate-200 bg-white p-3 shadow-lg"
            style={{ top: coords.openUp ? undefined : coords.top, bottom: coords.openUp ? window.innerHeight - coords.top : undefined, left: coords.left, width: POPOVER_WIDTH }}
          >
            {view === 'days' ? (
              <DayPicker
                mode="single"
                locale={pt}
                selected={selected}
                month={displayMonth}
                onMonthChange={setDisplayMonth}
                disabled={(date) => (minDate ? date < minDate : false) || (maxDate ? date > maxDate : false)}
                onSelect={(date) => {
                  if (!date) return;
                  onChange(format(date, ISO_FORMAT));
                  close();
                }}
                components={{
                  Nav: () => <></>,
                  MonthCaption: ({ calendarMonth }) => {
                    const prevMonth = addMonths(calendarMonth.date, -1);
                    const nextMonth = addMonths(calendarMonth.date, 1);
                    const prevDisabled = minDate ? isSameMonth(calendarMonth.date, minDate) || prevMonth < startOfMonth(minDate) : false;
                    const nextDisabled = maxDate ? isSameMonth(calendarMonth.date, maxDate) || nextMonth > startOfMonth(maxDate) : false;
                    return (
                      <div className="flex items-center justify-between px-1 pb-2">
                        <button
                          type="button"
                          disabled={prevDisabled}
                          onClick={() => setDisplayMonth(prevMonth)}
                          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-30"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setYearPageStart(Math.floor(calendarMonth.date.getFullYear() / YEARS_PER_PAGE) * YEARS_PER_PAGE);
                            setView('years');
                          }}
                          className="rounded-md px-2 py-1 text-sm font-semibold capitalize text-slate-900 transition-colors hover:bg-slate-100"
                        >
                          {format(calendarMonth.date, 'MMMM yyyy', { locale: pt })}
                        </button>
                        <button
                          type="button"
                          disabled={nextDisabled}
                          onClick={() => setDisplayMonth(nextMonth)}
                          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-30"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  },
                }}
                classNames={{
                  weekday: 'text-xs font-medium text-slate-400',
                  day_button: 'text-sm text-slate-700 hover:bg-slate-100 rounded-lg transition-colors',
                  today: 'font-semibold text-emerald-800',
                  selected: 'text-white',
                  outside: 'text-slate-300',
                  disabled: 'text-slate-300 pointer-events-none',
                }}
              />
            ) : (
              <div>
                <div className="mb-2 flex items-center justify-between px-1">
                  <button
                    type="button"
                    onClick={() => setYearPageStart((y) => y - YEARS_PER_PAGE)}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-sm font-semibold text-slate-900">
                    {yearPageStart} – {yearPageStart + YEARS_PER_PAGE - 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => setYearPageStart((y) => y + YEARS_PER_PAGE)}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {years.map((year) => {
                    const outOfRange = (minDate && year < minDate.getFullYear()) || (maxDate && year > maxDate.getFullYear());
                    const isCurrent = year === displayMonth.getFullYear();
                    return (
                      <button
                        key={year}
                        type="button"
                        disabled={!!outOfRange}
                        onClick={() => {
                          setDisplayMonth((m) => startOfMonth(setYear(m, year)));
                          setView('days');
                        }}
                        className={cn(
                          'rounded-lg py-2 text-sm transition-colors',
                          outOfRange
                            ? 'cursor-not-allowed text-slate-300'
                            : isCurrent
                              ? 'bg-emerald-900 font-semibold text-white'
                              : 'text-slate-700 hover:bg-slate-100',
                        )}
                      >
                        {year}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
