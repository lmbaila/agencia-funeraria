import { api } from './client';
import type {
  Agent,
  Claim,
  Client,
  Contract,
  CreateClaimInput,
  DashboardKpis,
  DelinquencyRow,
  Dependent,
  DependentInput,
  LoginResponse,
  Notification,
  PublicClaimLookupResult,
  Payment,
  Permission,
  Plan,
} from '@/types';

// ---------- Auth ----------
export const AuthApi = {
  login: (identifier: string, password: string) =>
    api.post<LoginResponse>('/auth/login', { identifier, password }).then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/auth/change-password', { currentPassword, newPassword }).then((r) => r.data),
  verifyPassword: (password: string) =>
    api.post<{ valid: boolean }>('/auth/verify-password', { password }).then((r) => r.data),
};

// ---------- Users (administradores e agentes) — apenas ADMIN ----------
export interface UpdateStaffPayload {
  firstName?: string;
  lastName?: string;
  identifier?: string;
  permissions?: Permission[];
  active?: boolean;
}

export const UsersApi = {
  listStaff: () => api.get<Agent[]>('/users/staff').then((r) => r.data),
  createAgent: (payload: { firstName: string; lastName: string; identifier: string; permissions: Permission[] }) =>
    api.post<{ user: Agent; temporaryPassword: string }>('/users/agents', payload).then((r) => r.data),
  createAdmin: (payload: { firstName: string; lastName: string; identifier: string }) =>
    api.post<{ user: Agent; temporaryPassword: string }>('/users/admins', payload).then((r) => r.data),
  updateStaff: (id: string, payload: UpdateStaffPayload) =>
    api.patch<Agent>(`/users/staff/${id}`, payload).then((r) => r.data),
  resetPassword: (id: string) =>
    api.post<{ temporaryPassword: string }>(`/users/staff/${id}/reset-password`).then((r) => r.data),
  checkIdentifierAvailable: (identifier: string, excludeId?: string) =>
    api
      .get<{ valid: boolean; available: boolean }>('/users/identifier-available', { params: { identifier, excludeId } })
      .then((r) => r.data),
};

// ---------- Plans ----------
export interface PlanInput {
  name: string;
  displayName: string;
  description?: string;
  urnDescription?: string;
  coverageMin: number;
  coverageMax?: number | null;
  monthlyFee: number;
  quarterlyFee: number;
  semiannualFee: number;
  annualFee: number;
  sortOrder?: number;
  active?: boolean;
}

export const PlansApi = {
  list: () => api.get<Plan[]>('/plans').then((r) => r.data),
  listAll: () => api.get<Plan[]>('/plans', { params: { includeInactive: 'true' } }).then((r) => r.data),
  create: (payload: PlanInput) => api.post<Plan>('/plans', payload).then((r) => r.data),
  update: (id: string, payload: PlanInput) => api.patch<Plan>(`/plans/${id}`, payload).then((r) => r.data),
  setActive: (id: string, active: boolean) => api.patch<Plan>(`/plans/${id}`, { active }).then((r) => r.data),
};

// ---------- Endereços (Moçambique) ----------
export interface AddressSuggestion {
  label: string;
  road?: string;
  neighborhood?: string;
  district?: string;
  province?: string;
}

export const AddressLookupApi = {
  search: (q: string) =>
    api.get<AddressSuggestion[]>('/address-lookup/search', { params: { q } }).then((r) => r.data),
};

// ---------- Uploads ----------
export interface UploadedDocument {
  path: string;
  mimeType: string;
  originalName: string;
  size: number;
}

export const UploadsApi = {
  uploadClientDocument: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api
      .post<UploadedDocument>('/uploads/client-document', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },
  uploadClaimDocument: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api
      .post<UploadedDocument>('/uploads/claim-document', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },
};

// ---------- Registo público ----------
export interface RegisterPayload {
  firstName: string;
  lastName: string;
  identifier: string;
  nationality: string;
  placeOfBirth: string;
  maritalStatus?: string;
  documentType?: string;
  documentNumber: string;
  issueDate?: string;
  expiryDate?: string;
  birthDate: string;
  documentImagePath?: string;
  documentImageMimeType?: string;
  phone: string;
  alternativePhone?: string;
  province: string;
  district: string;
  neighborhood: string;
  addressLine?: string;
  block?: string;
  houseNumber?: string;
  planId: string;
  paymentFrequency: string;
  durationMonths: number;
  dependents?: DependentInput[];
}

export interface RegisterResponse {
  credentials: { identifier: string; temporaryPassword: string };
  client: Client;
  contract: Contract;
  membershipFeeAmount: string | number;
}

export interface AvailabilityCheck {
  documentNumberTaken: boolean;
  phoneTaken: boolean;
}

export const PublicApi = {
  register: (payload: RegisterPayload) =>
    api.post<RegisterResponse>('/public/register', payload).then((r) => r.data),
  checkAvailability: (params: { documentNumber?: string; phone?: string }) =>
    api.get<AvailabilityCheck>('/public/check-availability', { params }).then((r) => r.data),
  checkIdentifierAvailable: (identifier: string) =>
    api
      .get<{ valid: boolean; available: boolean }>('/public/check-identifier', { params: { identifier } })
      .then((r) => r.data),
};

