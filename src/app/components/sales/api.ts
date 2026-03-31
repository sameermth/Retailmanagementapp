import { apiRequest, createIdempotencyKey } from "../../lib/api";

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

export interface SalesInvoiceLineResponse {
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
}

export interface SalesInvoiceDetailResponse extends SalesInvoiceSummaryResponse {
  organizationId: number;
  branchId: number;
  warehouseId: number;
  sellerGstin: string | null;
  customerGstin: string | null;
  placeOfSupplyStateCode: string | null;
  lines: SalesInvoiceLineResponse[];
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

export async function fetchInvoices(token: string, organizationId: number) {
  return erpRequest<SalesInvoiceSummaryResponse[]>(
    `/api/erp/sales/invoices?organizationId=${organizationId}`,
    token,
  );
}

export async function fetchInvoice(token: string, invoiceId: number) {
  return erpRequest<SalesInvoiceDetailResponse>(`/api/erp/sales/invoices/${invoiceId}`, token);
}

export async function fetchOrders(token: string, organizationId: number) {
  return erpRequest<SalesOrderSummaryResponse[]>(
    `/api/erp/sales/orders?organizationId=${organizationId}`,
    token,
  );
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
