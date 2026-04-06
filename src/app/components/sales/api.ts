import { apiBinaryRequest, apiRequest, createIdempotencyKey } from "../../lib/api";

interface ErpApiResponse<T> {
  success: boolean;
  data: T;
  message: string | null;
  timestamp: string;
}

export interface SalesCustomerSummary {
  id: number;
  customerCode: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  gstin: string | null;
  stateCode: string | null;
  status: string | null;
}

export interface StoreProductOption {
  id: number;
  productId: number | null;
  baseUomId: number;
  sku: string;
  name: string;
  description: string | null;
  inventoryTrackingMode: string;
  defaultSalePrice: number | null;
  serialTrackingEnabled: boolean;
  batchTrackingEnabled: boolean;
  isActive: boolean;
}

export interface SalesQuoteSummaryResponse {
  id: number;
  customerId: number;
  quoteType: string;
  quoteNumber: string;
  quoteDate: string;
  validUntil: string | null;
  totalAmount: number;
  status: string;
}

export interface SalesDocumentLineResponse {
  id: number;
  productId: number;
  uomId: number;
  hsnCode: string | null;
  quantity: number;
  baseQuantity: number;
  unitPrice: number;
  discountAmount: number | null;
  taxableAmount: number | null;
  taxRate: number | null;
  cgstRate: number | null;
  cgstAmount: number | null;
  sgstRate: number | null;
  sgstAmount: number | null;
  igstRate: number | null;
  igstAmount: number | null;
  cessRate: number | null;
  cessAmount: number | null;
  lineAmount: number | null;
  remarks: string | null;
}

export interface SalesQuoteDetailResponse extends SalesQuoteSummaryResponse {
  organizationId: number;
  branchId: number;
  warehouseId: number;
  validUntil: string | null;
  sellerGstin: string | null;
  customerGstin: string | null;
  placeOfSupplyStateCode: string | null;
  subtotal: number | null;
  discountAmount: number | null;
  taxAmount: number | null;
  convertedSalesOrderId: number | null;
  convertedSalesInvoiceId: number | null;
  remarks: string | null;
  lines: SalesDocumentLineResponse[];
}

export interface SalesInvoiceSummaryResponse {
  id: number;
  customerId: number;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string | null;
  subtotal: number;
  discountAmount: number | null;
  taxAmount: number | null;
  totalAmount: number;
  allocatedAmount: number | null;
  outstandingAmount: number | null;
  status: string;
}

export interface SalesInvoiceLineResponse extends SalesDocumentLineResponse {
  productOwnershipId?: number | null;
  productOwnershipIds?: number[] | null;
}

export interface SalesInvoiceAllocationResponse {
  customerReceiptId: number;
  receiptNumber: string;
  receiptDate: string;
  paymentMethod: string;
  referenceNumber: string | null;
  receiptAmount: number;
  allocatedAmount: number;
  status: string;
}

export interface SalesInvoiceDetailResponse extends SalesInvoiceSummaryResponse {
  organizationId: number;
  branchId: number;
  warehouseId: number;
  sellerGstin: string | null;
  customerGstin: string | null;
  placeOfSupplyStateCode: string | null;
  lines: SalesInvoiceLineResponse[];
  allocations: SalesInvoiceAllocationResponse[];
}

