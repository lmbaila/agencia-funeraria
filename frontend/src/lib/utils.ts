import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMoney(value: number | string): string {
  const n = typeof value === 'string' ? Number(value) : value;
  return `${n.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MT`;
}

export function formatDate(value?: string | Date | null): string {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateTime(value?: string | Date | null): string {
  if (!value) return '-';
  return new Date(value).toLocaleString('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Normaliza para "Título de Caso" (cada palavra com maiúscula inicial). Corrige texto com
 * capitalização inconsistente vindo de sugestões/autocorrecção do teclado do telemóvel.
 */
export function toTitleCase(value: string): string {
  return value.replace(/\p{L}+/gu, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

/** Referência do mês corrente no formato "YYYY-MM", igual ao usado nas mensalidades (monthReference). */
export function currentMonthReference(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
