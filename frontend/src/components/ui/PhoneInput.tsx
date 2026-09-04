import { forwardRef, type InputHTMLAttributes } from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isValidMzPhone, phoneOperatorHint } from '@/lib/mz';

interface PhoneInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
}

/** Campo de telemóvel moçambicano com prefixo fixo +258 e 9 dígitos livres. */
export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ value, onChange, invalid, className, disabled, ...props }, ref) => {
    const digitsOnly = value.replace(/\D/g, '').slice(0, 9);
    const showValidation = digitsOnly.length === 9;
    const valid = showValidation && isValidMzPhone(digitsOnly);
    const operator = phoneOperatorHint(digitsOnly);
    const flagged = invalid || (showValidation && !valid);

    return (
      <div>
        <div
          className={cn(
            'flex h-10 w-full items-center rounded-lg border bg-white shadow-sm transition-all',
            'focus-within:ring-2',
            flagged
              ? 'border-rose-300 bg-rose-50/40 focus-within:border-rose-500 focus-within:ring-rose-500/10'
              : 'border-slate-300 focus-within:border-emerald-800 focus-within:ring-emerald-800/10',
            disabled && 'cursor-not-allowed bg-slate-50 opacity-60',
            className,
          )}
        >
          <span className="flex h-full select-none items-center gap-1.5 border-r border-slate-200 pl-3.5 pr-2.5 text-sm font-medium text-slate-500">
            <span aria-hidden>🇲🇿</span>+258
          </span>
          <input
            ref={ref}
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            aria-invalid={flagged || undefined}
            value={digitsOnly}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 9))}
            className="h-full min-w-0 flex-1 rounded-r-lg bg-transparent px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:cursor-not-allowed"
            {...props}
          />
          {showValidation && (
            <span className="pr-3">
              {valid ? <Check className="h-4 w-4 text-emerald-600" /> : <X className="h-4 w-4 text-rose-500" />}
            </span>
          )}
        </div>
        {operator && !flagged && <p className="mt-1 text-xs text-slate-500">{operator}</p>}
      </div>
    );
  },
);
PhoneInput.displayName = 'PhoneInput';
