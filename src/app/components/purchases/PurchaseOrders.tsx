import { AlertCircle, CirclePlus, Search, ShoppingBasket, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth";
import { fetchStoreProducts, type StoreProductResponse } from "../inventory/api";
import {
  createPurchaseOrder,
  fetchSupplierCatalog,
  fetchPurchaseOrders,
  fetchSupplierSummaries,
  type PurchasableStoreProductResponse,
  type PurchaseOrderSummaryResponse,
  type SupplierSummaryResponse,
} from "./api";

interface PurchaseOrderLineDraft {
  productId: string;
  supplierProductId: string;
  quantity: string;
  unitPrice: string;
}

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(value ?? 0);
}

export function PurchaseOrders() {
  const { token, user } = useAuth();
  const [orders, setOrders] = useState<PurchaseOrderSummaryResponse[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierSummaryResponse[]>([]);
  const [products, setProducts] = useState<StoreProductResponse[]>([]);
  const [supplierCatalogProducts, setSupplierCatalogProducts] = useState<PurchasableStoreProductResponse[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [poDate, setPoDate] = useState(new Date().toISOString().slice(0, 10));
  const [remarks, setRemarks] = useState("");
  const [lines, setLines] = useState<PurchaseOrderLineDraft[]>([{ productId: "", supplierProductId: "", quantity: "1", unitPrice: "" }]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    async function loadData() {
      if (!token || !user?.organizationId) return;
      setIsLoading(true);
      setError("");
      try {
        const [ordersResponse, suppliersResponse, productsResponse] = await Promise.all([
          fetchPurchaseOrders(token, user.organizationId),
          fetchSupplierSummaries(token, user.organizationId),
          fetchStoreProducts(token, user.organizationId),
        ]);
        setOrders(ordersResponse);
        setSuppliers(suppliersResponse);
        setProducts(productsResponse.filter((product) => product.isActive));
        if (suppliersResponse[0]) setSupplierId(String(suppliersResponse[0].id));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load purchase orders.");
      } finally {
        setIsLoading(false);
      }
    }
    void loadData();
  }, [token, user?.organizationId]);

  useEffect(() => {
    async function loadSupplierCatalog() {
      if (!token || !user?.organizationId || !supplierId) {
        setSupplierCatalogProducts([]);
        return;
      }
      try {
        const response = await fetchSupplierCatalog(token, user.organizationId, Number(supplierId));
        setSupplierCatalogProducts(response.products);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load supplier catalog.");
      }
    }
    void loadSupplierCatalog();
  }, [supplierId, token, user?.organizationId]);

  const filteredOrders = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return orders.filter((order) => !query || order.poNumber.toLowerCase().includes(query) || order.status.toLowerCase().includes(query));
  }, [orders, searchTerm]);

  const selectedSupplier = useMemo(
    () => suppliers.find((supplier) => supplier.id === Number(supplierId)) ?? null,
    [supplierId, suppliers],
  );

  async function handleCreateOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !user?.organizationId || !user.defaultBranchId) {
      setError("Organization or branch context is missing in the current session.");
      return;
    }
    const normalizedLines = lines.map((line) => {
      const product = products.find((item) => item.id === Number(line.productId));
      const supplierCatalogProduct = supplierCatalogProducts.find(
        (item) => item.supplierProductId === Number(line.supplierProductId),
      );
      const quantity = Number(line.quantity);
      const unitPrice = Number(line.unitPrice);
      return product && supplierCatalogProduct && quantity > 0 && unitPrice >= 0
        ? {
            productId: product.id,
            supplierProductId: supplierCatalogProduct.supplierProductId,
            uomId: product.baseUomId,
            quantity,
            baseQuantity: quantity,
            unitPrice,
          }
        : null;
    }).filter((line): line is NonNullable<typeof line> => Boolean(line));
    if (!supplierId || normalizedLines.length === 0) {
      setError("Supplier and at least one valid line are required.");
      return;
    }
    setIsSubmitting(true);
    setError("");
    setSuccessMessage("");
    try {
      await createPurchaseOrder(token, {
        organizationId: user.organizationId,
        branchId: user.defaultBranchId,
        supplierId: Number(supplierId),
        poDate,
        placeOfSupplyStateCode: selectedSupplier?.stateCode ?? undefined,
        remarks: remarks.trim() || undefined,
        lines: normalizedLines,
      });
      setOrders(await fetchPurchaseOrders(token, user.organizationId));
      setSuccessMessage("Purchase order created.");
      setLines([{ productId: "", supplierProductId: "", quantity: "1", unitPrice: "" }]);
      setRemarks("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create purchase order.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Purchases</div>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">Purchase Orders</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">Live ERP purchase orders from `/api/erp/purchases/orders`, with direct order creation.</p>
      </section>
      <section className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <form onSubmit={handleCreateOrder} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3"><div className="rounded-2xl bg-slate-100 p-3 text-slate-700"><CirclePlus className="h-5 w-5" /></div><div><div className="text-lg font-semibold text-slate-950">Create Purchase Order</div><div className="text-sm text-slate-500">Direct ERP purchase order flow</div></div></div>
          <div className="mt-6 space-y-4">
            <select value={supplierId} onChange={(e) => { setSupplierId(e.target.value); setLines([{ productId: "", supplierProductId: "", quantity: "1", unitPrice: "" }]); }} className="crm-select">
              <option value="">Select supplier</option>
              {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
            </select>
            <input type="date" value={poDate} onChange={(e) => setPoDate(e.target.value)} className="crm-field" />
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Posting branch: <span className="font-medium text-slate-950">#{user?.defaultBranchId ?? "-"}</span>
              {" · "}
              Place of supply: <span className="font-medium text-slate-950">{selectedSupplier?.stateCode || "Derived when supplier has a state code"}</span>
            </div>
            {lines.map((line, index) => (
              <div key={index} className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-[minmax(0,1.4fr)_90px_110px_40px]">
                <select value={line.supplierProductId} onChange={(e) => {
                  const supplierProduct = supplierCatalogProducts.find((item) => item.supplierProductId === Number(e.target.value));
                  updateLine(index, "supplierProductId", e.target.value);
                  updateLine(index, "productId", String(supplierProduct?.storeProductId ?? ""));
                }} className="crm-select">
                  <option value="">Select supplier product</option>
                  {supplierCatalogProducts.map((product) => <option key={product.supplierProductId} value={product.supplierProductId}>{product.supplierProductName || product.name} ({product.supplierProductCode || product.sku})</option>)}
                </select>
                <input value={line.quantity} onChange={(e) => updateLine(index, "quantity", e.target.value)} type="number" min="0" step="0.001" className="crm-field" placeholder="Qty" />
                <input value={line.unitPrice} onChange={(e) => updateLine(index, "unitPrice", e.target.value)} type="number" min="0" step="0.01" className="crm-field" placeholder="Cost" />
                <button type="button" onClick={() => setLines((current) => current.length === 1 ? current : current.filter((_, i) => i !== index))} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
            <button type="button" onClick={() => setLines((current) => [...current, { productId: "", supplierProductId: "", quantity: "1", unitPrice: "" }])} className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-700"><CirclePlus className="h-4 w-4" />Add line</button>
            <input value={remarks} onChange={(e) => setRemarks(e.target.value)} className="crm-field" placeholder="Remarks" />
            {(error || successMessage) && <div className="space-y-3">{error && <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"><AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" /><span>{error}</span></div>}{successMessage && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{successMessage}</div>}</div>}
            <button type="submit" disabled={isSubmitting || isLoading} className="w-full rounded-full bg-slate-950 px-4 py-3 text-sm font-medium text-white disabled:opacity-60">{isSubmitting ? "Creating..." : "Create purchase order"}</button>
          </div>
        </form>
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="relative"><Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search PO number or status" className="crm-field pl-11" /></div>
          <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200"><div className="hidden grid-cols-[1fr_0.9fr_0.9fr_0.8fr] gap-4 bg-slate-50 px-5 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 lg:grid"><div>PO</div><div>Date</div><div>Total</div><div>Status</div></div><div className="divide-y divide-slate-200">{isLoading ? <div className="px-6 py-16 text-center text-sm text-slate-500">Loading purchase orders...</div> : filteredOrders.length > 0 ? filteredOrders.map((order) => <div key={order.id} className="grid gap-4 px-5 py-5 lg:grid-cols-[1fr_0.9fr_0.9fr_0.8fr] lg:items-center"><div><div className="text-base font-semibold text-slate-950">{order.poNumber}</div><div className="mt-1 text-sm text-slate-500">Supplier #{order.supplierId}</div></div><div className="text-sm text-slate-600">{new Date(order.poDate).toLocaleDateString("en-IN")}</div><div className="text-sm font-medium text-slate-900">{formatCurrency(order.totalAmount)}</div><div><span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{order.status}</span></div></div>) : <div className="px-6 py-16 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500"><ShoppingBasket className="h-6 w-6" /></div><h2 className="mt-4 text-lg font-semibold text-slate-950">No purchase orders yet</h2></div>}</div></div>
        </section>
      </section>
    </div>
  );

  function updateLine(index: number, field: keyof PurchaseOrderLineDraft, value: string) {
    setLines((current) => current.map((line, i) => (i === index ? { ...line, [field]: value } : line)));
  }
}
