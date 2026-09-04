import {
  cloneElement,
  forwardRef,
  isValidElement,
  useId,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type LabelHTMLAttributes,
  type TextareaHTMLAttributes,
  type ReactElement,
  type ReactNode,
} from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { InfoTooltip } from './InfoTooltip';

interface Invalidatable {
  invalid?: boolean;
}

const fieldBase =
  'flex w-full border bg-white text-sm text-slate-900 shadow-sm transition-all placeholder:text-slate-400 ' +
  'focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60';

const fieldValid = 'border-slate-300 focus:border-emerald-800 focus:ring-emerald-800/10';
const fieldInvalid = 'border-rose-300 bg-rose-50/40 focus:border-rose-500 focus:ring-rose-500/10';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & Invalidatable>(
  ({ className, invalid, ...props }, ref) => (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(fieldBase, 'h-10 rounded-lg px-3.5 py-2', invalid ? fieldInvalid : fieldValid, className)}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & Invalidatable
>(({ className, invalid, ...props }, ref) => (
  <textarea
    ref={ref}
    aria-invalid={invalid || undefined}
    className={cn(fieldBase, 'min-h-[90px] rounded-lg px-3.5 py-2.5', invalid ? fieldInvalid : fieldValid, className)}
    {...props}
  />
));
Textarea.displayName = 'Textarea';

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement> & Invalidatable & { selectClassName?: string }
>(({ className, selectClassName, invalid, children, ...props }, ref) => (
  <div className={cn('relative w-full', className)}>
    <select
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        fieldBase,
        'h-10 w-full appearance-none rounded-lg pl-3.5 pr-9',
        invalid ? fieldInvalid : fieldValid,
        selectClassName,
      )}
      {...props}
    >
      {children}
    </select>
    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
  </div>
));
Select.displayName = 'Select';

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn('mb-1.5 block text-xs font-medium text-slate-700', className)} {...props} />;
}

export function FormField({
  label,
  children,
  error,
  hint,
  tooltip,
  required,
  className,
}: {
  label: string;
  children: ReactNode;
  error?: string | null;
  /** Explicação sempre visível por baixo do campo — usar para algo que o utilizador precisa de saber antes de preencher. */
  hint?: string;
  /** Explicação secundária, só mostrada num tooltip junto ao rótulo — usar para detalhes que não são essenciais à primeira vista. */
  tooltip?: string;
  required?: boolean;
  className?: string;
}) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  const field =
    isValidElement(children) && (error || hint !== undefined)
      ? cloneElement(children as ReactElement<any>, {
          invalid: !!error,
          'aria-describedby': describedBy,
        })
      : children;

  return (
    <div className={className}>
      <Label className="flex items-center gap-1.5">
        {label} {required && <span className="text-emerald-700">*</span>}
        {tooltip && <InfoTooltip text={tooltip} />}
      </Label>
      {field}
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-xs font-medium text-rose-600">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1 text-xs text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
