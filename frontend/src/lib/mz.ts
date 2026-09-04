/**
 * Constantes e validações moçambicanas partilhadas pelos formulários públicos e administrativos.
 * Espelham as regras aplicadas no backend (backend/src/common/utils/mz-validators.ts).
 */

export const PROVINCES = [
  'Maputo Cidade',
  'Maputo Província',
  'Gaza',
  'Inhambane',
  'Sofala',
  'Manica',
  'Tete',
  'Zambézia',
  'Nampula',
  'Cabo Delgado',
  'Niassa',
] as const;

/**
 * Distritos por província. Lista de referência geral — poderá conter pequenas
 * divergências face a actualizações administrativas recentes (fonte: INE Moçambique).
 */
export const PROVINCE_DISTRICTS: Record<(typeof PROVINCES)[number], string[]> = {
  'Maputo Cidade': ['KaMpfumo', 'Nlhamankulu', 'KaMaxaquene', 'KaMavota', 'KaMubukwana', 'KaTembe', 'KaNyaka'],
  'Maputo Província': ['Boane', 'Magude', 'Manhiça', 'Marracuene', 'Matola', 'Matutuíne', 'Moamba', 'Namaacha'],
  Gaza: [
    'Bilene',
    'Chibuto',
    'Chicualacuala',
    'Chigubo',
    'Chókwè',
    'Chonguene',
    'Guijá',
    'Mabalane',
    'Mandlakazi',
    'Massangena',
    'Massingir',
    'Xai-Xai',
  ],
  Inhambane: [
    'Funhalouro',
    'Govuro',
    'Homoíne',
    'Inhambane',
    'Inharrime',
    'Inhassoro',
    'Jangamo',
    'Mabote',
    'Massinga',
    'Maxixe',
    'Morrumbene',
    'Panda',
    'Vilankulo',
    'Zavala',
  ],
  Sofala: ['Beira', 'Búzi', 'Caia', 'Chemba', 'Cheringoma', 'Chibabava', 'Dondo', 'Gorongosa', 'Machanga', 'Marromeu', 'Muanza', 'Nhamatanda'],
  Manica: ['Bárue', 'Chimoio', 'Gondola', 'Guro', 'Machaze', 'Macossa', 'Manica', 'Mossurize', 'Sussundenga', 'Tambara', 'Vanduzi'],
  Tete: [
    'Angónia',
    'Cahora Bassa',
    'Changara',
    'Chifunde',
    'Chiuta',
    'Doa',
    'Macanga',
    'Magoè',
    'Marara',
    'Marávia',
    'Moatize',
    'Mutarara',
    'Tete',
    'Tsangano',
    'Zumbo',
  ],
  Zambézia: [
    'Alto Molócuè',
    'Chinde',
    'Derre',
    'Gilé',
    'Gurué',
    'Ile',
    'Inhassunge',
    'Luabo',
    'Lugela',
    'Maganja da Costa',
    'Milange',
    'Mocuba',
    'Mocubela',
    'Mopeia',
    'Morrumbala',
    'Namacurra',
    'Namarroi',
    'Nicoadala',
    'Pebane',
    'Quelimane',
  ],
  Nampula: [
    'Angoche',
    'Eráti',
    'Ilha de Moçambique',
    'Lalaua',
    'Larde',
    'Liúpo',
    'Malema',
    'Meconta',
    'Mecubúri',
    'Memba',
    'Mogincual',
    'Mogovolas',
    'Moma',
    'Monapo',
    'Mossuril',
    'Muecate',
    'Murrupula',
    'Nacala-a-Velha',
    'Nacala Porto',
    'Nampula',
    'Rapale',
    'Ribáuè',
  ],
  'Cabo Delgado': [
    'Ancuabe',
    'Balama',
    'Chiúre',
    'Ibo',
    'Macomia',
    'Mecúfi',
    'Meluco',
    'Metuge',
    'Mocímboa da Praia',
    'Montepuez',
    'Mueda',
    'Muidumbe',
    'Namuno',
    'Nangade',
    'Palma',
    'Pemba',
    'Quissanga',
  ],
  Niassa: [
    'Cuamba',
    'Lago',
    'Lichinga',
    'Majune',
    'Mandimba',
    'Marrupa',
    'Maúa',
    'Mavago',
    'Mecanhelas',
    'Mecula',
    'Metarica',
    'Muembe',
    "N'gauma",
    'Nipepe',
    'Sanga',
  ],
};

export const NATIONALITIES = ['Moçambicana', 'Estrangeiro(a)'] as const;

/** 9 dígitos sem o +258, começando pelo prefixo da operadora. */
export const MZ_PHONE_REGEX = /^(82|83|84|85|86|87)\d{7}$/;
export const MZ_BI_REGEX = /^\d{12}[A-Za-z]$/;
export const MZ_PASSPORT_REGEX = /^[A-Za-z]{1,2}\d{6,7}$|^[A-Za-z0-9]{6,9}$/;

export const MZ_PHONE_MESSAGE = 'Número inválido. Use 9 dígitos começando por 82, 83, 84, 85, 86 ou 87.';
export const MZ_BI_MESSAGE = 'BI inválido. Formato esperado: 12 dígitos seguidos de 1 letra (ex: 110100123456A).';
export const MZ_PASSPORT_MESSAGE = 'Número de passaporte inválido.';

export function isValidMzPhone(value: string): boolean {
  return MZ_PHONE_REGEX.test(value);
}

export function isValidMzDocument(documentType: string, value: string): boolean {
  return documentType === 'PASSAPORTE' ? MZ_PASSPORT_REGEX.test(value) : MZ_BI_REGEX.test(value);
}

const OPERATORS: Record<string, string> = {
  '82': 'Tmcel',
  '83': 'Tmcel',
  '84': 'Vodacom · M-Pesa',
  '85': 'Vodacom · M-Pesa',
  '86': 'Movitel · e-Mola',
  '87': 'Movitel · e-Mola',
};

export function phoneOperatorHint(value: string): string | null {
  const prefix = value.slice(0, 2);
  return OPERATORS[prefix] ?? null;
}

export function documentNumberHint(documentType: string): string {
  return documentType === 'PASSAPORTE' ? 'Ex: AB1234567' : 'Ex: 110100123456A (12 dígitos + 1 letra)';
}
