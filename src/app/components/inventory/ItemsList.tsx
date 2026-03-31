import {
  AlertCircle,
  AlertTriangle,
  CirclePlus,
  Package2,
  Search,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "../../auth";
import {
  fetchInventoryBalancesByWarehouse,
  fetchStoreProducts,
  fetchWarehouses,
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

export function ItemsList() {
  const { token, user } = useAuth();
  const [items, setItems] = useState<StoreProductResponse[]>([]);
  const [balances, setBalances] = useState<InventoryBalanceResponse[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseResponse[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<StockFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const organizationId = user?.organizationId ?? 1;

  useEffect(() => {
    async function loadInventoryPage() {
      if (!token) {
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const warehouseList = await fetchWarehouses(token);
        setWarehouses(warehouseList);

        const preferredWarehouse =
          warehouseList.find((warehouse) => warehouse.isPrimary) ?? warehouseList[0] ?? null;
        const resolvedWarehouseId = selectedWarehouseId
          ? Number(selectedWarehouseId)
          : preferredWarehouse?.id;

        if (!selectedWarehouseId && preferredWarehouse) {
          setSelectedWarehouseId(preferredWarehouse.id.toString());
        }

        const storeProducts = await fetchStoreProducts(token, organizationId);
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
  }, [token, organizationId]);

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
                          {isLowStock && (
                            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              <span>Low stock at selected warehouse</span>
                            </div>
                          )}
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
    </div>
  );
}
