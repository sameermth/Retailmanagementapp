import { apiRequest } from "../../lib/api";

export interface SalesSummaryDTO {
  totalAmount: number;
  totalTransactions: number;
  averageTransactionValue: number;
  cashAmount: number;
  cardAmount: number;
  upiAmount: number;
  creditAmount: number;
}

export interface GstThresholdStatusResponse {
  organizationId: number;
  financialYearTurnover: number;
  gstThresholdAmount: number;
  utilizationRatio: number;
  alertLevel: string;
  gstRegistered: boolean;
  thresholdReached: boolean;
  alertEnabled: boolean;
  message: string;
}

export interface DashboardSummaryResponse {
  todaySales: SalesSummaryDTO | null;
  weeklySales: SalesSummaryDTO | null;
  monthlySales: SalesSummaryDTO | null;
  totalProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalCustomers: number;
  newCustomersToday: number;
  totalDueAmount: number;
  overdueCount: number;
  pendingOrders: number;
  completedOrdersToday: number;
  gstStatus: GstThresholdStatusResponse | null;
}

export interface ProfitabilityProductDTO {
  productId: number;
  productName: string;
  sku: string;
  revenue: number;
  cost: number;
  grossProfit: number;
  marginPercent: number;
}

export interface ProfitabilitySummaryDTO {
  fromDate: string;
  toDate: string;
  revenue: number;
  cost: number;
  grossProfit: number;
  marginPercent: number;
  invoiceCount: number;
  topProducts: ProfitabilityProductDTO[];
}

export interface RecentActivityDTO {
  id: number;
  type: string;
  description: string;
  reference: string | null;
  user: string | null;
  timestamp: string;
  status: string | null;
  amount: number | null;
}

export interface StockProductSnapshotDTO {
  productId: number;
  productName: string;
  sku: string;
  onHandQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  inventoryValue: number;
  stockStatus: string;
}

export interface StockSummaryDTO {
  onHandQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  inventoryValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  lowStockProducts: StockProductSnapshotDTO[];
}

export interface TaxSummaryDTO {
  fromDate: string;
  toDate: string;
  outputTax: number;
  inputTax: number;
  salesReturnTaxReversal: number;
  purchaseReturnTaxReversal: number;
  netTaxPayable: number;
  taxableSales: number;
  taxablePurchases: number;
  gstAlertLevel: string;
  gstMessage: string;
}

interface ErpApiResponse<T> {
  success: boolean;
  data: T;
  message: string | null;
  timestamp: string;
}

export interface TaxRegistrationResponse {
  id: number;
  organizationId: number;
  branchId: number | null;
  registrationType: string | null;
  registrationName: string;
  legalName: string | null;
  gstin: string;
  registrationStateCode: string;
  registrationStateName: string | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  isDefault: boolean;
  isActive: boolean;
}

export interface TaxRegistrationListResponse {
  requestedBranchId: number | null;
  effectiveDate: string | null;
  registrations: TaxRegistrationResponse[];
  applicableOrganizationRegistration: TaxRegistrationResponse | null;
  applicableBranchRegistration: TaxRegistrationResponse | null;
  effectiveRegistration: TaxRegistrationResponse | null;
  effectiveRegistrationScope: string | null;
  hasScopeConflict: boolean;
  scopeWarnings: string[];
}

function query(params: Record<string, string | number | undefined | null>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  });
  return search.toString();
}

export async function fetchDashboardSummary(token: string) {
  return apiRequest<DashboardSummaryResponse>("/api/dashboard/summary", {
    method: "GET",
    token,
  });
}

export async function fetchProfitabilitySummary(
  token: string,
  startDate: string,
  endDate: string,
  limit = 5,
) {
  return apiRequest<ProfitabilitySummaryDTO>(
    `/api/dashboard/profitability?${query({ startDate, endDate, limit })}`,
    { method: "GET", token },
  );
}

export async function fetchRecentActivities(token: string, limit = 6) {
  return apiRequest<RecentActivityDTO[]>(
    `/api/dashboard/activities/recent?${query({ limit })}`,
    { method: "GET", token },
  );
}

export async function fetchStockSummary(token: string, limit = 5) {
  return apiRequest<StockSummaryDTO>(
    `/api/dashboard/inventory/stock-summary?${query({ limit })}`,
    { method: "GET", token },
  );
}

export async function fetchTaxSummary(token: string, startDate: string, endDate: string) {
  return apiRequest<TaxSummaryDTO>(
    `/api/dashboard/tax/summary?${query({ startDate, endDate })}`,
    { method: "GET", token },
  );
}

export async function fetchThresholdStatus(
  token: string,
  organizationId: number,
  asOfDate?: string,
) {
  const response = await apiRequest<ErpApiResponse<GstThresholdStatusResponse>>(
    `/api/erp/tax/threshold-status?${query({ organizationId, asOfDate })}`,
    { method: "GET", token },
  );
  return response.data;
}

export async function fetchTaxRegistrations(
  token: string,
  organizationId: number,
  branchId?: number,
  documentDate?: string,
) {
  const response = await apiRequest<ErpApiResponse<TaxRegistrationListResponse>>(
    `/api/erp/tax/registrations?${query({ organizationId, branchId, documentDate })}`,
    { method: "GET", token },
  );
  return response.data;
}
