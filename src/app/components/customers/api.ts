import { apiRequest, createIdempotencyKey } from "../../lib/api";

interface ErpApiResponse<T> {
  success: boolean;
  data: T;
  message: string | null;
  timestamp: string;
}

export interface CustomerResponse {
  id: number;
  organizationId: number;
  branchId: number;
  linkedOrganizationId: number | null;
  customerCode: string;
  fullName: string;
  customerType: string | null;
  legalName: string | null;
  tradeName: string | null;
  phone: string | null;
  email: string | null;
  gstin: string | null;
  billingAddress: string | null;
  shippingAddress: string | null;
  state: string | null;
  stateCode: string | null;
  contactPersonName: string | null;
  contactPersonPhone: string | null;
  contactPersonEmail: string | null;
  isPlatformLinked: boolean | null;
  creditLimit: number | null;
  notes: string | null;
  status: string | null;
  createdAt: string;
}

export interface StoreCustomerTermsResponse {
  id: number;
  organizationId: number;
  customerId: number;
  customerSegment: string | null;
  creditLimit: number | null;
  creditDays: number | null;
  loyaltyEnabled: boolean | null;
  loyaltyPointsBalance: number | null;
  priceTier: string | null;
  discountPolicy: string | null;
  isPreferred: boolean | null;
  isActive: boolean | null;
  contractStart: string | null;
  contractEnd: string | null;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerRequestPayload {
  customerCode?: string;
  fullName: string;
  customerType?: string;
  legalName?: string;
  tradeName?: string;
  phone?: string;
  email?: string;
  gstin?: string;
  linkedOrganizationId?: number;
  billingAddress?: string;
  shippingAddress?: string;
  state?: string;
  stateCode?: string;
  contactPersonName?: string;
  contactPersonPhone?: string;
  contactPersonEmail?: string;
  creditLimit?: number;
  isPlatformLinked?: boolean;
  notes?: string;
  status?: string;
}

export interface StoreCustomerTermsPayload {
  customerSegment?: string;
  creditLimit?: number;
  creditDays?: number;
  loyaltyEnabled?: boolean;
  loyaltyPointsBalance?: number;
  priceTier?: string;
  discountPolicy?: string;
  isPreferred?: boolean;
  isActive?: boolean;
  contractStart?: string;
  contractEnd?: string;
  remarks?: string;
}

async function erpRequest<T>(path: string, token: string, options?: RequestInit & { idempotencyKey?: string }) {
  const response = await apiRequest<ErpApiResponse<T>>(path, {
    ...options,
    token,
    method: options?.method ?? "GET",
  });
  return response.data;
}

export async function fetchCustomers(token: string, organizationId: number) {
  return erpRequest<CustomerResponse[]>(
    `/api/erp/customers?organizationId=${organizationId}`,
    token,
  );
}

export async function createCustomer(
  token: string,
  organizationId: number,
  branchId: number,
  payload: CustomerRequestPayload,
) {
  return erpRequest<CustomerResponse>(
    `/api/erp/customers?organizationId=${organizationId}&branchId=${branchId}`,
    token,
    {
      method: "POST",
      idempotencyKey: createIdempotencyKey("erp-customer:create", {
        organizationId,
        branchId,
        ...payload,
      }),
      body: JSON.stringify(payload),
    },
  );
}

export async function updateCustomer(
  token: string,
  organizationId: number,
  customerId: number,
  payload: CustomerRequestPayload,
) {
  return erpRequest<CustomerResponse>(
    `/api/erp/customers/${customerId}?organizationId=${organizationId}`,
    token,
    {
      method: "PUT",
      idempotencyKey: createIdempotencyKey("erp-customer:update", {
        organizationId,
        customerId,
        ...payload,
      }),
      body: JSON.stringify(payload),
    },
  );
}

export async function fetchCustomerTerms(
  token: string,
  organizationId: number,
  customerId: number,
) {
  return erpRequest<StoreCustomerTermsResponse>(
    `/api/erp/customers/${customerId}/terms?organizationId=${organizationId}`,
    token,
  );
}

export async function upsertCustomerTerms(
  token: string,
  organizationId: number,
  customerId: number,
  payload: StoreCustomerTermsPayload,
) {
  return erpRequest<StoreCustomerTermsResponse>(
    `/api/erp/customers/${customerId}/terms?organizationId=${organizationId}`,
    token,
    {
      method: "PUT",
      idempotencyKey: createIdempotencyKey("erp-customer-terms:upsert", {
        organizationId,
        customerId,
        ...payload,
      }),
      body: JSON.stringify(payload),
    },
  );
}
