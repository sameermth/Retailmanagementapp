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

export interface SupplierRequestPayload {
  supplierCode: string;
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
