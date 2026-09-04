import { PROVINCES, PROVINCE_DISTRICTS } from './mz';

const DIACRITICS_REGEX = new RegExp('[\\u0300-\\u036f]', 'g');

function normalize(s: string): string {
  return s.normalize('NFD').replace(DIACRITICS_REGEX, '').toLowerCase().trim();
}

/**
 * Correspondência exacta (tolerante a acentos/maiúsculas) contra a nossa lista fixa de províncias.
 * Não usa correspondência parcial: "Maputo" sozinho é ambíguo entre "Maputo Cidade" e
 * "Maputo Província", pelo que nesse caso não escolhemos nenhuma — é mais seguro deixar em branco.
 */
export function matchProvince(name?: string): (typeof PROVINCES)[number] | undefined {
  if (!name) return undefined;
  const n = normalize(name);
  return PROVINCES.find((p) => normalize(p) === n);
}

/** Correspondência exacta do distrito dentro da lista da província já identificada. */
export function matchDistrict(province: string | undefined, name?: string): string | undefined {
  if (!province || !name) return undefined;
  const districts = PROVINCE_DISTRICTS[province as keyof typeof PROVINCE_DISTRICTS];
  if (!districts) return undefined;
  const n = normalize(name);
  return districts.find((d) => normalize(d) === n);
}

/**
 * Quando a província não é directamente identificável (ex: API devolve apenas "Maputo"),
 * tenta inferi-la a partir do distrito — só se o nome do distrito for único entre todas as províncias.
 */
export function inferProvinceFromDistrict(districtName?: string): (typeof PROVINCES)[number] | undefined {
  if (!districtName) return undefined;
  const n = normalize(districtName);
  const matches = PROVINCES.filter((p) => PROVINCE_DISTRICTS[p].some((d) => normalize(d) === n));
  return matches.length === 1 ? matches[0] : undefined;
}
