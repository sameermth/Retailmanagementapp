import { AlertCircle, CirclePlus, PackageSearch, RefreshCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth";
import {
  fetchInventoryBalancesByWarehouse,
  fetchStockMovementsByWarehouse,
  fetchStoreProducts,
  fetchWarehouses,
  postManualAdjustment,
  type InventoryBalanceResponse,
  type StockMovementResponse,
  type StoreProductResponse,
  type WarehouseResponse,
} from "./api";

function formatQuantity(value: string | null | undefined) {
  const numeric = Number(value ?? 0);
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(
    Number.isFinite(numeric) ? numeric : 0,
  );
}

function formatCurrency(value: string | null | undefined) {
  const numeric = Number(value ?? 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(numeric) ? numeric : 0);
}

export function StockAdjustments() {
  const { token, user } = useAuth();
  const [products, setProducts] = useState<StoreProductResponse[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseResponse[]>([]);
  const [balances, setBalances] = useState<InventoryBalanceResponse[]>([]);
  const [movements, setMovements] = useState<StockMovementResponse[]>([]);
  const [warehouseId, setWarehouseId] = useState("");
  const [productId, setProductId] = useState("");
  const [quantityDelta, setQuantityDelta] = useState("1");
  const [unitCost, setUnitCost] = useState("");
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function loadWarehouseData(resolvedWarehouseId: number, organizationId: number, authToken: string) {
    const [balanceResponse, movementResponse] = await Promise.all([
      fetchInventoryBalancesByWarehouse(authToken, organizationId, resolvedWarehouseId),
      fetchStockMovementsByWarehouse(authToken, organizationId, resolvedWarehouseId),
    ]);
    setBalances(balanceResponse);
    setMovements(movementResponse);
  }

  useEffect(() => {
    async function loadData() {
      if (!token || !user?.organizationId) {
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const [productResponse, warehouseResponse] = await Promise.all([
          fetchStoreProducts(token, user.organizationId),
          fetchWarehouses(token, user.organizationId, user.defaultBranchId ?? undefined),
        ]);
        const activeProducts = productResponse.filter((product) => product.isActive && !product.isServiceItem);
        const activeWarehouses = warehouseResponse.filter((warehouse) => warehouse.isActive);
        const preferredWarehouse =
          activeWarehouses.find((warehouse) => warehouse.isPrimary) ?? activeWarehouses[0] ?? null;

        setProducts(activeProducts);
        setWarehouses(activeWarehouses);

        if (activeProducts[0]) {
          setProductId(String(activeProducts[0].id));
        }

        if (preferredWarehouse) {
          setWarehouseId(String(preferredWarehouse.id));
          await loadWarehouseData(preferredWarehouse.id, user.organizationId, token);
        } else {
          setBalances([]);
          setMovements([]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load stock adjustments.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadData();
  }, [token, user?.organizationId]);

  useEffect(() => {
    async function refreshWarehouseData() {
      if (!token || !user?.organizationId || !warehouseId) {
        return;
      }

      try {
        await loadWarehouseData(Number(warehouseId), user.organizationId, token);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load warehouse stock data.");
      }
    }

    void refreshWarehouseData();
  }, [token, user?.organizationId, warehouseId]);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === Number(productId)) ?? null,
    [productId, products],
  );

  const productBalance = useMemo(
    () => balances.find((balance) => balance.productId === Number(productId)) ?? null,
    [balances, productId],
  );

  const movementRows = useMemo(
    () => movements.filter((movement) => movement.productId === Number(productId)).slice(0, 6),
    [movements, productId],
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !user?.organizationId || !user.defaultBranchId || !selectedProduct || !warehouseId) {
      setError("Warehouse, product, and branch context are required.");
      return;
    }

    const delta = Number(quantityDelta);
    if (!Number.isFinite(delta) || delta === 0) {
      setError("Enter a non-zero quantity delta.");
      return;
    }

    if (!reason.trim()) {
      setError("Adjustment reason is required.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setSuccessMessage("");

    try {
      await postManualAdjustment(token, {
        organizationId: user.organizationId,
        branchId: user.defaultBranchId,
        warehouseId: Number(warehouseId),
        productId: selectedProduct.id,
        uomId: selectedProduct.baseUomId,
        quantityDelta: delta,
        baseQuantityDelta: delta,
        unitCost: unitCost ? Number(unitCost) : undefined,
        reason: reason.trim(),
      });
      setSuccessMessage("Manual stock adjustment posted.");
      setQuantityDelta("1");
      setUnitCost("");
      setReason("");
      await loadWarehouseData(Number(warehouseId), user.organizationId, token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post manual adjustment.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Inventory</div>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">Stock Adjustments</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          This screen uses the live ERP inventory operations flow for manual adjustments, along with
          warehouse balance and stock movement queries for context.
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-[520px_minmax(0,1fr)] 2xl:grid-cols-[560px_minmax(0,1fr)]">
        <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
              <CirclePlus className="h-5 w-5" />
            </div>
            <div>
              <div className="text-lg font-semibold text-slate-950">Post Adjustment</div>
              <div className="text-sm text-slate-500">ERP manual adjustment flow</div>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <select value={warehouseId} onChange={(event) => setWarehouseId(event.target.value)} className="crm-select">
              <option value="">Select warehouse</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name} ({warehouse.code})
                </option>
              ))}
            </select>

            <select value={productId} onChange={(event) => setProductId(event.target.value)} className="crm-select">
              <option value="">Select product</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} ({product.sku})
                </option>
              ))}
            </select>

            <div className="grid gap-4 md:grid-cols-2">
              <input
                value={quantityDelta}
                onChange={(event) => setQuantityDelta(event.target.value)}
                type="number"
                step="0.001"
                className="crm-field"
                placeholder="Quantity delta"
              />
              <input
                value={unitCost}
                onChange={(event) => setUnitCost(event.target.value)}
                type="number"
                step="0.01"
                min="0"
                className="crm-field"
                placeholder="Unit cost (optional)"
              />
            </div>

            <input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="crm-field"
              placeholder="Reason"
            />

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Posting branch: <span className="font-medium text-slate-950">#{user?.defaultBranchId ?? "-"}</span>
              {" · "}
              UOM: <span className="font-medium text-slate-950">{selectedProduct?.baseUomId ?? "-"}</span>
            </div>

            {(error || successMessage) && (
              <div className="space-y-3">
                {error ? (
                  <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                ) : null}
                {successMessage ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {successMessage}
                  </div>
                ) : null}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="w-full rounded-full bg-slate-950 px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
            >
              {isSubmitting ? "Posting..." : "Post stock adjustment"}
            </button>
          </div>
        </form>

        <section className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Selected Stock Snapshot</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Warehouse balances from `/api/erp/inventory-balances/warehouse/{'{warehouseId}'}`
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  token && user?.organizationId && warehouseId
                    ? void loadWarehouseData(Number(warehouseId), user.organizationId, token)
                    : undefined
                }
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <RefreshCcw className="h-4 w-4" />
                Refresh
              </button>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">On Hand</div>
                <div className="mt-3 text-2xl font-semibold text-slate-950">
                  {formatQuantity(productBalance?.onHandBaseQuantity)}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Reserved</div>
                <div className="mt-3 text-2xl font-semibold text-slate-950">
                  {formatQuantity(productBalance?.reservedBaseQuantity)}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Available</div>
                <div className="mt-3 text-2xl font-semibold text-slate-950">
                  {formatQuantity(productBalance?.availableBaseQuantity)}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              <PackageSearch className="h-4 w-4" />
              Recent Movements For Selected Product
            </div>
            <div className="mt-5 space-y-3">
              {movementRows.length > 0 ? (
                movementRows.map((movement) => (
                  <div key={movement.id} className="rounded-2xl border border-slate-200 px-4 py-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-sm font-medium text-slate-900">{movement.movementType}</div>
                        <div className="mt-1 text-sm text-slate-500">
                          {movement.referenceType || "Adjustment"} {movement.referenceNumber ? `· ${movement.referenceNumber}` : ""}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-slate-900">
                          {formatQuantity(movement.baseQuantity)}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">{movement.direction}</div>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                      {new Date(movement.movementAt).toLocaleString("en-IN")}
                      {" · "}
                      {formatCurrency(movement.totalCost)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-slate-500">No stock movements returned for the selected product and warehouse.</div>
              )}
            </div>
          </div>
        </section>
      </section>
    </div>
  );
}
