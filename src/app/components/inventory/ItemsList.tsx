import {
  AlertCircle,
  AlertTriangle,
  CirclePlus,
  Link2,
  Package2,
  Search,
  SquarePen,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "../../auth";
import {
  createSupplierProduct,
  fetchStoreProductSupplierPreference,
  fetchSupplierProducts,
  fetchSupplierSummaries,
  upsertStoreProductSupplierPreference,
  type SupplierProductResponse,
  type SupplierSummaryResponse,
} from "../purchases/api";
import {
  fetchStoreProduct,
  fetchInventoryBalancesByWarehouse,
  fetchStoreProducts,
  fetchWarehouses,
  updateStoreProduct,
  type InventoryBalanceResponse,
  type StoreProductResponse,
  type WarehouseResponse,
} from "./api";

type StockFilter = "all" | "active" | "inactive" | "low-stock" | "service";

function formatQuantity(value: string | null | undefined) {
  if (!value) {
    return "0";
  }

  const numeric = Number(value);
  return Number.isFinite(numeric)
    ? new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(numeric)
    : value;
}

function getAvailableQuantity(balance: InventoryBalanceResponse | undefined) {
  return Number(balance?.availableBaseQuantity ?? 0);
}

function getReorderLevel(item: StoreProductResponse) {
  return Number(item.reorderLevelBaseQty ?? 0);
}

interface SupplierLinkDraft {
  supplierId: string;
  supplierProductCode: string;
  supplierProductName: string;
  priority: string;
  isPreferred: boolean;
}

interface StoreProductEditDraft {
  sku: string;
  name: string;
  description: string;
  minStockBaseQty: string;
  reorderLevelBaseQty: string;
  defaultSalePrice: string;
  defaultWarrantyMonths: string;
  warrantyTerms: string;
  isActive: boolean;
  isServiceItem: boolean;
}

export function ItemsList() {
  const { token, user, hasAnyPermission } = useAuth();
  const [items, setItems] = useState<StoreProductResponse[]>([]);
  const [balances, setBalances] = useState<InventoryBalanceResponse[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseResponse[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierSummaryResponse[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<StockFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedItem, setSelectedItem] = useState<StoreProductResponse | null>(null);
  const [supplierProducts, setSupplierProducts] = useState<SupplierProductResponse[]>([]);
  const [preferenceSupplierProductId, setPreferenceSupplierProductId] = useState<number | null>(null);
  const [supplierLink, setSupplierLink] = useState<SupplierLinkDraft>({
    supplierId: "",
    supplierProductCode: "",
    supplierProductName: "",
    priority: "1",
    isPreferred: true,
  });
  const [supplierLinkError, setSupplierLinkError] = useState("");
  const [isSavingSupplierLink, setIsSavingSupplierLink] = useState(false);
  const [editingItem, setEditingItem] = useState<StoreProductResponse | null>(null);
  const [editDraft, setEditDraft] = useState<StoreProductEditDraft | null>(null);
  const [editError, setEditError] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const organizationId = user?.organizationId ?? 1;
  const canManageSupplierLinks = hasAnyPermission(["purchase.create", "purchase.manage"]);
  const canManageCatalog = hasAnyPermission(["catalog.manage"]);

  useEffect(() => {
    async function loadInventoryPage() {
      if (!token) {
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const [warehouseList, storeProducts, supplierList] = await Promise.all([
          fetchWarehouses(token, organizationId, user?.defaultBranchId ?? undefined),
          fetchStoreProducts(token, organizationId),
          canManageSupplierLinks ? fetchSupplierSummaries(token, organizationId) : Promise.resolve([]),
        ]);
        setWarehouses(warehouseList);
        setSuppliers(supplierList);

        const preferredWarehouse =
          warehouseList.find((warehouse) => warehouse.isPrimary) ?? warehouseList[0] ?? null;
        const resolvedWarehouseId = selectedWarehouseId
          ? Number(selectedWarehouseId)
          : preferredWarehouse?.id;

        if (!selectedWarehouseId && preferredWarehouse) {
          setSelectedWarehouseId(preferredWarehouse.id.toString());
        }

        setItems(storeProducts);

        if (resolvedWarehouseId) {
          const warehouseBalances = await fetchInventoryBalancesByWarehouse(
            token,
            organizationId,
            resolvedWarehouseId,
          );
          setBalances(warehouseBalances);
        } else {
          setBalances([]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load ERP items.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadInventoryPage();
  }, [token, organizationId, user?.defaultBranchId]);

  useEffect(() => {
    async function loadBalances() {
      if (!token || !selectedWarehouseId) {
        return;
      }

      try {
        const warehouseBalances = await fetchInventoryBalancesByWarehouse(
          token,
          organizationId,
          Number(selectedWarehouseId),
        );
        setBalances(warehouseBalances);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load warehouse balances.");
      }
    }

    void loadBalances();
  }, [token, organizationId, selectedWarehouseId]);

  useEffect(() => {
    async function loadSupplierContext() {
      if (!token || !selectedItem || !canManageSupplierLinks) {
        setSupplierProducts([]);
        setPreferenceSupplierProductId(null);
        setSupplierLink({
          supplierId: "",
          supplierProductCode: "",
          supplierProductName: selectedItem?.name ?? "",
          priority: "1",
          isPreferred: true,
        });
        return;
      }

      setSupplierLinkError("");
      try {
        const preference = await fetchStoreProductSupplierPreference(
          token,
          organizationId,
          selectedItem.id,
        ).catch(() => null);
        setPreferenceSupplierProductId(preference?.supplierProductId ?? null);
      } catch {
        setPreferenceSupplierProductId(null);
      }
    }

    void loadSupplierContext();
  }, [canManageSupplierLinks, organizationId, selectedItem, token]);

  useEffect(() => {
    async function loadSupplierProducts() {
      if (!token || !selectedItem || !supplierLink.supplierId) {
        setSupplierProducts([]);
        return;
      }

      try {
        const response = await fetchSupplierProducts(
          token,
          organizationId,
          Number(supplierLink.supplierId),
        );
        setSupplierProducts(response.filter((item) => item.productId === (selectedItem.productId ?? 0)));
      } catch (err) {
        setSupplierProducts([]);
        setSupplierLinkError(err instanceof Error ? err.message : "Failed to load supplier product links.");
      }
    }

    void loadSupplierProducts();
  }, [organizationId, selectedItem, supplierLink.supplierId, token]);

  const balanceMap = useMemo(
    () => new Map(balances.map((balance) => [balance.productId, balance])),
    [balances],
  );

  const filteredItems = items.filter((item) => {
    const normalizedQuery = searchTerm.trim().toLowerCase();
    const matchesSearch =
      normalizedQuery.length === 0 ||
      item.name.toLowerCase().includes(normalizedQuery) ||
      item.sku.toLowerCase().includes(normalizedQuery) ||
      item.description?.toLowerCase().includes(normalizedQuery);

    const availableQty = getAvailableQuantity(balanceMap.get(item.id));
    const reorderLevel = getReorderLevel(item);
    const isLowStock = !item.isServiceItem && reorderLevel > 0 && availableQty <= reorderLevel;
    const matchesFilter =
      filter === "all" ||
      (filter === "active" && item.isActive) ||
      (filter === "inactive" && !item.isActive) ||
      (filter === "service" && item.isServiceItem) ||
      (filter === "low-stock" && isLowStock);

    return matchesSearch && matchesFilter;
  });

  const lowStockCount = items.filter((item) => {
    if (item.isServiceItem) {
      return false;
    }

    const availableQty = getAvailableQuantity(balanceMap.get(item.id));
    const reorderLevel = getReorderLevel(item);
    return reorderLevel > 0 && availableQty <= reorderLevel;
  }).length;

  async function handleCreateSupplierLink() {
    if (!token || !selectedItem || !supplierLink.supplierId || !selectedItem.productId) {
      setSupplierLinkError("Select a supplier first. Shared product linkage must exist on the store product.");
      return;
    }

    setIsSavingSupplierLink(true);
    setSupplierLinkError("");

    try {
      const linkedSupplierProduct = await createSupplierProduct(
        token,
        organizationId,
        Number(supplierLink.supplierId),
        {
          productId: selectedItem.productId,
          supplierProductCode: supplierLink.supplierProductCode.trim() || undefined,
          supplierProductName: supplierLink.supplierProductName.trim() || undefined,
          priority: supplierLink.priority.trim() ? Number(supplierLink.priority) : undefined,
          isPreferred: supplierLink.isPreferred,
          isActive: true,
        },
      );

      if (supplierLink.isPreferred) {
        await upsertStoreProductSupplierPreference(token, organizationId, selectedItem.id, {
          supplierId: Number(supplierLink.supplierId),
          supplierProductId: linkedSupplierProduct.id,
          isActive: true,
          remarks: "Linked from inventory item catalog",
        });
        setPreferenceSupplierProductId(linkedSupplierProduct.id);
      }

      const refreshed = await fetchSupplierProducts(
        token,
        organizationId,
        Number(supplierLink.supplierId),
      );
      setSupplierProducts(
        refreshed.filter((item) => item.productId === (selectedItem.productId ?? 0)),
      );
      setSupplierLink((current) => ({
        ...current,
        supplierProductCode: "",
        supplierProductName: selectedItem.name,
        priority: "1",
      }));
    } catch (err) {
      setSupplierLinkError(err instanceof Error ? err.message : "Failed to attach product to supplier.");
    } finally {
      setIsSavingSupplierLink(false);
    }
  }

  async function handleOpenEditItem(item: StoreProductResponse) {
    if (!token) {
      return;
    }

    setEditingItem(item);
    setEditError("");
    try {
      const detail = await fetchStoreProduct(token, item.id);
      setEditingItem(detail);
      setEditDraft({
        sku: detail.sku,
        name: detail.name,
        description: detail.description ?? "",
        minStockBaseQty: detail.minStockBaseQty ?? "",
        reorderLevelBaseQty: detail.reorderLevelBaseQty ?? "",
        defaultSalePrice:
          detail.defaultSalePrice != null ? String(detail.defaultSalePrice) : "",
        defaultWarrantyMonths:
          detail.defaultWarrantyMonths != null ? String(detail.defaultWarrantyMonths) : "",
        warrantyTerms: detail.warrantyTerms ?? "",
        isActive: detail.isActive,
        isServiceItem: detail.isServiceItem,
      });
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to load store product.");
      setEditDraft({
        sku: item.sku,
        name: item.name,
        description: item.description ?? "",
        minStockBaseQty: item.minStockBaseQty ?? "",
        reorderLevelBaseQty: item.reorderLevelBaseQty ?? "",
        defaultSalePrice: item.defaultSalePrice != null ? String(item.defaultSalePrice) : "",
        defaultWarrantyMonths:
          item.defaultWarrantyMonths != null ? String(item.defaultWarrantyMonths) : "",
        warrantyTerms: item.warrantyTerms ?? "",
        isActive: item.isActive,
        isServiceItem: item.isServiceItem,
      });
    }
  }

  function closeEditItem() {
    setEditingItem(null);
    setEditDraft(null);
    setEditError("");
    setIsSavingEdit(false);
  }

  async function handleSaveEditItem() {
    if (!token || !editingItem || !editDraft) {
      return;
    }

    setIsSavingEdit(true);
    setEditError("");

    try {
      const updated = await updateStoreProduct(token, editingItem.id, {
        organizationId,
        productId: editingItem.productId ?? undefined,
        categoryId: editingItem.categoryId,
        brandId: editingItem.brandId,
        baseUomId: editingItem.baseUomId,
        taxGroupId: editingItem.taxGroupId ?? undefined,
        sku: editDraft.sku.trim(),
        name: editDraft.name.trim(),
        description: editDraft.description.trim() || undefined,
        inventoryTrackingMode: editingItem.inventoryTrackingMode,
        serialTrackingEnabled: editingItem.serialTrackingEnabled,
        batchTrackingEnabled: editingItem.batchTrackingEnabled,
        expiryTrackingEnabled: editingItem.expiryTrackingEnabled,
        fractionalQuantityAllowed: editingItem.fractionalQuantityAllowed,
        minStockBaseQty: editDraft.minStockBaseQty.trim()
          ? Number(editDraft.minStockBaseQty)
          : undefined,
        reorderLevelBaseQty: editDraft.reorderLevelBaseQty.trim()
          ? Number(editDraft.reorderLevelBaseQty)
          : undefined,
        defaultSalePrice: editDraft.defaultSalePrice.trim()
          ? Number(editDraft.defaultSalePrice)
          : undefined,
        defaultWarrantyMonths: editDraft.defaultWarrantyMonths.trim()
          ? Number(editDraft.defaultWarrantyMonths)
          : undefined,
        warrantyTerms: editDraft.warrantyTerms.trim() || undefined,
        isServiceItem: editDraft.isServiceItem,
        isActive: editDraft.isActive,
        attributes:
          editingItem.attributes?.map((attribute) => ({
            attributeDefinitionId: attribute.attributeDefinitionId,
            valueText: attribute.valueText ?? undefined,
            valueNumber: attribute.valueNumber != null ? Number(attribute.valueNumber) : undefined,
            valueBoolean: attribute.valueBoolean ?? undefined,
            valueDate: attribute.valueDate ?? undefined,
            valueOptionId: attribute.valueOptionId ?? undefined,
            valueJson: attribute.valueJson ?? undefined,
          })) ?? [],
      });

      setItems((current) =>
        current.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)),
      );
      closeEditItem();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to update store product.");
    } finally {
      setIsSavingEdit(false);
    }
  }

  const trackedStockItems = items.filter((item) => !item.isServiceItem).length;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Store Products
          </div>
          <div className="mt-3 text-3xl font-semibold text-slate-950">{items.length}</div>
          <p className="mt-2 text-sm text-slate-600">
            Store-level products attached to the current organization in the ERP catalog.
          </p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Stock Tracked
          </div>
          <div className="mt-3 text-3xl font-semibold text-slate-950">{trackedStockItems}</div>
          <p className="mt-2 text-sm text-slate-600">
            Goods that hold balances at the warehouse level.
          </p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Low Stock
          </div>
          <div className="mt-3 text-3xl font-semibold text-amber-600">{lowStockCount}</div>
          <p className="mt-2 text-sm text-slate-600">
            Derived from ERP reorder levels and the selected warehouse balances.
          </p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
            Quick Action
          </div>
          <div className="mt-3 text-2xl font-semibold">Create a new store product</div>
          <p className="mt-2 text-sm text-slate-300">
            Save the item master for this organization, then seed stock separately.
          </p>
          <Link
            to="/inventory/items/new"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-slate-100"
          >
            <CirclePlus className="h-4 w-4" />
            <span>New item</span>
          </Link>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-950">Items</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              This inventory screen now follows the ERP backend model: store products are listed
              from the catalog service, and warehouse stock is queried separately from inventory
              balances.
            </p>
          </div>
          <Link
            to="/inventory/items/new"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            <CirclePlus className="h-4 w-4" />
            <span>New item</span>
          </Link>
        </div>

        <div className="mt-6 flex flex-col gap-4 xl:flex-row xl:items-center">
          <div className="relative block flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by item name, SKU, or description"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
            />
          </div>

          <select
            value={selectedWarehouseId}
            onChange={(event) => setSelectedWarehouseId(event.target.value)}
            className="crm-select min-w-[220px]"
          >
            <option value="">All warehouses</option>
            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id.toString()}>
                {warehouse.name} ({warehouse.code})
              </option>
            ))}
          </select>

          <div className="flex flex-wrap gap-2">
            {([
              ["all", "All Items"],
              ["active", "Active"],
              ["inactive", "Inactive"],
              ["low-stock", "Low Stock"],
              ["service", "Services"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={`rounded-full px-4 py-2 text-sm transition ${
                  filter === value
                    ? "bg-slate-950 text-white"
                    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {lowStockCount > 0 && (
          <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50/70 p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
              <AlertTriangle className="h-4 w-4" />
              <span>Warehouse stock watchlist</span>
            </div>
            <div className="mt-3 grid gap-3 xl:grid-cols-3">
              {items
                .filter((item) => {
                  const balance = balanceMap.get(item.id);
                  const availableQty = getAvailableQuantity(balance);
                  const reorderLevel = getReorderLevel(item);
                  return !item.isServiceItem && reorderLevel > 0 && availableQty <= reorderLevel;
                })
                .slice(0, 3)
                .map((item) => {
                  const balance = balanceMap.get(item.id);
                  return (
                    <div key={item.id} className="rounded-2xl bg-white px-4 py-3 text-sm">
                      <div className="font-medium text-slate-900">{item.name}</div>
                      <div className="mt-1 text-slate-500">{item.sku}</div>
                      <div className="mt-2 text-slate-700">
                        Available {formatQuantity(balance?.availableBaseQuantity)} / Reorder{" "}
                        {formatQuantity(item.reorderLevelBaseQty)}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200">
          <div className="hidden grid-cols-[minmax(0,1.8fr)_0.85fr_0.9fr_0.8fr_0.8fr_0.9fr] gap-4 bg-slate-50 px-5 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 lg:grid">
            <div>Item</div>
            <div>Status</div>
            <div>Tracking</div>
            <div>Available</div>
            <div>Reorder</div>
            <div>Flags</div>
          </div>

          <div className="divide-y divide-slate-200">
            {isLoading ? (
              <div className="px-6 py-16 text-center text-sm text-slate-500">Loading items...</div>
            ) : filteredItems.length > 0 ? (
              filteredItems.map((item) => {
                const balance = balanceMap.get(item.id);
                const availableQty = getAvailableQuantity(balance);
                const reorderLevel = getReorderLevel(item);
                const isLowStock = !item.isServiceItem && reorderLevel > 0 && availableQty <= reorderLevel;

                return (
                  <div
                    key={item.id}
                    className="grid gap-4 px-5 py-5 lg:grid-cols-[minmax(0,1.8fr)_0.85fr_0.9fr_0.8fr_0.8fr_0.9fr] lg:items-center"
                  >
                    <div className="min-w-0">
                      <div className="flex items-start gap-3">
                        <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
                          <Package2 className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-base font-semibold text-slate-950">
                            {item.name}
                          </div>
                          <div className="mt-1 text-sm text-slate-500">
                            {item.sku} · Category #{item.categoryId} · Brand #{item.brandId}
                          </div>
                          {item.description && (
                            <div className="mt-2 text-sm text-slate-600">{item.description}</div>
                          )}
                          <div className="mt-2 text-sm text-slate-500">
                            {item.categoryName || `Category #${item.categoryId}`} · {item.brandName || `Brand #${item.brandId}`}
                          </div>
                          {isLowStock && (
                            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              <span>Low stock at selected warehouse</span>
                            </div>
                          )}
                          {canManageSupplierLinks ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedItem(item);
                                  setSupplierLink({
                                    supplierId: "",
                                    supplierProductCode: "",
                                    supplierProductName: item.name,
                                    priority: "1",
                                    isPreferred: true,
                                  });
                                  setSupplierLinkError("");
                                }}
                                className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                              >
                                <Link2 className="h-3.5 w-3.5" />
                                <span>Attach supplier</span>
                              </button>
                              {canManageCatalog ? (
                                <button
                                  type="button"
                                  onClick={() => void handleOpenEditItem(item)}
                                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                                >
                                  <SquarePen className="h-3.5 w-3.5" />
                                  <span>Edit item</span>
                                </button>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="text-sm text-slate-700">
                      <span
                        className={`rounded-full px-3 py-1 ${
                          item.isActive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {item.isActive ? "active" : "inactive"}
                      </span>
                    </div>
                    <div className="text-sm font-medium text-slate-900">
                      {item.inventoryTrackingMode}
                    </div>
                    <div className="text-sm text-slate-700">
                      {item.isServiceItem ? "Service" : formatQuantity(balance?.availableBaseQuantity)}
                    </div>
                    <div className="text-sm text-slate-700">
                      {item.isServiceItem ? "N/A" : formatQuantity(item.reorderLevelBaseQty)}
                    </div>
                    <div className="text-sm text-slate-600">
                      <div>{item.isServiceItem ? "Service item" : "Stock item"}</div>
                      <div className="mt-1">
                        {[
                          item.serialTrackingEnabled ? "Serial" : null,
                          item.batchTrackingEnabled ? "Batch" : null,
                          item.expiryTrackingEnabled ? "Expiry" : null,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "Standard"}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="px-6 py-16 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                  <Package2 className="h-6 w-6" />
                </div>
                <h2 className="mt-4 text-lg font-semibold text-slate-950">No items match this view</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Try a different search term or filter, or create a new ERP store product.
                </p>
                <Link
                  to="/inventory/items/new"
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                  <CirclePlus className="h-4 w-4" />
                  <span>Create item</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {selectedItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-5">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Supplier Attachment
                </div>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">{selectedItem.name}</h2>
                <div className="mt-2 text-sm text-slate-600">
                  {selectedItem.sku} · {selectedItem.categoryName || `Category #${selectedItem.categoryId}`} · {selectedItem.brandName || `Brand #${selectedItem.brandId}`}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {!selectedItem.productId ? (
              <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                This store product is not linked to a shared product master yet, so supplier mapping cannot be created from the backend flow.
              </div>
            ) : (
              <div className="mt-6 space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Supplier
                    </div>
                    <select
                      value={supplierLink.supplierId}
                      onChange={(event) =>
                        setSupplierLink((current) => ({ ...current, supplierId: event.target.value }))
                      }
                      className="crm-select mt-3"
                    >
                      <option value="">Select supplier</option>
                      {suppliers.map((supplier) => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.name} ({supplier.supplierCode})
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Priority
                    </div>
                    <input
                      type="number"
                      min="1"
                      value={supplierLink.priority}
                      onChange={(event) =>
                        setSupplierLink((current) => ({ ...current, priority: event.target.value }))
                      }
                      className="crm-field mt-3"
                    />
                  </label>

                  <label className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Supplier Product Code
                    </div>
                    <input
                      value={supplierLink.supplierProductCode}
                      onChange={(event) =>
                        setSupplierLink((current) => ({
                          ...current,
                          supplierProductCode: event.target.value,
                        }))
                      }
                      placeholder="Optional supplier code"
                      className="crm-field mt-3"
                    />
                  </label>

                  <label className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Supplier Product Name
                    </div>
                    <input
                      value={supplierLink.supplierProductName}
                      onChange={(event) =>
                        setSupplierLink((current) => ({
                          ...current,
                          supplierProductName: event.target.value,
                        }))
                      }
                      placeholder="Optional supplier-facing name"
                      className="crm-field mt-3"
                    />
                  </label>
                </div>

                <label className="flex items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-slate-50/70 px-4 py-4">
                  <div>
                    <span className="text-sm font-medium text-slate-700">Mark as preferred supplier path</span>
                    <div className="mt-1 text-xs text-slate-500">
                      This sets the store product supplier preference used by purchasing flows.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={supplierLink.isPreferred}
                    onChange={(event) =>
                      setSupplierLink((current) => ({ ...current, isPreferred: event.target.checked }))
                    }
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                  />
                </label>

                {supplierLinkError ? (
                  <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <span>{supplierLinkError}</span>
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => void handleCreateSupplierLink()}
                    disabled={isSavingSupplierLink}
                    className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
                  >
                    <Link2 className="h-4 w-4" />
                    <span>{isSavingSupplierLink ? "Saving..." : "Attach supplier"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedItem(null)}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                  >
                    <span>Close</span>
                  </button>
                </div>

                {supplierProducts.length > 0 ? (
                  <div className="rounded-3xl border border-slate-200">
                    <div className="grid grid-cols-[minmax(0,1.3fr)_1fr_0.7fr_0.8fr] gap-4 bg-slate-50 px-5 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      <div>Linked Supplier Product</div>
                      <div>Code</div>
                      <div>Priority</div>
                      <div>Status</div>
                    </div>
                    <div className="divide-y divide-slate-200">
                      {supplierProducts.map((product) => (
                        <div
                          key={product.id}
                          className="grid grid-cols-[minmax(0,1.3fr)_1fr_0.7fr_0.8fr] gap-4 px-5 py-4 text-sm"
                        >
                          <div className="min-w-0 font-medium text-slate-900">
                            {product.supplierProductName || selectedItem.name}
                            {preferenceSupplierProductId === product.id ? (
                              <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                                Preferred
                              </span>
                            ) : null}
                          </div>
                          <div className="truncate text-slate-600">
                            {product.supplierProductCode || "-"}
                          </div>
                          <div className="text-slate-600">{product.priority ?? "-"}</div>
                          <div className="text-slate-600">
                            {product.isActive ? "Active" : "Inactive"}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {editingItem && editDraft ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-5">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Store Product Maintenance
                </div>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">{editingItem.name}</h2>
                <div className="mt-2 text-sm text-slate-600">
                  Update store-level product data like thresholds, selling price, warranty defaults,
                  and active status.
                </div>
              </div>
              <button
                type="button"
                onClick={closeEditItem}
                className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label>
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">SKU</div>
                <input value={editDraft.sku} onChange={(e) => setEditDraft((current) => current ? { ...current, sku: e.target.value } : current)} className="crm-field uppercase" />
              </label>
              <label>
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Name</div>
                <input value={editDraft.name} onChange={(e) => setEditDraft((current) => current ? { ...current, name: e.target.value } : current)} className="crm-field" />
              </label>
              <label className="md:col-span-2">
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Description</div>
                <textarea value={editDraft.description} onChange={(e) => setEditDraft((current) => current ? { ...current, description: e.target.value } : current)} rows={3} className="crm-textarea" />
              </label>
              <label>
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Minimum Stock</div>
                <input value={editDraft.minStockBaseQty} onChange={(e) => setEditDraft((current) => current ? { ...current, minStockBaseQty: e.target.value } : current)} className="crm-field" />
              </label>
              <label>
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Reorder Level</div>
                <input value={editDraft.reorderLevelBaseQty} onChange={(e) => setEditDraft((current) => current ? { ...current, reorderLevelBaseQty: e.target.value } : current)} className="crm-field" />
              </label>
              <label>
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Default Sale Price</div>
                <input value={editDraft.defaultSalePrice} onChange={(e) => setEditDraft((current) => current ? { ...current, defaultSalePrice: e.target.value } : current)} className="crm-field" />
              </label>
              <label>
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Default Warranty Months</div>
                <input value={editDraft.defaultWarrantyMonths} onChange={(e) => setEditDraft((current) => current ? { ...current, defaultWarrantyMonths: e.target.value } : current)} className="crm-field" />
              </label>
              <label className="md:col-span-2">
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Warranty Terms</div>
                <textarea value={editDraft.warrantyTerms} onChange={(e) => setEditDraft((current) => current ? { ...current, warrantyTerms: e.target.value } : current)} rows={3} className="crm-textarea" />
              </label>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-700">
                <input type="checkbox" checked={editDraft.isActive} onChange={(e) => setEditDraft((current) => current ? { ...current, isActive: e.target.checked } : current)} />
                <span>Product active</span>
              </label>
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-700">
                <input type="checkbox" checked={editDraft.isServiceItem} onChange={(e) => setEditDraft((current) => current ? { ...current, isServiceItem: e.target.checked } : current)} />
                <span>Service item</span>
              </label>
            </div>

            {editError ? (
              <div className="mt-6 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>{editError}</span>
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void handleSaveEditItem()}
                disabled={isSavingEdit}
                className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                <SquarePen className="h-4 w-4" />
                <span>{isSavingEdit ? "Saving..." : "Save item"}</span>
              </button>
              <button
                type="button"
                onClick={closeEditItem}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                <span>Close</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
