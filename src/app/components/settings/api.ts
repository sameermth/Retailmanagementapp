import { apiRequest, createIdempotencyKey } from "../../lib/api";

interface ErpApiResponse<T> {
  success: boolean;
  data: T;
  message: string | null;
  timestamp: string;
}

export interface OrganizationResponse {
  id: number;
  name: string;
  code: string;
  legalName: string | null;
  phone: string | null;
  email: string | null;
  gstin: string | null;
  ownerAccountId: number | null;
  gstThresholdAmount: number | null;
  gstThresholdAlertEnabled: boolean | null;
  subscriptionVersion: number | null;
  isActive: boolean | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationCreatePayload {
  name: string;
  code: string;
  legalName?: string;
  phone?: string;
  email?: string;
  gstin?: string;
  gstThresholdAmount?: number;
  gstThresholdAlertEnabled?: boolean;
  isActive?: boolean;
}

export interface OrganizationUpdatePayload extends Partial<OrganizationCreatePayload> {}

export interface BranchResponse {
  id: number;
  organizationId: number;
  code: string;
  name: string;
  phone: string | null;
  email: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  isActive: boolean | null;
  createdAt: string;
  updatedAt: string;
}

export interface BranchCreatePayload {
  organizationId: number;
  code: string;
  name: string;
  phone?: string;
  email?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  isActive?: boolean;
}

export interface BranchUpdatePayload extends Partial<Omit<BranchCreatePayload, "organizationId">> {}

export interface EmployeeBranchAccessSummary {
  branchId: number;
  isDefault: boolean | null;
}

export interface EmployeeResponse {
  id: number;
  organizationId: number;
  accountId: number | null;
  personId: number | null;
  username: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  roleCode: string | null;
  roleName: string | null;
  employeeCode: string | null;
  defaultBranchId: number | null;
  branchAccess: EmployeeBranchAccessSummary[];
  active: boolean | null;
  createdAt: string;
  updatedAt: string;
}

export interface RoleReferenceResponse {
  id: number;
  code: string;
  name: string;
  system: boolean | null;
  active: boolean | null;
}

export interface CreateEmployeePayload {
  organizationId: number;
  username: string;
  password: string;
  fullName: string;
  email?: string;
  phone?: string;
  roleCode: string;
  defaultBranchId?: number;
  branchIds: number[];
  active?: boolean;
}

export interface UpdateEmployeePayload {
  fullName?: string;
  email?: string;
  phone?: string;
  roleCode?: string;
  defaultBranchId?: number;
  branchIds?: number[];
  active?: boolean;
}

async function erpRequest<T>(
  path: string,
  token: string,
  options?: RequestInit & { idempotencyKey?: string },
) {
  const response = await apiRequest<ErpApiResponse<T>>(path, {
    ...options,
    token,
    method: options?.method ?? "GET",
  });
  return response.data;
}

async function rawRequest<T>(
  path: string,
  token: string,
  options?: RequestInit & { idempotencyKey?: string },
) {
  return apiRequest<T>(path, {
    ...options,
    token,
    method: options?.method ?? "GET",
  });
}

export async function fetchOrganizations(token: string) {
  return erpRequest<OrganizationResponse[]>("/api/erp/organizations", token);
}

export async function updateOrganization(token: string, organizationId: number, payload: OrganizationUpdatePayload) {
  return erpRequest<OrganizationResponse>(`/api/erp/organizations/${organizationId}`, token, {
    method: "PUT",
    idempotencyKey: createIdempotencyKey("erp-organization:update", { organizationId, ...payload }),
    body: JSON.stringify(payload),
  });
}

export async function createOrganization(token: string, payload: OrganizationCreatePayload) {
  return erpRequest<OrganizationResponse>("/api/erp/organizations", token, {
    method: "POST",
    idempotencyKey: createIdempotencyKey("erp-organization:create", payload),
    body: JSON.stringify(payload),
  });
}

export async function fetchBranches(token: string, organizationId: number) {
  return erpRequest<BranchResponse[]>(`/api/erp/branches?organizationId=${organizationId}`, token);
}

export async function createBranch(token: string, payload: BranchCreatePayload) {
  return erpRequest<BranchResponse>("/api/erp/branches", token, {
    method: "POST",
    idempotencyKey: createIdempotencyKey("erp-branch:create", payload),
    body: JSON.stringify(payload),
  });
}

export async function updateBranch(
  token: string,
  organizationId: number,
  branchId: number,
  payload: BranchUpdatePayload,
) {
  return erpRequest<BranchResponse>(
    `/api/erp/branches/${branchId}?organizationId=${organizationId}`,
    token,
    {
      method: "PUT",
      idempotencyKey: createIdempotencyKey("erp-branch:update", { organizationId, branchId, ...payload }),
      body: JSON.stringify(payload),
    },
  );
}

export async function fetchEmployees(token: string, organizationId: number) {
  return rawRequest<EmployeeResponse[]>(`/api/erp/employees?organizationId=${organizationId}`, token);
}

export async function fetchEmployeeRoles(token: string, query?: string) {
  const search = new URLSearchParams();
  if (query?.trim()) {
    search.set("query", query.trim());
  }
  const suffix = search.toString() ? `?${search.toString()}` : "";
  return rawRequest<RoleReferenceResponse[]>(`/api/erp/employees/roles${suffix}`, token);
}

export async function createEmployee(token: string, payload: CreateEmployeePayload) {
  return rawRequest<EmployeeResponse>("/api/erp/employees", token, {
    method: "POST",
    idempotencyKey: createIdempotencyKey("erp-employee:create", payload),
    body: JSON.stringify(payload),
  });
}

export async function updateEmployee(
  token: string,
  organizationId: number,
  employeeId: number,
  payload: UpdateEmployeePayload,
) {
  return rawRequest<EmployeeResponse>(
    `/api/erp/employees/${employeeId}?organizationId=${organizationId}`,
    token,
    {
      method: "PUT",
      idempotencyKey: createIdempotencyKey("erp-employee:update", { organizationId, employeeId, ...payload }),
      body: JSON.stringify(payload),
    },
  );
}

export async function activateEmployee(token: string, organizationId: number, employeeId: number) {
  return rawRequest<void>(`/api/erp/employees/${employeeId}/activate?organizationId=${organizationId}`, token, {
    method: "PUT",
  });
}

export async function deactivateEmployee(token: string, organizationId: number, employeeId: number) {
  return rawRequest<void>(`/api/erp/employees/${employeeId}/deactivate?organizationId=${organizationId}`, token, {
    method: "PUT",
  });
}
