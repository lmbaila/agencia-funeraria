import { useId, useState } from 'react';
import { Info } from 'lucide-react';

/** Ícone "i" acessível junto a um rótulo — mostra uma explicação num tooltip ao focar/passar o rato. */
export function InfoTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-describedby={id}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="flex h-4 w-4 items-center justify-center rounded-full text-slate-400 transition-colors hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-800/30"
      >
        <Info className="h-3.5 w-3.5" />
        <span className="sr-only">Mais informação</span>
      </button>
      <span
        id={id}
        role="tooltip"
        className={`absolute left-1/2 top-full z-20 mt-1.5 w-56 -translate-x-1/2 rounded-lg border border-slate-200 bg-white p-2.5 text-xs leading-relaxed text-slate-600 shadow-lg transition-opacity ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        {text}
      </span>
    </span>
  );
}
