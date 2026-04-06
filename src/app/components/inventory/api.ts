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
  organizationId: number;
  branchId: number;
  code: string;
  name: string;
  isActive: boolean;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWarehousePayload {
  organizationId: number;
  branchId: number;
  code: string;
  name: string;
  isPrimary?: boolean;
  isActive?: boolean;
}

export interface UpdateWarehousePayload {
  code?: string;
  name?: string;
  isPrimary?: boolean;
  isActive?: boolean;
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
  categoryName: string | null;
  brandId: number;
  brandName: string | null;
  baseUomId: number;
  baseUomCode: string | null;
  baseUomName: string | null;
  taxGroupId: number | null;
  taxGroupCode: string | null;
  taxGroupName: string | null;
  attributes?: ProductAttributeValueResponse[];
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
  defaultWarrantyMonths: number | null;
  warrantyTerms: string | null;
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
  taxGroupId?: number;
  sku: string;
  name: string;
  description?: string;
  hsnCode?: string;
  inventoryTrackingMode: string;
  serialTrackingEnabled?: boolean;
  batchTrackingEnabled?: boolean;
  expiryTrackingEnabled?: boolean;
  fractionalQuantityAllowed?: boolean;
  minStockBaseQty?: number;
  reorderLevelBaseQty?: number;
  defaultWarrantyMonths?: number;
  warrantyTerms?: string;
  isServiceItem?: boolean;
  isActive?: boolean;
  attributes?: ProductAttributeValuePayload[];
}

export interface StoreProductSupplierLinkResponse {
  supplierId: number;
  supplierCode: string | null;
  supplierName: string | null;
  supplierProductId: number | null;
  supplierProductCode: string | null;
  supplierProductName: string | null;
  priority: number | null;
  supplierPreferred: boolean | null;
  storeProductPreferred: boolean | null;
  isActive: boolean | null;
}

export interface StoreProductSuppliersResponse {
  storeProductId: number;
  productId: number | null;
  preferredSupplierId: number | null;
  preferredSupplierProductId: number | null;
  supplierLinks: StoreProductSupplierLinkResponse[];
}

export interface UpsertStoreProductSupplierLinkPayload {
  supplierId: number;
  supplierProductId?: number;
  supplierProductCode?: string;
  supplierProductName?: string;
  priority?: number;
  isPreferred?: boolean;
  isActive?: boolean;
}

export interface UpsertStoreProductSuppliersPayload {
  supplierLinks: UpsertStoreProductSupplierLinkPayload[];
  preferredSupplierId?: number;
  preferredSupplierProductId?: number;
  preferredIsActive?: boolean;
  preferredRemarks?: string;
}

export interface CategoryOptionResponse {
  id: number;
  name: string;
  parentCategoryId: number | null;
  isActive: boolean;
}

export interface BrandOptionResponse {
  id: number;
  name: string;
  isActive: boolean;
}

export interface UomOptionResponse {
  id: number;
  code: string;
  name: string;
  uomGroupId: number | null;
  isActive: boolean;
}

export interface TaxGroupOptionResponse {
  id: number;
  code: string;
  name: string;
  cgstRate: string | null;
  sgstRate: string | null;
  igstRate: string | null;
  cessRate: string | null;
  isActive: boolean;
}

export interface HsnMasterResponse {
  id: number;
  hsnCode: string;
  description: string;
  chapterCode: string | null;
  cgstRate: string | null;
  sgstRate: string | null;
  igstRate: string | null;
  cessRate: string | null;
  isActive: boolean;
  sourceName: string | null;
  effectiveFrom: string | null;
  derivedFromDatedTaxRule: boolean;
}

export interface TaxGroupSuggestionResponse {
  hsnCode: string;
  taxGroupId: number | null;
  taxGroupCode: string | null;
  taxGroupName: string | null;
  cgstRate: string | null;
  sgstRate: string | null;
  igstRate: string | null;
  cessRate: string | null;
  effectiveFrom: string | null;
  matched: boolean;
  message: string;
}

export interface ProductAttributeOptionResponse {
  id: number;
  code: string;
  label: string;
  sortOrder: number | null;
  isActive: boolean | null;
}

export interface ProductAttributeDefinitionResponse {
  id: number;
  organizationId: number;
  code: string;
  label: string;
  description: string | null;
  dataType: string;
  inputType: string;
  isRequired: boolean;
  isActive: boolean;
  unitLabel: string | null;
  placeholder: string | null;
  helpText: string | null;
  sortOrder: number | null;
  options: ProductAttributeOptionResponse[];
  scopes: Array<{
    id: number;
    categoryId: number | null;
    brandId: number | null;
  }>;
}

export interface ProductAttributeTypeOptionResponse {
  code: string;
  label: string;
  supportsOptions: boolean;
  supportsUnitLabel: boolean;
}

export interface ProductAttributeUiConfigResponse {
  organizationId: number;
  canManage: boolean;
  dataTypes: ProductAttributeTypeOptionResponse[];
  inputTypes: ProductAttributeTypeOptionResponse[];
}

