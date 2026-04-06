import { Loader2, ScanLine, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth";
import { ApiError } from "../../lib/api";
import {
  fetchProductScan,
  fetchWarehouses,
  type ProductScanResponse,
  type WarehouseResponse,
} from "./api";

function formatQuantity(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return Number(value).toLocaleString("en-IN", { maximumFractionDigits: 3 });
}

export function ScanAndTrack() {
  const { token, user } = useAuth();
  const [query, setQuery] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [warehouses, setWarehouses] = useState<WarehouseResponse[]>([]);
  const [result, setResult] = useState<ProductScanResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadWarehouses() {
      if (!token) {
        return;
      }

      try {
        if (!user?.organizationId) {
          return;
        }
        const warehouseResponse = await fetchWarehouses(token, user.organizationId, user.defaultBranchId ?? undefined);
        setWarehouses(warehouseResponse);
        const preferredWarehouse = warehouseResponse.find((entry) => entry.isPrimary) ?? warehouseResponse[0];
        if (preferredWarehouse) {
          setWarehouseId(String(preferredWarehouse.id));
        }
      } catch {
        setWarehouses([]);
      }
    }

    void loadWarehouses();
  }, [token, user?.organizationId, user?.defaultBranchId]);

  const stockCards = useMemo(() => {
    if (!result?.stock) {
      return [];
    }

    return [
      { label: "On hand", value: formatQuantity(result.stock.onHandBaseQuantity) },
      { label: "Reserved", value: formatQuantity(result.stock.reservedBaseQuantity) },
      { label: "Available", value: formatQuantity(result.stock.availableBaseQuantity) },
    ];
  }, [result]);

  async function handleScan(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token || !user?.organizationId || !query.trim()) {
      setError("Enter a barcode, SKU, batch number, or serial number first.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetchProductScan(
        token,
        user.organizationId,
        query.trim(),
        warehouseId ? Number(warehouseId) : undefined,
      );
      setResult(response);
    } catch (caught) {
      setResult(null);
      setError(
        caught instanceof ApiError
          ? caught.message
          : "We could not resolve that scan query right now.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Inventory
        </div>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">Scan and Track</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Resolve scanned product codes, serial numbers, and batch numbers through the ERP scan
          endpoint, with optional warehouse-specific stock context.
        </p>
      </section>

      <form onSubmit={handleScan} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_auto]">
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Scan query</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="crm-field pl-11"
                placeholder="SKU, barcode, serial number, or batch number"
              />
            </div>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Warehouse context</span>
            <select
              value={warehouseId}
              onChange={(event) => setWarehouseId(event.target.value)}
              className="crm-field"
            >
              <option value="">All warehouses</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-slate-950 px-5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />}
              <span>{loading ? "Scanning" : "Resolve scan"}</span>
            </button>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}
      </form>

      {result ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Match Result
            </div>
            <div className="mt-3 text-sm text-slate-500">Matched by {result.matchedBy || "Unknown"}</div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Store Product
                </div>
                <div className="mt-2 text-lg font-semibold text-slate-950">
                  {result.storeProduct?.name ?? "-"}
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  SKU {result.storeProduct?.sku ?? "-"} · Product ID {result.storeProduct?.productId ?? "-"}
                </div>
                <div className="mt-2 text-sm text-slate-600">
                  Tracking mode: {result.storeProduct?.inventoryTrackingMode ?? "-"}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Shared Product
                </div>
                <div className="mt-2 text-lg font-semibold text-slate-950">
                  {result.product?.name ?? "-"}
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  {result.product?.categoryName ?? "-"} · {result.product?.brandName ?? "-"}
                </div>
                <div className="mt-2 text-sm text-slate-600">
                  HSN {result.product?.hsnCode ?? "-"}
                </div>
              </div>
            </div>

            {result.serial ? (
              <div className="mt-4 rounded-2xl border border-slate-200 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Serial Match
                </div>
                <div className="mt-2 text-sm text-slate-900">
                  {result.serial.serialNumber} · {result.serial.status}
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  Current warehouse: {result.serial.currentWarehouseId ?? "-"} · Customer: {result.serial.currentCustomerId ?? "-"}
                </div>
              </div>
            ) : null}

            {result.batch ? (
              <div className="mt-4 rounded-2xl border border-slate-200 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Batch Match
                </div>
                <div className="mt-2 text-sm text-slate-900">
                  {result.batch.batchNumber} · {result.batch.status}
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  Manufactured {result.batch.manufacturedOn ?? "-"} · Expiry {result.batch.expiryOn ?? "-"}
                </div>
              </div>
            ) : null}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Stock Snapshot
            </div>
            <div className="mt-2 text-sm text-slate-500">
              Warehouse {result.stock?.warehouseId ?? "All"}
            </div>
            <div className="mt-5 space-y-3">
              {stockCards.map((card) => (
                <div key={card.label} className="rounded-2xl bg-slate-50 px-4 py-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {card.label}
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-slate-950">{card.value}</div>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
