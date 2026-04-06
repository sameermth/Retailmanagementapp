import { apiRequest, createIdempotencyKey } from "../../lib/api";

interface ErpApiResponse<T> {
  success: boolean;
  data: T;
  message: string | null;
  timestamp: string;
}

export interface SupplierResponse {
  id: number;
  organizationId: number;
  branchId: number;
  linkedOrganizationId: number | null;
  supplierCode: string;
  name: string;
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
  paymentTerms: string | null;
  isPlatformLinked: boolean | null;
  notes: string | null;
  status: string | null;
  createdAt: string;
}

export interface StoreSupplierTermsResponse {
  id: number;
  organizationId: number;
  supplierId: number;
  paymentTerms: string | null;
  creditLimit: number | null;
  creditDays: number | null;
  isPreferred: boolean | null;
  isActive: boolean | null;
  contractStart: string | null;
  contractEnd: string | null;
  orderViaEmail: boolean | null;
  orderViaWhatsapp: boolean | null;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierRequestPayload {
  supplierCode?: string;
  name: string;
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
  paymentTerms?: string;
  isPlatformLinked?: boolean;
  notes?: string;
  status?: string;
}

export interface StoreSupplierTermsPayload {
  paymentTerms?: string;
  creditLimit?: number;
  creditDays?: number;
  isPreferred?: boolean;
  isActive?: boolean;
  contractStart?: string;
  contractEnd?: string;
  orderViaEmail?: boolean;
  orderViaWhatsapp?: boolean;
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

export async function fetchVendors(token: string, organizationId: number) {
  return erpRequest<SupplierResponse[]>(
    `/api/erp/suppliers?organizationId=${organizationId}`,
    token,
  );
}

export async function createVendor(
  token: string,
  organizationId: number,
  branchId: number,
  payload: SupplierRequestPayload,
) {
  return erpRequest<SupplierResponse>(
    `/api/erp/suppliers?organizationId=${organizationId}&branchId=${branchId}`,
    token,
    {
      method: "POST",
      idempotencyKey: createIdempotencyKey("erp-supplier:create", {
        organizationId,
        branchId,
        ...payload,
      }),
      body: JSON.stringify(payload),
    },
  );
}

export async function updateVendor(
  token: string,
  organizationId: number,
  supplierId: number,
  payload: SupplierRequestPayload,
) {
  return erpRequest<SupplierResponse>(
    `/api/erp/suppliers/${supplierId}?organizationId=${organizationId}`,
    token,
    {
      method: "PUT",
      idempotencyKey: createIdempotencyKey("erp-supplier:update", {
        organizationId,
        supplierId,
        ...payload,
      }),
      body: JSON.stringify(payload),
    },
  );
}

export async function fetchSupplierTerms(
  token: string,
  organizationId: number,
  supplierId: number,
) {
  return erpRequest<StoreSupplierTermsResponse>(
    `/api/erp/suppliers/${supplierId}/terms?organizationId=${organizationId}`,
    token,
  );
}

export async function upsertSupplierTerms(
  token: string,
  organizationId: number,
  supplierId: number,
  payload: StoreSupplierTermsPayload,
) {
  return erpRequest<StoreSupplierTermsResponse>(
    `/api/erp/suppliers/${supplierId}/terms?organizationId=${organizationId}`,
    token,
    {
      method: "PUT",
      idempotencyKey: createIdempotencyKey("erp-supplier-terms:upsert", {
        organizationId,
        supplierId,
        ...payload,
      }),
      body: JSON.stringify(payload),
    },
  );
}