// ---------- Clients (admin) ----------
export const ClientsApi = {
  list: (search?: string, status?: string) =>
    api.get<Client[]>('/clients', { params: { search, status } }).then((r) => r.data),
  get: (id: string) => api.get<Client>(`/clients/${id}`).then((r) => r.data),
  create: (payload: RegisterPayload) =>
    api.post<RegisterResponse>('/clients', payload).then((r) => r.data),
  addDependent: (id: string, dto: DependentInput) =>
    api.post(`/clients/${id}/dependents`, dto).then((r) => r.data),
  updateDependent: (id: string, dependentId: string, dto: DependentInput) =>
    api.patch(`/clients/${id}/dependents/${dependentId}`, dto).then((r) => r.data),
  removeDependent: (id: string, dependentId: string) =>
    api.patch(`/clients/${id}/dependents/${dependentId}/remove`).then((r) => r.data),
  resetPassword: (id: string) =>
    api.post<{ temporaryPassword: string }>(`/clients/${id}/reset-password`).then((r) => r.data),
};

// ---------- Contracts ----------
export const ContractsApi = {
  list: (status?: string, search?: string) =>
    api.get<Contract[]>('/contracts', { params: { status, search } }).then((r) => r.data),
  get: (id: string) => api.get<Contract>(`/contracts/${id}`).then((r) => r.data),
  confirmMembershipFee: (id: string) =>
    api.post(`/contracts/${id}/membership-fee/confirm`).then((r) => r.data),
  extend: (id: string, additionalMonths: number) =>
    api
      .patch<{ contract: Contract; addendumId: string }>(`/contracts/${id}/extend`, { additionalMonths })
      .then((r) => r.data),
  reactivate: (id: string) => api.post<Contract>(`/contracts/${id}/reactivate`).then((r) => r.data),
  terminate: (id: string, reason: string) =>
    api.patch<Contract>(`/contracts/${id}/terminate`, { reason }).then((r) => r.data),
};

// ---------- Sinistros ----------
export const ClaimsApi = {
  listForContract: (contractId: string) => api.get<Claim[]>(`/contracts/${contractId}/claims`).then((r) => r.data),
  create: (contractId: string, dto: CreateClaimInput) =>
    api.post<Claim>(`/contracts/${contractId}/claims`, dto).then((r) => r.data),
  confirm: (claimId: string, dto?: { deathCertificatePath?: string; deathCertificateMimeType?: string }) =>
    api.patch<Claim>(`/claims/${claimId}/confirm`, dto).then((r) => r.data),
  reject: (claimId: string, reason: string) => api.patch<Claim>(`/claims/${claimId}/reject`, { reason }).then((r) => r.data),
};

// ---------- Comunicação de Óbito (página pública) ----------
export interface PublicClaimLookupInput {
  documentNumber: string;
  phoneLast4: string;
  name: string;
}

export interface PublicClaimRequestInput {
  documentNumber: string;
  phoneLast4: string;
  name: string;
  selections: { beneficiaryType: 'CLIENT' | 'DEPENDENT'; dependentId?: string }[];
  dateOfDeath: string;
  notes?: string;
  deathCertificatePath?: string;
  deathCertificateMimeType?: string;
  requesterName: string;
  requesterPhone: string;
  requesterRelationship: string;
}

export const PublicClaimsApi = {
  lookup: (dto: PublicClaimLookupInput) =>
    api.post<PublicClaimLookupResult>('/public/claims/lookup', dto).then((r) => r.data),
  request: (dto: PublicClaimRequestInput) =>
    api.post<{ requestBatchId: string; claims: Claim[] }>('/public/claims/request', dto).then((r) => r.data),
  comprovativoUrl: (requestBatchId: string) => `${api.defaults.baseURL}/public/claims/comprovativo/${requestBatchId}`,
};

// ---------- Lembretes de Cobrança ----------
export const NotificationsApi = {
  remind: (installmentId: string) => api.post(`/installments/${installmentId}/remind`).then((r) => r.data),
  listForContract: (contractId: string) =>
    api.get<Notification[]>(`/contracts/${contractId}/notifications`).then((r) => r.data),
};

// ---------- Payments ----------
export const PaymentsApi = {
  listAll: (month?: string, status?: string) =>
    api.get<Payment[]>('/payments', { params: { month, status } }).then((r) => r.data),
  listForContract: (contractId: string) =>
    api.get<Payment[]>(`/payments/contract/${contractId}`).then((r) => r.data),
  status: (paymentId: string) => api.get<Payment>(`/payments/${paymentId}/status`).then((r) => r.data),
  initiateMobileMoney: (contractId: string, method: 'MPESA' | 'EMOLA', phone: string, installmentId?: string) =>
    api
      .post('/payments/mobile-money', { contractId, method, phone, installmentId })
      .then((r) => r.data as { paymentId: string; status: string; message: string }),
  initiateMobileMoneyStaff: (contractId: string, method: 'MPESA' | 'EMOLA', phone: string, installmentId?: string) =>
    api
      .post('/payments/mobile-money/staff', { contractId, method, phone, installmentId })
      .then((r) => r.data as { paymentId: string; status: string; message: string }),
  registerManual: (payload: {
    contractId: string;
    installmentId?: string;
    method: string;
    amount?: number;
    notes?: string;
  }) => api.post('/payments/manual', payload).then((r) => r.data),
};

