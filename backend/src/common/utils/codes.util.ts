import { randomInt } from 'crypto';

/**
 * Gera o identificador público do cliente no formato AF-<ano>-<sequencial>.
 * O sequencial é derivado da contagem actual de clientes + 1, com padding a 4 dígitos.
 */
export function buildClientCode(year: number, sequence: number): string {
  return `AF-${year}-${String(sequence).padStart(4, '0')}`;
}

/**
 * Gera o número de contrato/apólice no formato CT-<ano><mes>-<sequencial>.
 */
export function buildContractNumber(date: Date, sequence: number): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `CT-${y}${m}-${String(sequence).padStart(5, '0')}`;
}

const PASSWORD_CHARS =
  'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

/**
 * Gera uma password temporária segura e de fácil leitura (evita caracteres ambíguos).
 */
export function generateTemporaryPassword(length = 10): string {
  let out = '';
  for (let i = 0; i < length; i++) {
    out += PASSWORD_CHARS[randomInt(0, PASSWORD_CHARS.length)];
  }
  return out;
}

export function generatePaymentReference(prefix: string): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rnd = randomInt(1000, 9999);
  return `${prefix}-${ts}-${rnd}`;
}