export interface ProductAttributeValuePayload {
  attributeDefinitionId: number;
  valueText?: string;
  valueNumber?: number;
  valueBoolean?: boolean;
  valueDate?: string;
  valueOptionId?: number;
  valueJson?: string;
}

export interface ProductAttributeValueResponse {
  id: number;
  attributeDefinitionId: number;
  attributeCode: string;
  attributeLabel: string;
  dataType: string;
  inputType: string;
  valueText: string | null;
  valueNumber: string | null;
  valueBoolean: boolean | null;
  valueDate: string | null;
  valueOptionId: number | null;
  valueOptionCode: string | null;
  valueOptionLabel: string | null;
  valueJson: string | null;
}

export interface CreateProductAttributeDefinitionPayload {
  organizationId: number;
  code: string;
  label: string;
  description?: string;
  dataType: string;
  inputType: string;
  isRequired?: boolean;
  isActive?: boolean;
  unitLabel?: string;
  placeholder?: string;
  helpText?: string;
  sortOrder?: number;
  options?: Array<{
    code: string;
    label: string;
    sortOrder?: number;
    isActive?: boolean;
  }>;
  scopes?: Array<{
    categoryId?: number;
    brandId?: number;
  }>;
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

export interface StockMovementResponse {
  id: number;
  organizationId: number;
  branchId: number;
  warehouseId: number;
  productId: number;
  movementType: string;
  referenceType: string | null;
  referenceId: number | null;
  referenceNumber: string | null;
  direction: string;
  uomId: number;
  quantity: string | null;
  baseQuantity: string | null;
  unitCost: string | null;
  totalCost: string | null;
  movementAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductScanResponse {
  matchedBy: string;
  storeProduct: {
    id: number;
    productId: number;
    organizationId: number;
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
    isServiceItem: boolean;
    isActive: boolean;
  } | null;
  product: {
    id: number;
    name: string;
    description: string | null;
    categoryName: string | null;
    brandName: string | null;
    hsnCode: string | null;
    baseUomId: number | null;
    inventoryTrackingMode: string | null;
  } | null;
  serial: {
    id: number;
    serialNumber: string;
    manufacturerSerialNumber: string | null;
    status: string;
    currentWarehouseId: number | null;
    currentCustomerId: number | null;
    warrantyStartDate: string | null;
    warrantyEndDate: string | null;
  } | null;
  batch: {
    id: number;
    batchNumber: string;
    manufacturerBatchNumber: string | null;
    status: string;
    manufacturedOn: string | null;
    expiryOn: string | null;
  } | null;
  stock: {
    warehouseId: number | null;
    onHandBaseQuantity: string | null;
    reservedBaseQuantity: string | null;
    availableBaseQuantity: string | null;
  } | null;
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

export async function fetchWarehouses(
  token: string,
  organizationId: number,
  branchId?: number,
) {
  const search = new URLSearchParams({ organizationId: String(organizationId) });
  if (branchId) {
    search.set("branchId", String(branchId));
  }

  return erpRequest<WarehouseResponse[]>(`/api/erp/warehouses?${search.toString()}`, token);
}

export async function createWarehouse(token: string, payload: CreateWarehousePayload) {
  return erpRequest<WarehouseResponse>("/api/erp/warehouses", token, {
    method: "POST",
    idempotencyKey: createIdempotencyKey("erp-warehouse:create", payload),
    body: JSON.stringify(payload),
  });
}

export async function updateWarehouse(
  token: string,
  organizationId: number,
  warehouseId: number,
  payload: UpdateWarehousePayload,
) {
  return erpRequest<WarehouseResponse>(
    `/api/erp/warehouses/${warehouseId}?organizationId=${organizationId}`,
    token,
    {
      method: "PUT",
      idempotencyKey: createIdempotencyKey("erp-warehouse:update", {
        organizationId,
        warehouseId,
        payload,
      }),
      body: JSON.stringify(payload),
    },
  );
}

export async function fetchStoreProducts(token: string, organizationId: number) {
  return erpRequest<StoreProductResponse[]>(
    `/api/erp/products?organizationId=${organizationId}`,
    token,
  );
}

export async function fetchStoreProduct(token: string, storeProductId: number) {
  return erpRequest<StoreProductResponse>(`/api/erp/products/${storeProductId}`, token);
}

export async function fetchCategoryOptions(
  token: string,
  organizationId: number,
  query?: string,
) {
  const search = new URLSearchParams({
    organizationId: String(organizationId),
  });

  if (query?.trim()) {
    search.set("query", query.trim());
  }

  return erpRequest<CategoryOptionResponse[]>(
    `/api/erp/catalog/categories?${search.toString()}`,
    token,
  );
}

export async function fetchBrandOptions(
  token: string,
  organizationId: number,
  query?: string,
) {
  const search = new URLSearchParams({
    organizationId: String(organizationId),
  });

  if (query?.trim()) {
    search.set("query", query.trim());
  }

  return erpRequest<BrandOptionResponse[]>(
    `/api/erp/catalog/brands?${search.toString()}`,
    token,
  );
}

export async function fetchUomOptions(token: string, query?: string) {
  const search = new URLSearchParams();

  if (query?.trim()) {
    search.set("query", query.trim());
  }

  const suffix = search.toString() ? `?${search.toString()}` : "";
  return erpRequest<UomOptionResponse[]>(`/api/erp/catalog/uoms${suffix}`, token);
}

export async function fetchTaxGroupOptions(
  token: string,
  organizationId: number,
  query?: string,
) {
  const search = new URLSearchParams({
    organizationId: String(organizationId),
  });

  if (query?.trim()) {
    search.set("query", query.trim());
  }

  return erpRequest<TaxGroupOptionResponse[]>(
    `/api/erp/catalog/tax-groups?${search.toString()}`,
    token,
  );
}

export async function fetchHsnOptions(token: string, query?: string) {
  const search = new URLSearchParams();

  if (query?.trim()) {
    search.set("query", query.trim());
  }

  const suffix = search.toString() ? `?${search.toString()}` : "";
  return erpRequest<HsnMasterResponse[]>(`/api/erp/hsn${suffix}`, token);
}

export async function fetchProductAttributeDefinitions(
  token: string,
  organizationId: number,
  categoryId?: number,
  brandId?: number,
) {
  const search = new URLSearchParams({
    organizationId: String(organizationId),
  });

  if (categoryId) {
    search.set("categoryId", String(categoryId));
  }

  if (brandId) {
    search.set("brandId", String(brandId));
  }

  return erpRequest<ProductAttributeDefinitionResponse[]>(
    `/api/erp/catalog/attributes?${search.toString()}`,
    token,
  );
}

export async function fetchProductAttributeUiConfig(token: string, organizationId: number) {
  return erpRequest<ProductAttributeUiConfigResponse>(
    `/api/erp/catalog/attributes/ui-config?organizationId=${organizationId}`,
    token,
  );
}

export async function createProductAttributeDefinition(
  token: string,
  payload: CreateProductAttributeDefinitionPayload,
) {
  return erpRequest<ProductAttributeDefinitionResponse>("/api/erp/catalog/attributes", token, {
    method: "POST",
    idempotencyKey: createIdempotencyKey("erp-product-attribute:create", payload),
    body: JSON.stringify(payload),
  });
}

export async function updateProductAttributeDefinition(
  token: string,
  attributeDefinitionId: number,
  payload: CreateProductAttributeDefinitionPayload,
) {
  return erpRequest<ProductAttributeDefinitionResponse>(
    `/api/erp/catalog/attributes/${attributeDefinitionId}`,
    token,
    {
      method: "PUT",
      idempotencyKey: createIdempotencyKey("erp-product-attribute:update", {
        attributeDefinitionId,
        payload,
      }),
      body: JSON.stringify(payload),
    },
  );
}

export async function fetchTaxGroupSuggestion(
  token: string,
  organizationId: number,
  hsnCode: string,
  effectiveDate?: string,
) {
  const search = new URLSearchParams({
    organizationId: String(organizationId),
    hsnCode: hsnCode.trim(),
  });

  if (effectiveDate?.trim()) {
    search.set("effectiveDate", effectiveDate.trim());
  }

  return erpRequest<TaxGroupSuggestionResponse>(
    `/api/erp/products/tax-group-suggestion?${search.toString()}`,
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

export async function updateStoreProduct(
  token: string,
  storeProductId: number,
  payload: CreateStoreProductPayload,
) {
  return erpRequest<StoreProductResponse>(`/api/erp/products/${storeProductId}`, token, {
    method: "PUT",
    idempotencyKey: createIdempotencyKey("erp-store-product:update", {
      storeProductId,
      payload,
    }),
    body: JSON.stringify(payload),
  });
}

export async function fetchStoreProductSuppliers(
  token: string,
  organizationId: number,
  storeProductId: number,
) {
  return erpRequest<StoreProductSuppliersResponse>(
    `/api/erp/products/${storeProductId}/suppliers?organizationId=${organizationId}`,
    token,
  );
}

export async function upsertStoreProductSuppliers(
  token: string,
  organizationId: number,
  storeProductId: number,
  payload: UpsertStoreProductSuppliersPayload,
) {
  return erpRequest<StoreProductSuppliersResponse>(
    `/api/erp/products/${storeProductId}/suppliers?organizationId=${organizationId}`,
    token,
    {
      method: "PUT",
      idempotencyKey: createIdempotencyKey("erp-store-product-suppliers:upsert", {
        organizationId,
        storeProductId,
        payload,
      }),
      body: JSON.stringify(payload),
    },
  );
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

export async function fetchStockMovementsByWarehouse(
  token: string,
  organizationId: number,
  warehouseId: number,
) {
  return erpRequest<StockMovementResponse[]>(
    `/api/erp/stock-movements/warehouse/${warehouseId}?organizationId=${organizationId}`,
    token,
  );
}

export async function fetchProductScan(
  token: string,
  organizationId: number,
  queryText: string,
  warehouseId?: number,
) {
  const search = new URLSearchParams({
    organizationId: String(organizationId),
    query: queryText,
  });

  if (warehouseId) {
    search.set("warehouseId", String(warehouseId));
  }

  return erpRequest<ProductScanResponse>(`/api/erp/products/scan?${search.toString()}`, token);
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