// ---------- Links de Pagamento ----------
export interface PaymentLinkInfo {
  clientName: string;
  clientPhone: string;
  contractNumber: string;
  planName: string;
  type: 'MEMBERSHIP_FEE' | 'INSTALLMENT';
  amount: string | number;
  monthReference: string | null;
  expiresAt: string;
}

export const PaymentLinksApi = {
  create: (contractId: string, installmentId?: string) =>
    api
      .post<{ token: string; url: string; expiresAt: string }>('/payment-links', { contractId, installmentId })
      .then((r) => r.data),
  // Endpoints públicos (sem autenticação) usados pela página de pagamento por link
  getInfo: (token: string) => api.get<PaymentLinkInfo>(`/public/payment-links/${token}`).then((r) => r.data),
  pay: (token: string, method: 'MPESA' | 'EMOLA', phone: string) =>
    api
      .post(`/public/payment-links/${token}/pay`, { method, phone })
      .then((r) => r.data as { paymentId: string; status: string; message: string }),
  status: (token: string) =>
    api.get(`/public/payment-links/${token}/status`).then((r) => r.data as { status: string; notes?: string }),
};

// ---------- Portal (cliente) ----------
export const PortalApi = {
  overview: () => api.get<Client>('/portal/overview').then((r) => r.data),
  dependents: () => api.get<Dependent[]>('/portal/dependents').then((r) => r.data),
  addDependent: (dto: DependentInput) => api.post('/portal/dependents', dto).then((r) => r.data),
  updateDependent: (id: string, dto: DependentInput) => api.patch(`/portal/dependents/${id}`, dto).then((r) => r.data),
  removeDependent: (id: string) => api.patch(`/portal/dependents/${id}/remove`).then((r) => r.data),
  payments: (contractId: string) => api.get<Payment[]>(`/portal/payments/${contractId}`).then((r) => r.data),
};

// ---------- Configurações ----------
export interface SystemSettings {
  lateFeeMonthlyRatePercent: number;
  suspensionThresholdInstallments: number;
  suspensionRegularizationDays: number;
  gracePeriodMonths: number;
  postDeathClaimWindowMonths: number;
  updatedAt: string;
  updatedById?: string | null;
}

export interface UpdateSystemSettings {
  lateFeeMonthlyRatePercent?: number;
  suspensionThresholdInstallments?: number;
  suspensionRegularizationDays?: number;
  gracePeriodMonths?: number;
  postDeathClaimWindowMonths?: number;
}

export const SettingsApi = {
  get: () => api.get<SystemSettings>('/settings').then((r) => r.data),
  update: (dto: UpdateSystemSettings) => api.patch<SystemSettings>('/settings', dto).then((r) => r.data),
};

// ---------- Dashboard ----------
export const DashboardApi = {
  kpis: () => api.get<DashboardKpis>('/dashboard/kpis').then((r) => r.data),
  delinquency: (month: number, year: number) =>
    api.get<DelinquencyRow[]>('/dashboard/delinquency', { params: { month, year } }).then((r) => r.data),
  revenueSeries: (year: number) =>
    api.get<{ month: number; total: number }[]>('/dashboard/revenue-series', { params: { year } }).then((r) => r.data),
  runDelinquencyCheck: () => api.post('/dashboard/run-delinquency-check').then((r) => r.data),
};

// ---------- Documents ----------
async function openBlob(path: string, fallbackType: string) {
  const response = await api.get(path, { responseType: 'blob' });
  const type = (response.headers['content-type'] as string | undefined) || fallbackType;
  const blobUrl = URL.createObjectURL(new Blob([response.data], { type }));
  window.open(blobUrl, '_blank');
}

export const DocumentsApi = {
  openContractPdf: (contractId: string) => openBlob(`/documents/contract/${contractId}`, 'application/pdf'),
  openExtensionAddendumPdf: (addendumId: string) => openBlob(`/documents/extension/${addendumId}`, 'application/pdf'),
  openAdhesionPdf: (contractId: string) => openBlob(`/documents/adhesion/${contractId}`, 'application/pdf'),
  openClaimPdf: (claimId: string) => openBlob(`/documents/claim/${claimId}`, 'application/pdf'),
  openReceiptPdf: (paymentId: string) => openBlob(`/documents/receipt/${paymentId}`, 'application/pdf'),
  openClientDocumentImage: (clientId: string) => openBlob(`/clients/${clientId}/document-image`, 'image/jpeg'),
  openClaimDeathCertificate: (claimId: string) => openBlob(`/claims/${claimId}/death-certificate`, 'image/jpeg'),
};
