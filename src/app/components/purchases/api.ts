import { apiBinaryRequest, apiRequest, createIdempotencyKey } from "../../lib/api";

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
  allocations: PurchaseReceiptAllocationResponse[];
}

export interface PurchaseReceiptAllocationResponse {
  supplierPaymentId: number;
  paymentNumber: string;
  paymentDate: string;
  paymentMethod: string;
  referenceNumber: string | null;
  paymentAmount: number;
  allocatedAmount: number;
  status: string;
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

export interface SupplierProductResponse {
  id: number;
  organizationId: number;
  supplierId: number;
  productId: number;
  supplierProductCode: string | null;
  supplierProductName: string | null;
  priority: number | null;
  isPreferred: boolean | null;
  isActive: boolean | null;
}

export interface SupplierProductRequestPayload {
  productId: number;
  supplierProductCode?: string;
  supplierProductName?: string;
  priority?: number;
  isPreferred?: boolean;
  isActive?: boolean;
}

export interface StoreProductSupplierPreferenceResponse {
  id: number;
  organizationId: number;
  storeProductId: number;
  supplierId: number;
  supplierProductId: number;
  isActive: boolean | null;
  remarks: string | null;
}

export interface StoreProductSupplierPreferencePayload {
  supplierId: number;
  supplierProductId: number;
  isActive?: boolean;
  remarks?: string;
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

export interface ExpenseCategoryResponse {
  id: number;
  organizationId: number;
  code: string;
  name: string;
  expenseAccountId: number | null;
  isActive: boolean;
}

export interface ExpenseResponse {
  id: number;
  organizationId: number;
  branchId: number | null;
  expenseCategoryId: number;
  expenseNumber: string;
  expenseDate: string;
  dueDate: string | null;
  amount: number;
  outstandingAmount: number | null;
  status: string;
  paymentMethod: string | null;
  receiptUrl: string | null;
  remarks: string | null;
}

export interface CreateExpensePayload {
  organizationId: number;
  branchId?: number;
  expenseCategoryId: number;
  expenseDate?: string;
  dueDate?: string;
  amount: number;
  paymentMethod?: string;
  receiptUrl?: string;
  remarks?: string;
  markPaid?: boolean;
}

export interface PayExpensePayload {
  paymentMethod: string;
  paidDate?: string;
  remarks?: string;
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

export async function fetchPurchaseReceiptPdf(token: string, receiptId: number) {
  return apiBinaryRequest(`/api/erp/purchases/receipts/${receiptId}/pdf`, {
    token,
    method: "GET",
  });
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

export async function fetchSupplierProducts(
  token: string,
  organizationId: number,
  supplierId: number,
) {
  return erpRequest<SupplierProductResponse[]>(
    `/api/erp/suppliers/${supplierId}/products?organizationId=${organizationId}`,
    token,
  );
}

export async function createSupplierProduct(
  token: string,
  organizationId: number,
  supplierId: number,
  payload: SupplierProductRequestPayload,
) {
  return erpRequest<SupplierProductResponse>(
    `/api/erp/suppliers/${supplierId}/products?organizationId=${organizationId}`,
    token,
    {
      method: "POST",
      idempotencyKey: createIdempotencyKey("erp-supplier-product:create", {
        organizationId,
        supplierId,
        payload,
      }),
      body: JSON.stringify(payload),
    },
  );
}

export async function fetchStoreProductSupplierPreference(
  token: string,
  organizationId: number,
  storeProductId: number,
) {
  return erpRequest<StoreProductSupplierPreferenceResponse>(
    `/api/erp/suppliers/product-preferences/${storeProductId}?organizationId=${organizationId}`,
    token,
  );
}

export async function upsertStoreProductSupplierPreference(
  token: string,
  organizationId: number,
  storeProductId: number,
  payload: StoreProductSupplierPreferencePayload,
) {
  return erpRequest<StoreProductSupplierPreferenceResponse>(
    `/api/erp/suppliers/product-preferences/${storeProductId}?organizationId=${organizationId}`,
    token,
    {
      method: "PUT",
      idempotencyKey: createIdempotencyKey("erp-store-product-supplier-preference:upsert", {
        organizationId,
        storeProductId,
        payload,
      }),
      body: JSON.stringify(payload),
    },
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

export async function fetchSupplierPaymentPdf(token: string, paymentId: number) {
  return apiBinaryRequest(`/api/erp/purchases/supplier-payments/${paymentId}/pdf`, {
    token,
    method: "GET",
  });
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

export async function fetchExpenseCategories(token: string, organizationId: number) {
  return erpRequest<ExpenseCategoryResponse[]>(
    `/api/erp/expenses/categories?organizationId=${organizationId}`,
    token,
  );
}

export async function fetchExpenses(token: string, organizationId: number) {
  return erpRequest<ExpenseResponse[]>(
    `/api/erp/expenses?organizationId=${organizationId}`,
    token,
  );
}

export async function createExpense(token: string, payload: CreateExpensePayload) {
  return erpRequest<ExpenseResponse>("/api/erp/expenses", token, {
    method: "POST",
    idempotencyKey: createIdempotencyKey("erp-expense:create", payload),
    body: JSON.stringify(payload),
  });
}

export async function payExpense(token: string, expenseId: number, payload: PayExpensePayload) {
  return erpRequest<ExpenseResponse>(`/api/erp/expenses/${expenseId}/pay`, token, {
    method: "POST",
    idempotencyKey: createIdempotencyKey("erp-expense:pay", { expenseId, payload }),
    body: JSON.stringify(payload),
  });
}
