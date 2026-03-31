import { apiRequest, createIdempotencyKey } from "../../lib/api";

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface ProductResponse {
  id: number;
  sku: string;
  name: string;
  description: string | null;
  category?: { id: number; name: string } | null;
  brand?: { id: number; name: string } | null;
  unitPrice: number;
  costPrice: number | null;
  gstRate: number | null;
  hsnCode: string | null;
  unitOfMeasure: string | null;
  reorderLevel: number | null;
  reorderQuantity: number | null;
  specifications: string | null;
  barcode: string | null;
  manufacturer: string | null;
  countryOfOrigin: string | null;
  isActive: boolean;
  isPerishable: boolean | null;
  shelfLifeDays: number | null;
  stockQuantity: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface WarehouseResponse {
  id: number;
  code: string;
  name: string;
  isActive: boolean;
  isPrimary: boolean;
  city: string | null;
  state: string | null;
}

export interface ProductRequestPayload {
  sku: string;
  name: string;
  description?: string;
  unitPrice: number;
  costPrice?: number;
  gstRate?: number;
  hsnCode?: string;
  unitOfMeasure?: string;
  reorderLevel?: number;
  reorderQuantity?: number;
  specifications?: string;
  manufacturer?: string;
  countryOfOrigin?: string;
  isPerishable?: boolean;
  shelfLifeDays?: number;
  images: [];
  variants: [];
}

export interface InventoryCreatePayload {
  productId: number;
  warehouseId: number;
  quantity: number;
  minimumStock?: number;
  reorderPoint?: number;
  reorderQuantity?: number;
  averageCost?: number;
  lastPurchasePrice?: number;
}

export interface ErpApiResponse<T> {
  success: boolean;
  data: T;
  message: string | null;
  timestamp: string;
}

export interface StoreProductResponse {
  id: number;
  organizationId: number;
  productId: number | null;
  categoryId: number;
  brandId: number;
  baseUomId: number;
  taxGroupId: number;
  sku: string;
  name: string;
  description: string | null;
  inventoryTrackingMode: string;
  serialTrackingEnabled: boolean;
  batchTrackingEnabled: boolean;
  expiryTrackingEnabled: boolean;
  fractionalQuantityAllowed: boolean;
  minStockBaseQty: string | null;
  reorderLevelBaseQty: string | null;
  defaultSalePrice: number | null;
  isServiceItem: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStoreProductPayload {
  organizationId: number;
  productId?: number;
  categoryId: number;
  brandId: number;
  baseUomId: number;
  taxGroupId: number;
  sku: string;
  name: string;
  description?: string;
  inventoryTrackingMode: string;
  serialTrackingEnabled?: boolean;
  batchTrackingEnabled?: boolean;
  expiryTrackingEnabled?: boolean;
  fractionalQuantityAllowed?: boolean;
  minStockBaseQty?: number;
  reorderLevelBaseQty?: number;
  isServiceItem?: boolean;
  isActive?: boolean;
}

export interface InventoryBalanceResponse {
  id: number;
  organizationId: number;
  branchId: number;
  warehouseId: number;
  productId: number;
  batchId: number | null;
  onHandBaseQuantity: string | null;
  reservedBaseQuantity: string | null;
  availableBaseQuantity: string | null;
  avgCost: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ManualAdjustmentPayload {
  organizationId?: number;
  branchId?: number;
  warehouseId: number;
  productId: number;
  uomId: number;
  quantityDelta: number;
  baseQuantityDelta: number;
  unitCost?: number;
  reason: string;
}

export interface StockTransferPayload {
  organizationId?: number;
  branchId?: number;
  fromWarehouseId: number;
  toWarehouseId: number;
  lines: Array<{
    productId: number;
    uomId: number;
    quantity: number;
    baseQuantity: number;
  }>;
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

export async function fetchProducts(token: string, query?: string) {
  const path = query?.trim()
    ? `/api/products/search?q=${encodeURIComponent(query.trim())}`
    : "/api/products";

  return apiRequest<PageResponse<ProductResponse>>(path, {
    method: "GET",
    token,
  });
}

export async function createProduct(token: string, payload: ProductRequestPayload) {
  return apiRequest<ProductResponse>("/api/products", {
    method: "POST",
    token,
    idempotencyKey: createIdempotencyKey("product:create", payload),
    body: JSON.stringify(payload),
  });
}

export async function fetchWarehouses(token: string) {
  return apiRequest<WarehouseResponse[]>("/api/warehouses/active", {
    method: "GET",
    token,
  });
}

export async function fetchStoreProducts(token: string, organizationId: number) {
  return erpRequest<StoreProductResponse[]>(
    `/api/erp/products?organizationId=${organizationId}`,
    token,
  );
}

export async function createStoreProduct(token: string, payload: CreateStoreProductPayload) {
  return erpRequest<StoreProductResponse>("/api/erp/products", token, {
    method: "POST",
    idempotencyKey: createIdempotencyKey("erp-store-product:create", payload),
    body: JSON.stringify(payload),
  });
}

export async function fetchInventoryBalancesByWarehouse(
  token: string,
  organizationId: number,
  warehouseId: number,
) {
  return erpRequest<InventoryBalanceResponse[]>(
    `/api/erp/inventory-balances/warehouse/${warehouseId}?organizationId=${organizationId}`,
    token,
  );
}

export async function postManualAdjustment(token: string, payload: ManualAdjustmentPayload) {
  return erpRequest("/api/erp/inventory-operations/adjustments/manual", token, {
    method: "POST",
    idempotencyKey: createIdempotencyKey("erp-stock-adjustment:create", payload),
    body: JSON.stringify(payload),
  });
}

export async function createStockTransfer(token: string, payload: StockTransferPayload) {
  return erpRequest("/api/erp/inventory-operations/transfers", token, {
    method: "POST",
    idempotencyKey: createIdempotencyKey("erp-stock-transfer:create", payload),
    body: JSON.stringify(payload),
  });
}
