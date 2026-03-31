import { AlertCircle, CirclePlus, ReceiptText, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth";
import { fetchStoreProducts, fetchWarehouses, type StoreProductResponse, type WarehouseResponse } from "../inventory/api";
import {
  createPurchaseReceipt,
  fetchPurchaseOrder,
  fetchPurchaseOrders,
  fetchPurchaseReceipts,
  fetchSupplierCatalog,
  fetchSupplierSummaries,
  type PurchasableStoreProductResponse,
  type PurchaseOrderDetailResponse,
  type PurchaseOrderSummaryResponse,
  type PurchaseReceiptSummaryResponse,
  type SupplierSummaryResponse,
} from "./api";

interface ReceiptLineDraft {
  purchaseOrderLineId?: string;
  productId: string;
  supplierProductId: string;
  uomId?: string;
  quantity: string;
  unitCost: string;
}

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(value ?? 0);
}

export function PurchaseReceipts() {
  const { token, user } = useAuth();
  const [receipts, setReceipts] = useState<PurchaseReceiptSummaryResponse[]>([]);
  const [orders, setOrders] = useState<PurchaseOrderSummaryResponse[]>([]);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<PurchaseOrderDetailResponse | null>(null);
  const [suppliers, setSuppliers] = useState<SupplierSummaryResponse[]>([]);
  const [products, setProducts] = useState<StoreProductResponse[]>([]);
  const [supplierCatalogProducts, setSupplierCatalogProducts] = useState<PurchasableStoreProductResponse[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseResponse[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [purchaseOrderId, setPurchaseOrderId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [remarks, setRemarks] = useState("");
  const [lines, setLines] = useState<ReceiptLineDraft[]>([{ productId: "", supplierProductId: "", quantity: "1", unitCost: "" }]);
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
        const [receiptsResponse, ordersResponse, suppliersResponse, productsResponse, warehouseResponse] = await Promise.all([
          fetchPurchaseReceipts(token, user.organizationId),
          fetchPurchaseOrders(token, user.organizationId),
          fetchSupplierSummaries(token, user.organizationId),
          fetchStoreProducts(token, user.organizationId),
          fetchWarehouses(token),
        ]);
        setReceipts(receiptsResponse);
        setOrders(ordersResponse);
        setSuppliers(suppliersResponse);
        setProducts(productsResponse.filter((product) => product.isActive));
        setWarehouses(warehouseResponse.filter((warehouse) => warehouse.isActive));
        if (suppliersResponse[0]) setSupplierId(String(suppliersResponse[0].id));
        const preferredWarehouse = warehouseResponse.find((warehouse) => warehouse.isPrimary) ?? warehouseResponse[0];
        if (preferredWarehouse) {
          setWarehouseId(preferredWarehouse.id.toString());
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load purchase receipts.");
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

  useEffect(() => {
    async function loadOrderDetail() {
      if (!token || !purchaseOrderId) {
        setSelectedOrderDetail(null);
        setLines([{ productId: "", supplierProductId: "", quantity: "1", unitCost: "" }]);
        return;
      }
      try {
        const detail = await fetchPurchaseOrder(token, Number(purchaseOrderId));
        setSelectedOrderDetail(detail);
        setLines(
          detail.lines.map((line) => ({
            purchaseOrderLineId: String(line.id),
            productId: String(line.productId),
            supplierProductId: String(line.supplierProductId ?? ""),
            uomId: String(line.uomId),
            quantity: String(line.quantity),
            unitCost: String(line.unitValue ?? ""),
          })),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load purchase order details.");
      }
    }
    void loadOrderDetail();
  }, [purchaseOrderId, token]);

  const supplierOrders = useMemo(() => orders.filter((order) => !supplierId || order.supplierId === Number(supplierId)), [orders, supplierId]);
  const filteredReceipts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return receipts.filter((receipt) => !query || receipt.receiptNumber.toLowerCase().includes(query) || receipt.status.toLowerCase().includes(query));
  }, [receipts, searchTerm]);
  const selectedSupplier = useMemo(
    () => suppliers.find((supplier) => supplier.id === Number(supplierId)) ?? null,
    [supplierId, suppliers],
  );

  async function handleCreateReceipt(event: React.FormEvent<HTMLFormElement>) {
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
      const unitCost = Number(line.unitCost);
      const resolvedUomId = line.uomId ? Number(line.uomId) : product?.baseUomId;
      return product && supplierCatalogProduct && resolvedUomId && quantity > 0 && unitCost >= 0
        ? {
            purchaseOrderLineId: line.purchaseOrderLineId ? Number(line.purchaseOrderLineId) : undefined,
            productId: product.id,
            supplierProductId: supplierCatalogProduct.supplierProductId,
            uomId: resolvedUomId,
            quantity,
            baseQuantity: quantity,
            unitCost,
          }
        : null;
    }).filter((line): line is NonNullable<typeof line> => Boolean(line));
    if (!supplierId || !warehouseId || normalizedLines.length === 0) {
      setError("Supplier, warehouse, and at least one valid line are required.");
      return;
    }
    setIsSubmitting(true);
    setError("");
    setSuccessMessage("");
    try {
      await createPurchaseReceipt(token, {
        organizationId: user.organizationId,
        branchId: user.defaultBranchId,
        warehouseId: Number(warehouseId),
        purchaseOrderId: purchaseOrderId ? Number(purchaseOrderId) : undefined,
        supplierId: Number(supplierId),
        receiptDate,
        dueDate,
        placeOfSupplyStateCode: selectedSupplier?.stateCode ?? undefined,
        remarks: remarks.trim() || undefined,
        lines: normalizedLines,
      });
      setReceipts(await fetchPurchaseReceipts(token, user.organizationId));
      setSuccessMessage("Purchase receipt created and inventory updated.");
      setLines([{ productId: "", supplierProductId: "", quantity: "1", unitCost: "" }]);
      setRemarks("");
      setPurchaseOrderId("");
      setSelectedOrderDetail(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create purchase receipt.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function updateLine(index: number, field: keyof ReceiptLineDraft, value: string) {
    setLines((current) => current.map((line, i) => (i === index ? { ...line, [field]: value } : line)));
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Purchases</div>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">Purchase Receipts</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">Live ERP purchase receipts from `/api/erp/purchases/receipts`, with direct receipt creation.</p>
      </section>
      <section className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <form onSubmit={handleCreateReceipt} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3"><div className="rounded-2xl bg-slate-100 p-3 text-slate-700"><CirclePlus className="h-5 w-5" /></div><div><div className="text-lg font-semibold text-slate-950">Create Receipt</div><div className="text-sm text-slate-500">Direct ERP purchase receipt flow</div></div></div>
          <div className="mt-6 space-y-4">
            <select value={supplierId} onChange={(e) => { setSupplierId(e.target.value); setPurchaseOrderId(""); setSelectedOrderDetail(null); setLines([{ productId: "", supplierProductId: "", quantity: "1", unitCost: "" }]); }} className="crm-select"><option value="">Select supplier</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select>
            <select value={purchaseOrderId} onChange={(e) => setPurchaseOrderId(e.target.value)} className="crm-select"><option value="">Without purchase order</option>{supplierOrders.map((order) => <option key={order.id} value={order.id}>{order.poNumber}</option>)}</select>
            <div className="grid gap-4 md:grid-cols-3"><select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className="crm-select"><option value="">Select warehouse</option>{warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name} ({warehouse.code})</option>)}</select><input type="date" value={receiptDate} onChange={(e) => setReceiptDate(e.target.value)} className="crm-field" /><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="crm-field" /></div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Posting branch: <span className="font-medium text-slate-950">#{user?.defaultBranchId ?? "-"}</span>
              {" · "}
              Place of supply: <span className="font-medium text-slate-950">{selectedSupplier?.stateCode || "Derived when supplier has a state code"}</span>
            </div>
            {selectedOrderDetail ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Receiving against PO <span className="font-medium">{selectedOrderDetail.poNumber}</span>. The backend will post inventory movements for the received lines.</div> : null}
            {lines.map((line, index) => (
              <div key={index} className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-[minmax(0,1.4fr)_90px_110px_40px]">
                <select value={line.supplierProductId} onChange={(e) => {
                  const supplierProduct = supplierCatalogProducts.find((item) => item.supplierProductId === Number(e.target.value));
                  const product = products.find((item) => item.id === supplierProduct?.storeProductId);
                  updateLine(index, "supplierProductId", e.target.value);
                  updateLine(index, "productId", String(supplierProduct?.storeProductId ?? ""));
                  updateLine(index, "uomId", product ? String(product.baseUomId) : "");
                }} className="crm-select" disabled={Boolean(purchaseOrderId)}>
                  <option value="">Select supplier product</option>
                  {supplierCatalogProducts.map((product) => <option key={product.supplierProductId} value={product.supplierProductId}>{product.supplierProductName || product.name} ({product.supplierProductCode || product.sku})</option>)}
                </select>
                <input value={line.quantity} onChange={(e) => updateLine(index, "quantity", e.target.value)} type="number" min="0" step="0.001" className="crm-field" placeholder="Qty" />
                <input value={line.unitCost} onChange={(e) => updateLine(index, "unitCost", e.target.value)} type="number" min="0" step="0.01" className="crm-field" placeholder="Cost" />
                <button type="button" onClick={() => setLines((current) => current.length === 1 ? current : current.filter((_, i) => i !== index))} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
            <button type="button" onClick={() => setLines((current) => [...current, { productId: "", supplierProductId: "", quantity: "1", unitCost: "" }])} disabled={Boolean(purchaseOrderId)} className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-700 disabled:opacity-50"><CirclePlus className="h-4 w-4" />Add line</button>
            <input value={remarks} onChange={(e) => setRemarks(e.target.value)} className="crm-field" placeholder="Remarks" />
            {(error || successMessage) && <div className="space-y-3">{error && <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"><AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" /><span>{error}</span></div>}{successMessage && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{successMessage}</div>}</div>}
            <button type="submit" disabled={isSubmitting || isLoading} className="w-full rounded-full bg-slate-950 px-4 py-3 text-sm font-medium text-white disabled:opacity-60">{isSubmitting ? "Creating..." : "Create purchase receipt"}</button>
          </div>
        </form>
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="relative"><Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search receipt number or status" className="crm-field pl-11" /></div>
          <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200"><div className="hidden grid-cols-[1fr_0.9fr_0.9fr_0.8fr] gap-4 bg-slate-50 px-5 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 lg:grid"><div>Receipt</div><div>Date</div><div>Total</div><div>Status</div></div><div className="divide-y divide-slate-200">{isLoading ? <div className="px-6 py-16 text-center text-sm text-slate-500">Loading purchase receipts...</div> : filteredReceipts.length > 0 ? filteredReceipts.map((receipt) => <div key={receipt.id} className="grid gap-4 px-5 py-5 lg:grid-cols-[1fr_0.9fr_0.9fr_0.8fr] lg:items-center"><div><div className="text-base font-semibold text-slate-950">{receipt.receiptNumber}</div><div className="mt-1 text-sm text-slate-500">Supplier #{receipt.supplierId}</div></div><div className="text-sm text-slate-600">{new Date(receipt.receiptDate).toLocaleDateString("en-IN")}</div><div className="text-sm font-medium text-slate-900">{formatCurrency(receipt.totalAmount)}</div><div><span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{receipt.status}</span></div></div>) : <div className="px-6 py-16 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500"><ReceiptText className="h-6 w-6" /></div><h2 className="mt-4 text-lg font-semibold text-slate-950">No purchase receipts yet</h2></div>}</div></div>
        </section>
      </section>
    </div>
  );
}
