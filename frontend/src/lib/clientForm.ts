import type { UploadedDocument } from '@/api/endpoints';
import { isValidMzDocument, isValidMzPhone } from '@/lib/mz';

export interface RegisterFormState {
  firstName: string;
  lastName: string;
  identifier: string;
  nationality: string;
  placeOfBirthProvince: string;
  placeOfBirthDistrict: string;
  maritalStatus: string;
  documentType: string;
  documentNumber: string;
  issueDate: string;
  expiryDate: string;
  birthDate: string;
  documentImage: UploadedDocument | null;
  phone: string;
  alternativePhone: string;
  province: string;
  district: string;
  neighborhood: string;
  addressLine: string;
  block: string;
  houseNumber: string;
  planId: string;
  paymentFrequency: string;
  durationMonths: number;
}

export const initialClientFormState: RegisterFormState = {
  firstName: '',
  lastName: '',
  identifier: '',
  nationality: 'Moçambicana',
  placeOfBirthProvince: 'Maputo Província',
  placeOfBirthDistrict: '',
  maritalStatus: 'SOLTEIRO',
  documentType: 'BI',
  documentNumber: '',
  issueDate: '',
  expiryDate: '',
  birthDate: '',
  documentImage: null,
  phone: '',
  alternativePhone: '',
  province: 'Maputo Província',
  district: '',
  neighborhood: '',
  addressLine: '',
  block: '',
  houseNumber: '',
  planId: '',
  paymentFrequency: 'MONTHLY',
  durationMonths: 12,
};

export const MAX_ADHESION_AGE = 65;

export function ageFromBirthDate(birthDate: string): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

type FieldErrors = Partial<Record<keyof RegisterFormState, string>>;

/** Validação de campo-a-campo, espelhando as regras aplicadas no backend. */
export function clientFieldErrors(form: RegisterFormState): FieldErrors {
  const errors: FieldErrors = {};

  if (!form.firstName.trim() || form.firstName.trim().length < 2) errors.firstName = 'Indique o nome próprio.';
  if (!form.lastName.trim() || form.lastName.trim().length < 2) errors.lastName = 'Indique o sobrenome.';
  if (!form.nationality) errors.nationality = 'Seleccione a nacionalidade.';
  if (!form.placeOfBirthProvince) errors.placeOfBirthProvince = 'Seleccione a província de naturalidade.';
  if (!form.placeOfBirthDistrict) errors.placeOfBirthDistrict = 'Seleccione o distrito de naturalidade.';

  if (!form.birthDate) {
    errors.birthDate = 'Indique a data de nascimento.';
  } else {
    const age = ageFromBirthDate(form.birthDate);
    if (age === null || age < 0) errors.birthDate = 'Data de nascimento inválida.';
    else if (age > MAX_ADHESION_AGE) errors.birthDate = `O limite de idade para adesão é de ${MAX_ADHESION_AGE} anos.`;
  }

  if (!form.documentNumber.trim()) {
    errors.documentNumber = 'Indique o número do documento.';
  } else if (!isValidMzDocument(form.documentType, form.documentNumber.trim())) {
    errors.documentNumber =
      form.documentType === 'PASSAPORTE' ? 'Número de passaporte inválido.' : 'BI inválido. Ex: 110100123456A.';
  }

  if (form.issueDate && form.expiryDate && form.expiryDate < form.issueDate) {
    errors.expiryDate = 'A validade não pode ser anterior à emissão.';
  }

  if (!form.documentImage) {
    errors.documentImage = 'Anexe uma cópia do documento (BI ou Passaporte).';
  }

  if (!form.phone) {
    errors.phone = 'Indique o número de telemóvel.';
  } else if (!isValidMzPhone(form.phone)) {
    errors.phone = 'Número inválido. Use 9 dígitos começando por 82 a 87.';
  }
  if (form.alternativePhone && !isValidMzPhone(form.alternativePhone)) {
    errors.alternativePhone = 'Número inválido. Use 9 dígitos começando por 82 a 87.';
  }

  if (!form.province) errors.province = 'Seleccione a província.';
  if (!form.district) errors.district = 'Seleccione o distrito.';
  if (!form.neighborhood.trim()) errors.neighborhood = 'Indique o bairro/avenida/rua.';

  if (!form.planId) errors.planId = 'Seleccione um plano de assistência funerária.';

  if (!form.identifier.trim() || form.identifier.trim().length < 3) {
    errors.identifier = 'Indique um identificador de acesso.';
  } else if (!/^[a-zA-Z0-9._-]+$/.test(form.identifier.trim())) {
    errors.identifier = 'Só letras, números, pontos, hífenes e underscores.';
  }

  return errors;
}

export const PERSONAL_STEP_FIELDS: (keyof RegisterFormState)[] = [
  'firstName',
  'lastName',
  'nationality',
  'placeOfBirthProvince',
  'placeOfBirthDistrict',
  'birthDate',
  'documentNumber',
  'expiryDate',
  'documentImage',
];

export const CONTACT_STEP_FIELDS: (keyof RegisterFormState)[] = [
  'phone',
  'alternativePhone',
  'province',
  'district',
  'neighborhood',
];

export const PLAN_STEP_FIELDS: (keyof RegisterFormState)[] = ['planId'];

export const CREDENTIALS_STEP_FIELDS: (keyof RegisterFormState)[] = ['identifier'];

export function buildRegisterPayload(form: RegisterFormState) {
  return {
    firstName: form.firstName.trim(),
    identifier: form.identifier.trim(),
    lastName: form.lastName.trim(),
    nationality: form.nationality,
    placeOfBirth: `${form.placeOfBirthDistrict}, ${form.placeOfBirthProvince}`,
    maritalStatus: form.maritalStatus,
    documentType: form.documentType,
    documentNumber: form.documentNumber.trim(),
    issueDate: form.issueDate || undefined,
    expiryDate: form.expiryDate || undefined,
    birthDate: form.birthDate,
    documentImagePath: form.documentImage?.path,
    documentImageMimeType: form.documentImage?.mimeType,
    phone: form.phone,
    alternativePhone: form.alternativePhone || undefined,
    province: form.province,
    district: form.district,
    neighborhood: form.neighborhood.trim(),
    addressLine: form.addressLine.trim() || undefined,
    block: form.block.trim() || undefined,
    houseNumber: form.houseNumber.trim() || undefined,
    planId: form.planId,
    paymentFrequency: form.paymentFrequency,
    durationMonths: Number(form.durationMonths),
  };
}