export interface ServiceAgreementItemResponse {
  id: number;
  serviceAgreementId: number;
  productId: number;
  productOwnershipId: number | null;
  salesInvoiceLineId: number | null;
  serialNumberId: number | null;
  coverageScope: string | null;
  includedServiceNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceAgreementResponse {
  id: number;
  organizationId: number;
  branchId: number;
  customerId: number;
  salesInvoiceId: number;
  agreementNumber: string;
  agreementType: string;
  status: string;
  serviceStartDate: string | null;
  serviceEndDate: string | null;
  laborIncluded: boolean | null;
  partsIncluded: boolean | null;
  preventiveVisitsIncluded: number | null;
  visitLimit: number | null;
  slaHours: number | null;
  agreementAmount: number | null;
  notes: string | null;
  items: ServiceAgreementItemResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface WarrantyExtensionResponse {
  id: number;
  organizationId: number;
  productOwnershipId: number;
  serialNumberId: number | null;
  salesInvoiceId: number | null;
  salesInvoiceLineId: number | null;
  extensionType: string;
  monthsAdded: number;
  startDate: string | null;
  endDate: string | null;
  status: string;
  reason: string | null;
  referenceNumber: string | null;
  amount: number | null;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OwnershipWarrantySummaryResponse {
  productOwnershipId: number;
  serialNumberId: number | null;
  salesInvoiceId: number | null;
  salesInvoiceLineId: number | null;
  baseWarrantyStartDate: string | null;
  baseWarrantyEndDate: string | null;
  effectiveWarrantyEndDate: string | null;
  hasExtensions: boolean;
  extensions: WarrantyExtensionResponse[];
}

export interface SalesOrderSummaryResponse {
  id: number;
  customerId: number;
  sourceQuoteId: number | null;
  orderNumber: string;
  orderDate: string;
  totalAmount: number;
  convertedSalesInvoiceId: number | null;
  status: string;
}

export interface SalesOrderDetailResponse extends SalesOrderSummaryResponse {
  organizationId: number;
  branchId: number;
  warehouseId: number;
  sellerGstin: string | null;
  customerGstin: string | null;
  placeOfSupplyStateCode: string | null;
  subtotal: number | null;
  discountAmount: number | null;
  taxAmount: number | null;
  remarks: string | null;
  lines: SalesDocumentLineResponse[];
}

export interface SalesReturnSummaryResponse {
  id: number;
  customerId: number;
  originalSalesInvoiceId: number;
  returnNumber: string;
  returnDate: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  status: string;
}

export interface CustomerReceiptResponse {
  id: number;
  customerId: number;
  receiptNumber: string;
  receiptDate: string;
  paymentMethod: string;
  referenceNumber: string | null;
  amount: number;
  status: string;
  remarks: string | null;
}

export interface RecurringInvoiceSummaryResponse {
  id: number;
  organizationId: number;
  branchId: number | null;
  warehouseId: number;
  customerId: number;
  templateNumber: string;
  frequency: string;
  startDate: string | null;
  nextRunDate: string | null;
  endDate: string | null;
  isActive: boolean;
  lastSalesInvoiceId: number | null;
}

export interface RecurringInvoiceLinePayload {
  productId: number;
  uomId: number;
  quantity: number;
  baseQuantity: number;
  unitPrice?: number;
  discountAmount?: number;
  warrantyMonths?: number;
  remarks?: string;
}

export interface CreateRecurringInvoicePayload {
  organizationId: number;
  branchId?: number;
  warehouseId: number;
  customerId: number;
  priceListId?: number;
  frequency: string;
  startDate?: string;
  nextRunDate?: string;
  endDate?: string;
  dueDays?: number;
  placeOfSupplyStateCode?: string;
  remarks?: string;
  isActive?: boolean;
  lines: RecurringInvoiceLinePayload[];
}

export interface RunRecurringInvoicePayload {
  runDate?: string;
}

export interface SalesDocumentLinePayload {
  productId: number;
  uomId: number;
  quantity: number;
  baseQuantity: number;
  unitPrice?: number;
  discountAmount?: number;
  remarks?: string;
}

export interface SalesInvoiceLinePayload extends SalesDocumentLinePayload {
  priceOverrideReason?: string;
  taxRate?: number;
  serialNumberIds?: number[];
  batchSelections?: Array<{
    batchId: number;
    quantity: number;
    baseQuantity: number;
  }>;
  warrantyMonths?: number;
}

export interface CreateQuotePayload {
  organizationId: number;
  branchId?: number;
  warehouseId: number;
  customerId: number;
  quoteType: string;
  quoteDate?: string;
  validUntil?: string;
  placeOfSupplyStateCode?: string;
  remarks?: string;
  lines: SalesDocumentLinePayload[];
}

export interface CreateInvoicePayload {
  organizationId: number;
  branchId?: number;
  warehouseId: number;
  customerId: number;
  priceListId?: number;
  invoiceDate?: string;
  dueDate?: string;
  placeOfSupplyStateCode?: string;
  remarks?: string;
  lines: SalesInvoiceLinePayload[];
}

export interface CreateServiceAgreementPayload {
  organizationId: number;
  branchId?: number;
  customerId: number;
  salesInvoiceId: number;
  agreementType: "AMC" | "INSTALLATION_SUPPORT" | "SERVICE_CONTRACT" | "PREVENTIVE_MAINTENANCE";
  status?: "DRAFT" | "ACTIVE" | "EXPIRED" | "CANCELLED";
  serviceStartDate: string;
  serviceEndDate: string;
  laborIncluded?: boolean;
  partsIncluded?: boolean;
  preventiveVisitsIncluded?: number;
  visitLimit?: number;
  slaHours?: number;
  agreementAmount?: number;
  notes?: string;
  items: Array<{
    productId: number;
    productOwnershipId?: number;
    salesInvoiceLineId?: number;
    serialNumberId?: number;
    coverageScope?: "FULL" | "LABOR_ONLY" | "PARTS_ONLY" | "VISIT_ONLY";
    includedServiceNotes?: string;
  }>;
}

export interface CreateWarrantyExtensionPayload {
  organizationId: number;
  branchId?: number;
  extensionType: "MANUFACTURER_PROMO" | "PAID_EXTENDED" | "GOODWILL" | "MANUAL_CORRECTION";
  monthsAdded: number;
  startDate?: string;
  endDate?: string;
  reason?: string;
  referenceNumber?: string;
  amount?: number;
  remarks?: string;
}

export interface CreateOrderPayload {
  organizationId: number;
  branchId?: number;
  warehouseId: number;
  customerId: number;
  orderDate?: string;
  placeOfSupplyStateCode?: string;
  remarks?: string;
  lines: SalesDocumentLinePayload[];
}

export interface CancelSalesDocumentPayload {
  organizationId?: number;
  branchId?: number;
  reason: string;
}

export interface CreateReceiptPayload {
  organizationId: number;
  branchId?: number;
  customerId: number;
  receiptDate?: string;
  paymentMethod: string;
  referenceNumber?: string;
  amount: number;
  remarks?: string;
}

export interface ReceiptAllocationPayload {
  allocations: Array<{
    salesInvoiceId: number;
    allocatedAmount: number;
  }>;
}

export interface SalesReturnLinePayload {
  originalSalesInvoiceLineId: number;
  quantity: number;
  baseQuantity: number;
  disposition?: string;
  reason?: string;
}

export interface CreateSalesReturnPayload {
  organizationId: number;
  branchId?: number;
  originalSalesInvoiceId: number;
  returnDate?: string;
  reason?: string;
  remarks?: string;
  lines: SalesReturnLinePayload[];
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

export async function fetchSalesCustomers(token: string, organizationId: number) {
  return erpRequest<SalesCustomerSummary[]>(
    `/api/erp/customers?organizationId=${organizationId}`,
    token,
  );
}

export async function fetchStoreProductsForSales(token: string, organizationId: number) {
  return erpRequest<StoreProductOption[]>(
    `/api/erp/products?organizationId=${organizationId}`,
    token,
  );
}

export async function fetchQuotes(token: string, organizationId: number) {
  return erpRequest<SalesQuoteSummaryResponse[]>(
    `/api/erp/sales/quotes?organizationId=${organizationId}`,
    token,
  );
}

export async function createQuote(token: string, payload: CreateQuotePayload) {
  return erpRequest("/api/erp/sales/quotes", token, {
    method: "POST",
    idempotencyKey: createIdempotencyKey("erp-sales-quote:create", payload),
    body: JSON.stringify(payload),
  });
}

export async function fetchQuote(token: string, quoteId: number) {
  return erpRequest<SalesQuoteDetailResponse>(`/api/erp/sales/quotes/${quoteId}`, token);
}

export async function cancelQuote(
  token: string,
  quoteId: number,
  payload: CancelSalesDocumentPayload,
) {
  return erpRequest<SalesQuoteDetailResponse>(`/api/erp/sales/quotes/${quoteId}/cancel`, token, {
    method: "POST",
    idempotencyKey: createIdempotencyKey("erp-sales-quote:cancel", { quoteId, ...payload }),
    body: JSON.stringify(payload),
  });
}

export async function fetchQuotePdf(token: string, quoteId: number) {
  return apiBinaryRequest(`/api/erp/sales/quotes/${quoteId}/pdf`, {
    token,
    method: "GET",
  });
}

export async function fetchInvoices(token: string, organizationId: number) {
  return erpRequest<SalesInvoiceSummaryResponse[]>(
    `/api/erp/sales/invoices?organizationId=${organizationId}`,
    token,
  );
}

export async function fetchInvoice(token: string, invoiceId: number) {
  return erpRequest<SalesInvoiceDetailResponse>(`/api/erp/sales/invoices/${invoiceId}`, token);
}

export async function fetchInvoicePdf(token: string, invoiceId: number) {
  return apiBinaryRequest(`/api/erp/sales/invoices/${invoiceId}/pdf`, {
    token,
    method: "GET",
  });
}

export async function fetchServiceAgreements(token: string, organizationId: number) {
  return erpRequest<ServiceAgreementResponse[]>(
    `/api/erp/service/agreements?organizationId=${organizationId}`,
    token,
  );
}

export async function fetchServiceAgreement(token: string, agreementId: number) {
  return erpRequest<ServiceAgreementResponse>(`/api/erp/service/agreements/${agreementId}`, token);
}

export async function createServiceAgreement(
  token: string,
  payload: CreateServiceAgreementPayload,
) {
  return erpRequest<ServiceAgreementResponse>("/api/erp/service/agreements", token, {
    method: "POST",
    idempotencyKey: createIdempotencyKey("erp-service-agreement:create", payload),
    body: JSON.stringify(payload),
  });
}

export async function fetchOwnershipWarrantySummary(
  token: string,
  ownershipId: number,
  organizationId: number,
) {
  return erpRequest<OwnershipWarrantySummaryResponse>(
    `/api/erp/service/ownership/${ownershipId}/warranty?organizationId=${organizationId}`,
    token,
  );
}

export async function createWarrantyExtension(
  token: string,
  ownershipId: number,
  payload: CreateWarrantyExtensionPayload,
) {
  return erpRequest<WarrantyExtensionResponse>(
    `/api/erp/service/ownership/${ownershipId}/warranty-extensions`,
    token,
    {
      method: "POST",
      idempotencyKey: createIdempotencyKey("erp-warranty-extension:create", {
        ownershipId,
        ...payload,
      }),
      body: JSON.stringify(payload),
    },
  );
}

export async function fetchOrders(token: string, organizationId: number) {
  return erpRequest<SalesOrderSummaryResponse[]>(
    `/api/erp/sales/orders?organizationId=${organizationId}`,
    token,
  );
}

export async function fetchOrder(token: string, orderId: number) {
  return erpRequest<SalesOrderDetailResponse>(`/api/erp/sales/orders/${orderId}`, token);
}

export async function fetchOrderPdf(token: string, orderId: number) {
  return apiBinaryRequest(`/api/erp/sales/orders/${orderId}/pdf`, {
    token,
    method: "GET",
  });
}

export async function cancelOrder(
  token: string,
  orderId: number,
  payload: CancelSalesDocumentPayload,
) {
  return erpRequest<SalesOrderDetailResponse>(`/api/erp/sales/orders/${orderId}/cancel`, token, {
    method: "POST",
    idempotencyKey: createIdempotencyKey("erp-sales-order:cancel", { orderId, ...payload }),
    body: JSON.stringify(payload),
  });
}

export async function createOrder(token: string, payload: CreateOrderPayload) {
  return erpRequest("/api/erp/sales/orders", token, {
    method: "POST",
    idempotencyKey: createIdempotencyKey("erp-sales-order:create", payload),
    body: JSON.stringify(payload),
  });
}

export async function createInvoice(token: string, payload: CreateInvoicePayload) {
  return erpRequest("/api/erp/sales/invoices", token, {
    method: "POST",
    idempotencyKey: createIdempotencyKey("erp-sales-invoice:create", payload),
    body: JSON.stringify(payload),
  });
}

export async function fetchReceipts(token: string, organizationId: number) {
  return erpRequest<CustomerReceiptResponse[]>(
    `/api/erp/sales/receipts?organizationId=${organizationId}`,
    token,
  );
}

export async function fetchReceiptPdf(token: string, receiptId: number) {
  return apiBinaryRequest(`/api/erp/sales/receipts/${receiptId}/pdf`, {
    token,
    method: "GET",
  });
}

export async function fetchSalesReturns(token: string, organizationId: number) {
  return erpRequest<SalesReturnSummaryResponse[]>(
    `/api/erp/returns/sales?organizationId=${organizationId}`,
    token,
  );
}

export async function createSalesReturn(token: string, payload: CreateSalesReturnPayload) {
  return erpRequest("/api/erp/returns/sales", token, {
    method: "POST",
    idempotencyKey: createIdempotencyKey("erp-sales-return:create", payload),
    body: JSON.stringify(payload),
  });
}

export async function createReceipt(token: string, payload: CreateReceiptPayload) {
  return erpRequest<CustomerReceiptResponse>("/api/erp/sales/receipts", token, {
    method: "POST",
    idempotencyKey: createIdempotencyKey("erp-customer-receipt:create", payload),
    body: JSON.stringify(payload),
  });
}

export async function allocateReceipt(
  token: string,
  receiptId: number,
  payload: ReceiptAllocationPayload,
) {
  return erpRequest<CustomerReceiptResponse>(`/api/erp/sales/receipts/${receiptId}/allocate`, token, {
    method: "POST",
    idempotencyKey: createIdempotencyKey("erp-customer-receipt:allocate", {
      receiptId,
      ...payload,
    }),
    body: JSON.stringify(payload),
  });
}

export async function fetchRecurringInvoices(token: string, organizationId: number) {
  return erpRequest<RecurringInvoiceSummaryResponse[]>(
    `/api/erp/sales/recurring-invoices?organizationId=${organizationId}`,
    token,
  );
}

export async function createRecurringInvoice(
  token: string,
  payload: CreateRecurringInvoicePayload,
) {
  return erpRequest("/api/erp/sales/recurring-invoices", token, {
    method: "POST",
    idempotencyKey: createIdempotencyKey("erp-recurring-sales-invoice:create", payload),
    body: JSON.stringify(payload),
  });
}

export async function runRecurringInvoice(
  token: string,
  recurringInvoiceId: number,
  organizationId: number,
  payload?: RunRecurringInvoicePayload,
) {
  const path = `/api/erp/sales/recurring-invoices/${recurringInvoiceId}/run?organizationId=${organizationId}`;
  return erpRequest(path, token, {
    method: "POST",
    idempotencyKey: createIdempotencyKey("erp-recurring-sales-invoice:run", {
      recurringInvoiceId,
      organizationId,
      payload,
    }),
    body: JSON.stringify(payload ?? {}),
  });
}
