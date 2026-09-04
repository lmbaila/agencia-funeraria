/** Legendas legíveis para valores de enum vindos da API — evita mostrar "MONTHLY"/"CASADO" na UI. */

export const MARITAL_STATUS_LABELS: Record<string, string> = {
  SOLTEIRO: 'Solteiro(a)',
  CASADO: 'Casado(a)',
  DIVORCIADO: 'Divorciado(a)',
  VIUVO: 'Viúvo(a)',
  UNIAO_DE_FACTO: 'União de Facto',
};

export const PAYMENT_FREQUENCY_LABELS: Record<string, string> = {
  MONTHLY: 'Mensal',
  QUARTERLY: 'Trimestral',
  SEMIANNUAL: 'Semestral',
  ANNUAL: 'Anual',
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  MPESA: 'M-Pesa',
  EMOLA: 'e-Mola',
  CASH: 'Dinheiro',
  POS: 'POS',
  BANK_TRANSFER: 'Transferência BCI',
};
