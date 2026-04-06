import { AlertCircle, ArrowRightLeft, CirclePlus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "../../auth";
import {
  createStockTransfer,
  fetchStoreProducts,
  fetchWarehouses,
  type StockTransferPayload,
  type StoreProductResponse,
  type WarehouseResponse,
} from "./api";

interface TransferLineDraft {
  productId: string;
  quantity: string;
}

export function StockTransfers() {
  const { token, user } = useAuth();
  const [products, setProducts] = useState<StoreProductResponse[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseResponse[]>([]);
  const [fromWarehouseId, setFromWarehouseId] = useState("");
  const [toWarehouseId, setToWarehouseId] = useState("");
  const [lines, setLines] = useState<TransferLineDraft[]>([{ productId: "", quantity: "1" }]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    async function loadProducts() {
      if (!token || !user?.organizationId) return;
      setIsLoading(true);
      setError("");
      try {
        const [productsResponse, warehouseResponse] = await Promise.all([
          fetchStoreProducts(token, user.organizationId),
          fetchWarehouses(token, user.organizationId, user.defaultBranchId ?? undefined),
        ]);
        setProducts(productsResponse.filter((product) => product.isActive));
        setWarehouses(warehouseResponse.filter((warehouse) => warehouse.isActive));
        const preferredFrom = warehouseResponse.find((warehouse) => warehouse.isPrimary) ?? warehouseResponse[0];
        const preferredTo = warehouseResponse.find((warehouse) => warehouse.id !== preferredFrom?.id) ?? warehouseResponse[1] ?? warehouseResponse[0];
        if (preferredFrom) {
          setFromWarehouseId(preferredFrom.id.toString());
        }
        if (preferredTo) {
          setToWarehouseId(preferredTo.id.toString());
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load products for stock transfer.");
      } finally {
        setIsLoading(false);
      }
    }
    void loadProducts();
  }, [token, user?.organizationId]);

  function updateLine(index: number, field: keyof TransferLineDraft, value: string) {
    setLines((current) => current.map((line, i) => (i === index ? { ...line, [field]: value } : line)));
  }

  async function handleCreateTransfer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !user?.organizationId || !user.defaultBranchId) {
      setError("Organization or branch context is missing in the current session.");
      return;
    }
    const normalizedLines = lines.map((line) => {
      const product = products.find((item) => item.id === Number(line.productId));
      const quantity = Number(line.quantity);
      return product && quantity > 0
        ? { productId: product.id, uomId: product.baseUomId, quantity, baseQuantity: quantity }
        : null;
    }).filter((line): line is NonNullable<StockTransferPayload["lines"][number]> => Boolean(line));
    if (!fromWarehouseId || !toWarehouseId || normalizedLines.length === 0) {
      setError("From warehouse, to warehouse, and at least one line are required.");
      return;
    }
    if (fromWarehouseId === toWarehouseId) {
      setError("Choose different source and destination warehouses.");
      return;
    }
    setIsSubmitting(true);
    setError("");
    setSuccessMessage("");
    try {
      await createStockTransfer(token, {
        organizationId: user.organizationId,
        branchId: user.defaultBranchId,
        fromWarehouseId: Number(fromWarehouseId),
        toWarehouseId: Number(toWarehouseId),
        lines: normalizedLines,
      });
      setSuccessMessage("Stock transfer created successfully.");
      setLines([{ productId: "", quantity: "1" }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create stock transfer.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Inventory</div>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">Stock Transfers</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">Post warehouse-to-warehouse stock transfers through `/api/erp/inventory-operations/transfers`.</p>
      </section>
      <form onSubmit={handleCreateTransfer} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3"><div className="rounded-2xl bg-slate-100 p-3 text-slate-700"><ArrowRightLeft className="h-5 w-5" /></div><div><div className="text-lg font-semibold text-slate-950">Create Transfer</div><div className="text-sm text-slate-500">Direct ERP stock transfer flow</div></div></div>
        <div className="mt-6 space-y-4">
          <div className="grid gap-4 md:grid-cols-2"><select value={fromWarehouseId} onChange={(e) => setFromWarehouseId(e.target.value)} className="crm-select"><option value="">From warehouse</option>{warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name} ({warehouse.code})</option>)}</select><select value={toWarehouseId} onChange={(e) => setToWarehouseId(e.target.value)} className="crm-select"><option value="">To warehouse</option>{warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name} ({warehouse.code})</option>)}</select></div>
          {lines.map((line, index) => (
            <div key={index} className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-[minmax(0,1.4fr)_110px_40px]">
              <select value={line.productId} onChange={(e) => updateLine(index, "productId", e.target.value)} className="crm-select"><option value="">Select product</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name} ({product.sku})</option>)}</select>
              <input value={line.quantity} onChange={(e) => updateLine(index, "quantity", e.target.value)} type="number" min="0" step="0.001" className="crm-field" placeholder="Qty" />
              <button type="button" onClick={() => setLines((current) => current.length === 1 ? current : current.filter((_, i) => i !== index))} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
          <button type="button" onClick={() => setLines((current) => [...current, { productId: "", quantity: "1" }])} className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-700"><CirclePlus className="h-4 w-4" />Add line</button>
          {(error || successMessage) && <div className="space-y-3">{error && <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"><AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" /><span>{error}</span></div>}{successMessage && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{successMessage}</div>}</div>}
          <button type="submit" disabled={isSubmitting || isLoading} className="w-full rounded-full bg-slate-950 px-4 py-3 text-sm font-medium text-white disabled:opacity-60">{isSubmitting ? "Creating..." : "Create stock transfer"}</button>
        </div>
      </form>
    </div>
  );
}
