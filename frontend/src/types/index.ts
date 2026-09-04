export type Role = 'ADMIN' | 'AGENT' | 'CLIENT';
export type ClientStatus = 'GRACE_PERIOD' | 'ACTIVE' | 'SUSPENDED' | 'TERMINATED' | 'DECEASED';
export type ContractStatus = 'ACTIVE' | 'SUSPENDED' | 'TERMINATED' | 'CANCELLED' | 'FULFILLED';
export type ClaimBeneficiaryType = 'CLIENT' | 'DEPENDENT';
export type ClaimStatus = 'REQUESTED' | 'REGISTERED' | 'REJECTED' | 'CANCELLED';
export type ClaimSource = 'STAFF' | 'PUBLIC_REQUEST';
export type PaymentFrequency = 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUAL' | 'ANNUAL';
export type PaymentMethod = 'MPESA' | 'EMOLA' | 'CASH' | 'POS' | 'BANK_TRANSFER';
export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
export type InstallmentStatus = 'PENDING' | 'PAID' | 'LATE' | 'WAIVED';
export type DocumentType = 'BI' | 'PASSAPORTE';
export type MaritalStatus = 'SOLTEIRO' | 'CASADO' | 'DIVORCIADO' | 'VIUVO' | 'UNIAO_DE_FACTO';

export interface Plan {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  urnDescription?: string;
  coverageMin: string | number;
  coverageMax?: string | number | null;
  monthlyFee: string | number;
  quarterlyFee: string | number;
  semiannualFee: string | number;
  annualFee: string | number;
  active: boolean;
  sortOrder: number;
}

export interface Dependent {
  id: string;
  fullName: string;
  relationship: string;
  documentType?: DocumentType;
  documentNumber?: string;
  birthDate?: string;
  active: boolean;
  createdAt: string;
}

/** Payload de criação/edição — o nome chega separado (nome/apelido) e é combinado no servidor. */
export interface DependentInput {
  firstName: string;
  lastName: string;
  relationship: string;
  documentType?: DocumentType;
  documentNumber?: string;
  birthDate?: string;
}

export interface Installment {
  id: string;
  sequence: number;
  dueDate: string;
  monthReference: string;
  amount: string | number;
  lateFee: string | number;
  status: InstallmentStatus;
  paidAt?: string | null;
}

export interface Payment {
  id: string;
  contractId: string;
  type: 'MEMBERSHIP_FEE' | 'INSTALLMENT';
  amount: string | number;
  method: PaymentMethod;
  status: PaymentStatus;
  reference?: string;
  phoneUsed?: string;
  monthReference?: string;
  notes?: string;
  paidAt?: string | null;
  createdAt: string;
  contract?: { client?: Client };
}

export interface Contract {
  id: string;
  contractNumber: string;
  clientId: string;
  planId: string;
  plan: Plan;
  paymentFrequency: PaymentFrequency;
  installmentAmount: string | number;
  durationMonths: number;
  startDate: string;
  membershipFeeAmount: string | number;
  membershipFeePaid: boolean;
  membershipFeePaidAt?: string | null;
  gracePeriodEnd?: string | null;
  status: ContractStatus;
  installments?: Installment[];
  payments?: Payment[];
  addendums?: Addendum[];
  client?: Client;
}

export interface Claim {
  id: string;
  contractId: string;
  beneficiaryType: ClaimBeneficiaryType;
  dependentId?: string | null;
  dependent?: Dependent | null;
  deceasedName: string;
  dateOfDeath: string;
  notes?: string | null;
  deathCertificatePath?: string | null;
  deathCertificateMimeType?: string | null;
  status: ClaimStatus;
  source: ClaimSource;
  requestBatchId?: string | null;
  requesterName?: string | null;
  requesterPhone?: string | null;
  requesterRelationship?: string | null;
  registeredById?: string | null;
  confirmedAt?: string | null;
  rejectedAt?: string | null;
  rejectedById?: string | null;
  rejectionReason?: string | null;
  cancelledAt?: string | null;
  cancelledById?: string | null;
  cancelReason?: string | null;
  createdAt: string;
}

export interface CreateClaimInput {
  beneficiaryType: ClaimBeneficiaryType;
  dependentId?: string;
  dateOfDeath: string;
  notes?: string;
  deathCertificatePath?: string;
  deathCertificateMimeType?: string;
}

export interface InsuredPerson {
  type: ClaimBeneficiaryType;
  id: string;
  name: string;
  relationship: string;
  hasPendingRequest: boolean;
}

export interface PublicClaimLookupResult {
  contractNumber: string;
  clientName: string;
  insuredPersons: InsuredPerson[];
}

export interface Notification {
  id: string;
  contractId: string;
  installmentId?: string | null;
  channel: 'SMS' | 'WHATSAPP';
  phone: string;
  message: string;
  triggeredById?: string | null;
  createdAt: string;
}

export interface Addendum {
  id: string;
  type: string;
  description: string;
  createdBy?: string;
  createdAt: string;
}

export interface Client {
  id: string;
  clientCode: string;
  firstName?: string;
  lastName?: string;
  fullName: string;
  nationality: string;
  placeOfBirth: string;
  maritalStatus?: MaritalStatus;
  documentType: DocumentType;
  documentNumber: string;
  issueDate?: string;
  expiryDate?: string;
  birthDate?: string;
  documentImagePath?: string | null;
  documentImageMimeType?: string | null;
  phone: string;
  alternativePhone?: string;
  province: string;
  district: string;
  neighborhood: string;
  addressLine?: string;
  block?: string;
  houseNumber?: string;
  status: ClientStatus;
  createdAt: string;
  dependents?: Dependent[];
  contracts?: Contract[];
  user?: { identifier: string; lastLoginAt?: string; active: boolean };
}

export type Permission =
  | 'VIEW_DASHBOARD'
  | 'MANAGE_CLIENTS'
  | 'MANAGE_DELINQUENCY'
  | 'MANAGE_PAYMENTS'
  | 'MANAGE_CLAIMS'
  | 'DELETE_DEPENDENTS'
  | 'EXTEND_CONTRACTS'
  | 'TERMINATE_CONTRACTS';

export interface AuthUser {
  id: string;
  identifier: string;
  role: Role;
  permissions?: Permission[];
  client?: { id: string; fullName: string; status: ClientStatus; activeContract: string | null } | null;
}

export interface Agent {
  id: string;
  identifier: string;
  firstName: string | null;
  lastName: string | null;
  role: Role;
  permissions: Permission[];
  active: boolean;
  mustChangePassword: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
}

export interface LoginResponse {
  accessToken: string;
  mustChangePassword: boolean;
  user: AuthUser;
}

export interface DashboardKpis {
  totalClients: number;
  activeClients: number;
  gracePeriodClients: number;
  suspendedContracts: number;
  terminatedContracts: number;
  monthlyRevenue: string | number;
  delinquentThisMonth: number;
  currentMonthReference: string;
}

export interface DelinquencyRow {
  installmentId: string;
  contractId: string;
  contractNumber: string;
  clientId: string;
  clientCode: string;
  clientName: string;
  clientPhone: string;
  planName: string;
  dueDate: string;
  amount: string | number;
  lateFee: string | number;
  totalDue: number;
  status: InstallmentStatus;
  contractStatus: ContractStatus;
  clientStatus: ClientStatus;
}
