import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, MapPin } from 'lucide-react';
import { AddressLookupApi, type AddressSuggestion } from '@/api/endpoints';
import { cn, toTitleCase } from '@/lib/utils';
import { Input } from './Input';

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (suggestion: AddressSuggestion) => void;
  onBlur?: () => void;
  placeholder?: string;
  invalid?: boolean;
  className?: string;
}

/**
 * Campo de endereço com sugestões em tempo real, restritas a Moçambique (via Nominatim/OSM).
 * A lista de sugestões é montada num portal com posicionamento fixo (mesmo padrão do DateField
 * e do ActionMenu) para nunca ficar tapada por campos vizinhos dentro de layouts em grelha.
 */
export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  onBlur,
  placeholder,
  invalid,
  className,
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; openUp: boolean } | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const requestIdRef = useRef(0);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    const query = value.trim();
    if (query.length < 3) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const requestId = ++requestIdRef.current;
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await AddressLookupApi.search(query);
        if (requestIdRef.current !== requestId) return;
        setSuggestions(results);
        setOpen(results.length > 0);
      } catch {
        if (requestIdRef.current === requestId) setSuggestions([]);
      } finally {
        if (requestIdRef.current === requestId) setLoading(false);
      }
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [value]);

  const updatePosition = () => {
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (!rect) return;
    const estimatedHeight = 260;
    const openUp = rect.bottom + estimatedHeight > window.innerHeight && rect.top > estimatedHeight;
    setCoords({
      top: openUp ? rect.top - 4 : rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      openUp,
    });
  };

  useLayoutEffect(() => {
    if (open) updatePosition();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, suggestions]);

  useEffect(() => {
    if (!open) return;
    const handle = () => updatePosition();
    window.addEventListener('scroll', handle, true);
    window.addEventListener('resize', handle);
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (wrapperRef.current?.contains(target) || popoverRef.current?.contains(target)) return;
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
    <div ref={wrapperRef} className={cn('relative', className)}>
      <Input
        value={value}
        placeholder={placeholder}
        invalid={invalid}
        autoComplete="off"
        autoCapitalize="words"
        spellCheck={false}
        onChange={(e) => onChange(toTitleCase(e.target.value))}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onBlur={onBlur}
      />
      {loading && (
        <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
      )}
      {open &&
        coords &&
        suggestions.length > 0 &&
        createPortal(
          <div
            ref={popoverRef}
            className="fixed z-50 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg"
            style={{
              top: coords.openUp ? undefined : coords.top,
              bottom: coords.openUp ? window.innerHeight - coords.top : undefined,
              left: coords.left,
              width: coords.width,
            }}
          >
            {suggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(s.neighborhood || s.road || s.district || s.label);
                  onSelect?.(s);
                  setOpen(false);
                }}
                className="flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
              >
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span className="leading-snug">{s.label}</span>
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
