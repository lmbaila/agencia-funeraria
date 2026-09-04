export function calculateAge(birthDate: Date, referenceDate: Date = new Date()): number {
  let age = referenceDate.getFullYear() - birthDate.getFullYear();
  const monthDiff = referenceDate.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && referenceDate.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

/** Trunca para a meia-noite UTC do mesmo dia — consistente com `IsDateString` (ex: "2026-09-04"),
 * que o JS interpreta sempre como meia-noite UTC, independentemente do fuso do servidor. */
export function startOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

export function monthReferenceOf(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function frequencyToMonths(frequency: 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUAL' | 'ANNUAL'): number {
  switch (frequency) {
    case 'MONTHLY':
      return 1;
    case 'QUARTERLY':
      return 3;
    case 'SEMIANNUAL':
      return 6;
    case 'ANNUAL':
      return 12;
  }
}
