import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button, type ButtonProps } from './Button';

export interface ActionMenuItem {
  label: string;
  icon: LucideIcon;
  onClick: () => void | Promise<unknown>;
  disabled?: boolean;
  destructive?: boolean;
}

const MENU_WIDTH = 288;

export function ActionMenu({
  label,
  icon: Icon,
  items,
  variant = 'outline',
}: {
  label: string;
  icon: LucideIcon;
  items: ActionMenuItem[];
  variant?: ButtonProps['variant'];
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; openUp: boolean } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const estimatedHeight = items.length * 44 + 16;
    const openUp = rect.bottom + estimatedHeight > window.innerHeight && rect.top > estimatedHeight;
    setCoords({
      top: openUp ? rect.top - 4 : rect.bottom + 4,
      left: Math.min(rect.left, window.innerWidth - MENU_WIDTH - 8),
      openUp,
    });
  };

  useLayoutEffect(() => {
    if (open) updatePosition();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handle = () => updatePosition();
    window.addEventListener('scroll', handle, true);
    window.addEventListener('resize', handle);
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
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

  return (
    <>
      <Button ref={triggerRef} type="button" variant={variant} loading={pending} onClick={() => setOpen((o) => !o)}>
        <Icon className="h-4 w-4" /> {label} <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
      </Button>

      {open &&
        coords &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-50 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg"
            style={{
              top: coords.openUp ? undefined : coords.top,
              bottom: coords.openUp ? window.innerHeight - coords.top : undefined,
              left: coords.left,
              width: MENU_WIDTH,
            }}
          >
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                disabled={item.disabled || pending}
                onClick={() => {
                  setOpen(false);
                  const result = item.onClick();
                  if (result instanceof Promise) {
                    setPending(true);
                    result.catch(() => {}).finally(() => setPending(false));
                  }
                }}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition-colors',
                  item.destructive ? 'text-rose-600 hover:bg-rose-50' : 'text-slate-700 hover:bg-slate-100',
                  item.disabled && 'cursor-not-allowed opacity-50 hover:bg-transparent',
                )}
              >
                <item.icon className="h-4 w-4 shrink-0 text-slate-400" />
                {item.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
