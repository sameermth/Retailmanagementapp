import { apiRequest, createIdempotencyKey } from "../../lib/api";

interface ErpApiResponse<T> {
  success: boolean;
  data: T;
  message: string | null;
  timestamp: string;
}

export interface SupplierSummaryResponse {
  id: number;
  supplierCode: string;
  name: string;
  paymentTerms: string | null;
  phone: string | null;
  email: string | null;
  stateCode: string | null;
  status: string | null;
}

export interface PurchaseReceiptSummaryResponse {
  id: number;
  supplierId: number;
  receiptNumber: string;
  receiptDate: string;
  dueDate: string | null;
  totalAmount: number;
  allocatedAmount: number | null;
  outstandingAmount: number | null;
  status: string;
}

export interface PurchaseReceiptLineResponse {
  id: number;
  productId: number;
  supplierProductId: number | null;
  productMasterId: number | null;
  sku: string | null;
  productName: string | null;
  hsnCode: string | null;
  supplierProductCode: string | null;
  uomId: number;
  quantity: number;
  baseQuantity: number;
  unitValue: number;
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

export interface PurchaseReceiptDetailResponse extends PurchaseReceiptSummaryResponse {
  organizationId: number;
  branchId: number;
  warehouseId: number;
  sellerGstin: string | null;
  supplierGstin: string | null;
  placeOfSupplyStateCode: string | null;
  lines: PurchaseReceiptLineResponse[];
}

export interface PurchaseOrderSummaryResponse {
  id: number;
  supplierId: number;
  poNumber: string;
  poDate: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  status: string;
}

export interface PurchaseLineResponse {
  id: number;
  productId: number;
  supplierProductId: number | null;
  productMasterId: number | null;
  sku: string | null;
  productName: string | null;
  hsnCode: string | null;
  supplierProductCode: string | null;
  uomId: number;
  quantity: number;
  baseQuantity: number;
  unitValue: number;
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

export interface PurchaseOrderDetailResponse extends PurchaseOrderSummaryResponse {
  organizationId: number;
  branchId: number;
  sellerGstin: string | null;
  supplierGstin: string | null;
  placeOfSupplyStateCode: string | null;
  remarks: string | null;
  lines: PurchaseLineResponse[];
}

export interface PurchasableStoreProductResponse {
  storeProductId: number;
  productId: number;
  supplierProductId: number;
  sku: string;
  name: string;
  supplierProductCode: string | null;
  supplierProductName: string | null;
  supplierPreferred: boolean | null;
  supplierPriority: number | null;
}

export interface SupplierCatalogResponse {
  supplier: SupplierSummaryResponse;
  terms: {
    paymentTerms: string | null;
    creditLimit: number | null;
    creditDays: number | null;
    isPreferred: boolean | null;
    isActive: boolean | null;
  } | null;
  products: PurchasableStoreProductResponse[];
}

export interface PurchaseReturnSummaryResponse {
  id: number;
  supplierId: number;
  originalPurchaseReceiptId: number;
  returnNumber: string;
  returnDate: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  status: string;
}

export interface SupplierPaymentResponse {
  id: number;
  supplierId: number;
  paymentNumber: string;
  paymentDate: string;
  paymentMethod: string;
  referenceNumber: string | null;
  amount: number;
  status: string;
  remarks: string | null;
}

export interface SupplierPaymentRequestPayload {
  organizationId: number;
  branchId?: number;
  supplierId: number;
  paymentDate?: string;
  paymentMethod: string;
  referenceNumber?: string;
  amount: number;
  remarks?: string;
}

export interface PurchaseDocumentLinePayload {
  productId: number;
  supplierProductId?: number;
  uomId: number;
  quantity: number;
  baseQuantity: number;
  unitPrice: number;
  taxRate?: number;
}

export interface PurchaseReceiptLinePayload {
  purchaseOrderLineId?: number;
  productId: number;
  supplierProductId?: number;
  uomId: number;
  quantity: number;
  baseQuantity: number;
  unitCost: number;
  taxRate?: number;
}

export interface CreatePurchaseOrderPayload {
  organizationId: number;
  branchId?: number;
  supplierId: number;
  poDate?: string;
  placeOfSupplyStateCode?: string;
  remarks?: string;
  lines: PurchaseDocumentLinePayload[];
}

export interface CreatePurchaseReceiptPayload {
  organizationId: number;
  branchId?: number;
  warehouseId: number;
  purchaseOrderId?: number;
  supplierId: number;
  receiptDate?: string;
  dueDate?: string;
  placeOfSupplyStateCode?: string;
  remarks?: string;
  lines: PurchaseReceiptLinePayload[];
}

export interface PurchaseReturnLinePayload {
  originalPurchaseReceiptLineId: number;
  quantity: number;
  baseQuantity: number;
  reason?: string;
}

export interface CreatePurchaseReturnPayload {
  organizationId: number;
  branchId?: number;
  originalPurchaseReceiptId: number;
  returnDate?: string;
  reason?: string;
  remarks?: string;
  lines: PurchaseReturnLinePayload[];
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

export async function fetchSupplierSummaries(token: string, organizationId: number) {
  return erpRequest<SupplierSummaryResponse[]>(
    `/api/erp/suppliers?organizationId=${organizationId}`,
    token,
  );
}

export async function fetchPurchaseReceipts(token: string, organizationId: number) {
  return erpRequest<PurchaseReceiptSummaryResponse[]>(
    `/api/erp/purchases/receipts?organizationId=${organizationId}`,
    token,
  );
}

export async function fetchPurchaseReceipt(token: string, receiptId: number) {
  return erpRequest<PurchaseReceiptDetailResponse>(`/api/erp/purchases/receipts/${receiptId}`, token);
}

export async function fetchPurchaseOrders(token: string, organizationId: number) {
  return erpRequest<PurchaseOrderSummaryResponse[]>(
    `/api/erp/purchases/orders?organizationId=${organizationId}`,
    token,
  );
}

export async function fetchPurchaseOrder(token: string, orderId: number) {
  return erpRequest<PurchaseOrderDetailResponse>(`/api/erp/purchases/orders/${orderId}`, token);
}

export async function fetchSupplierCatalog(
  token: string,
  organizationId: number,
  supplierId: number,
) {
  return erpRequest<SupplierCatalogResponse>(
    `/api/erp/suppliers/${supplierId}/catalog?organizationId=${organizationId}`,
    token,
  );
}

export async function createPurchaseOrder(token: string, payload: CreatePurchaseOrderPayload) {
  return erpRequest("/api/erp/purchases/orders", token, {
    method: "POST",
    idempotencyKey: createIdempotencyKey("erp-purchase-order:create", payload),
    body: JSON.stringify(payload),
  });
}

export async function createPurchaseReceipt(token: string, payload: CreatePurchaseReceiptPayload) {
  return erpRequest("/api/erp/purchases/receipts", token, {
    method: "POST",
    idempotencyKey: createIdempotencyKey("erp-purchase-receipt:create", payload),
    body: JSON.stringify(payload),
  });
}

export async function fetchSupplierPayments(token: string, organizationId: number) {
  return erpRequest<SupplierPaymentResponse[]>(
    `/api/erp/purchases/supplier-payments?organizationId=${organizationId}`,
    token,
  );
}

export async function fetchPurchaseReturns(token: string, organizationId: number) {
  return erpRequest<PurchaseReturnSummaryResponse[]>(
    `/api/erp/returns/purchases?organizationId=${organizationId}`,
    token,
  );
}

export async function createPurchaseReturn(token: string, payload: CreatePurchaseReturnPayload) {
  return erpRequest("/api/erp/returns/purchases", token, {
    method: "POST",
    idempotencyKey: createIdempotencyKey("erp-purchase-return:create", payload),
    body: JSON.stringify(payload),
  });
}

export async function createSupplierPayment(token: string, payload: SupplierPaymentRequestPayload) {
  return erpRequest<SupplierPaymentResponse>("/api/erp/purchases/supplier-payments", token, {
    method: "POST",
    idempotencyKey: createIdempotencyKey("erp-supplier-payment:create", payload),
    body: JSON.stringify(payload),
  });
}

export async function allocateSupplierPayment(
  token: string,
  paymentId: number,
  purchaseReceiptId: number,
  allocatedAmount: number,
) {
  return erpRequest<SupplierPaymentResponse>(
    `/api/erp/purchases/supplier-payments/${paymentId}/allocate`,
    token,
    {
      method: "POST",
      idempotencyKey: createIdempotencyKey("erp-supplier-payment:allocate", {
        paymentId,
        purchaseReceiptId,
        allocatedAmount,
      }),
      body: JSON.stringify({
        allocations: [{ purchaseReceiptId, allocatedAmount }],
      }),
    },
  );
}
