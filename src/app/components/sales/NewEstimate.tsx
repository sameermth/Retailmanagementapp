import type { FormEvent } from "react";
import { AlertCircle, ArrowLeft, CirclePlus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../../auth";
import { fetchWarehouses, type WarehouseResponse } from "../inventory/api";
import {
  createQuote,
  fetchSalesCustomers,
  fetchStoreProductsForSales,
  type SalesCustomerSummary,
  type StoreProductOption,
} from "./api";

interface QuoteLineDraft {
  productId: string;
  quantity: string;
  unitPrice: string;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

export function NewEstimate() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<SalesCustomerSummary[]>([]);
  const [products, setProducts] = useState<StoreProductOption[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseResponse[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [quoteType, setQuoteType] = useState("QUOTATION");
  const [quoteDate, setQuoteDate] = useState(new Date().toISOString().slice(0, 10));
  const [validUntil, setValidUntil] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  );
  const [remarks, setRemarks] = useState("");
  const [lines, setLines] = useState<QuoteLineDraft[]>([{ productId: "", quantity: "1", unitPrice: "" }]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDependencies() {
      if (!token || !user?.organizationId) {
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const [customerResponse, productResponse, warehouseResponse] = await Promise.all([
          fetchSalesCustomers(token, user.organizationId),
          fetchStoreProductsForSales(token, user.organizationId),
          fetchWarehouses(token),
        ]);

        setCustomers(customerResponse.filter((customer) => customer.status !== "INACTIVE"));
        setProducts(productResponse.filter((product) => product.isActive));
        setWarehouses(warehouseResponse.filter((warehouse) => warehouse.isActive));
        const preferredWarehouse = warehouseResponse.find((warehouse) => warehouse.isPrimary) ?? warehouseResponse[0];
        if (preferredWarehouse) {
          setWarehouseId(preferredWarehouse.id.toString());
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load quote dependencies.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadDependencies();
  }, [token, user?.organizationId]);

  function updateLine(index: number, field: keyof QuoteLineDraft, value: string) {
    setLines((current) =>
      current.map((line, lineIndex) => (lineIndex === index ? { ...line, [field]: value } : line)),
    );
  }

  function addLine() {
    setLines((current) => [...current, { productId: "", quantity: "1", unitPrice: "" }]);
  }

  function removeLine(index: number) {
    setLines((current) => (current.length === 1 ? current : current.filter((_, i) => i !== index)));
  }

  const totals = useMemo(
    () =>
      lines.reduce(
        (summary, line) => {
          const quantity = Number(line.quantity) || 0;
          const unitPrice = Number(line.unitPrice) || 0;
          summary.total += quantity * unitPrice;
          return summary;
        },
        { total: 0 },
      ),
    [lines],
  );

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === Number(customerId)) ?? null,
    [customerId, customers],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token || !user?.organizationId || !user.defaultBranchId) {
      setError("Organization or branch context is missing in the current session.");
      return;
    }

    if (!customerId || !warehouseId) {
      setError("Customer and warehouse are required.");
      return;
    }

    const normalizedLines = lines
      .map((line) => {
        const product = products.find((item) => item.id === Number(line.productId));
        const quantity = Number(line.quantity);
        const unitPrice = Number(line.unitPrice);

        if (!product || !quantity || quantity <= 0) {
          return null;
        }

        return {
          productId: product.id,
          uomId: product.baseUomId,
          quantity,
          baseQuantity: quantity,
          unitPrice: unitPrice > 0 ? unitPrice : undefined,
          remarks: product.inventoryTrackingMode,
        };
      })
      .filter((line): line is NonNullable<typeof line> => line !== null);

    if (normalizedLines.length === 0) {
      setError("Add at least one valid quote line.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      await createQuote(token, {
        organizationId: user.organizationId,
        branchId: user.defaultBranchId,
        warehouseId: Number(warehouseId),
        customerId: Number(customerId),
        quoteType,
        quoteDate,
        validUntil,
        placeOfSupplyStateCode: selectedCustomer?.stateCode ?? undefined,
        remarks: remarks.trim() || undefined,
        lines: normalizedLines,
      });

      navigate("/sales/quotes");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create sales quote.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Sales
            </div>
            <h1 className="mt-3 text-3xl font-semibold text-slate-950">New Sales Quote</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Backend-aligned quote builder for `/api/erp/sales/quotes`.
            </p>
          </div>

          <Link
            to="/sales/quotes"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to quotes</span>
          </Link>
        </div>
      </section>

      <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_380px]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          {isLoading ? (
            <div className="py-12 text-sm text-slate-500">Loading customers and products...</div>
          ) : (
            <div className="space-y-8">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <label className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Customer
                  </div>
                  <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="crm-select mt-3">
                    <option value="">Select customer</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.fullName}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Warehouse
                  </div>
                  <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className="crm-select mt-3">
                    <option value="">Select warehouse</option>
                    {warehouses.map((warehouse) => (
                      <option key={warehouse.id} value={warehouse.id}>
                        {warehouse.name} ({warehouse.code})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Quote Type
                  </div>
                  <select value={quoteType} onChange={(e) => setQuoteType(e.target.value)} className="crm-select mt-3">
                    <option value="QUOTATION">Quotation</option>
                    <option value="ESTIMATE">Estimate</option>
                  </select>
                </label>

                <label className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Quote Date
                  </div>
                  <input type="date" value={quoteDate} onChange={(e) => setQuoteDate(e.target.value)} className="crm-field mt-3" />
                </label>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-600">
                Posting branch: <span className="font-medium text-slate-950">#{user?.defaultBranchId ?? "-"}</span>
                {" · "}
                Place of supply: <span className="font-medium text-slate-950">{selectedCustomer?.stateCode || "Derived when customer has a state code"}</span>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Valid Until
                  </div>
                  <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className="crm-field mt-3" />
                </label>

                <label className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Remarks
                  </div>
                  <input value={remarks} onChange={(e) => setRemarks(e.target.value)} className="crm-field mt-3" placeholder="Optional quote notes" />
                </label>
              </div>

              <div className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-950">Quote Lines</h2>
                    <p className="mt-1 text-sm text-slate-500">Each line maps directly to `CreateSalesDocumentLineRequest`.</p>
                  </div>
                  <button type="button" onClick={addLine} className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-100">
                    <CirclePlus className="h-4 w-4" />
                    <span>Add line</span>
                  </button>
                </div>

                {lines.map((line, index) => {
                  const selectedProduct = products.find((item) => item.id === Number(line.productId));

                  return (
                    <div key={`${index}-${line.productId}`} className="grid gap-4 rounded-3xl border border-slate-200 bg-slate-50/70 p-4 md:grid-cols-[minmax(0,1.5fr)_120px_140px_44px] md:items-end">
                      <label>
                        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Product</div>
                        <select
                          value={line.productId}
                          onChange={(e) => {
                            const productId = e.target.value;
                            const product = products.find((item) => item.id === Number(productId));
                            updateLine(index, "productId", productId);
                            updateLine(index, "unitPrice", String(product?.defaultSalePrice ?? ""));
                          }}
                          className="crm-select"
                        >
                          <option value="">Select product</option>
                          {products.map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.name} ({product.sku})
                            </option>
                          ))}
                        </select>
                        {selectedProduct && (
                          <div className="mt-2 text-xs text-slate-500">
                            UOM #{selectedProduct.baseUomId} · Tracking {selectedProduct.inventoryTrackingMode}
                          </div>
                        )}
                      </label>

                      <label>
                        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Qty</div>
                        <input value={line.quantity} onChange={(e) => updateLine(index, "quantity", e.target.value)} type="number" min="0" step="0.001" className="crm-field" />
                      </label>

                      <label>
                        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Unit Price</div>
                        <input value={line.unitPrice} onChange={(e) => updateLine(index, "unitPrice", e.target.value)} type="number" min="0" step="0.01" className="crm-field" />
                      </label>

                      <button type="button" onClick={() => removeLine(index)} className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:bg-white hover:text-rose-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        <aside className="space-y-5">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Summary</div>
            <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
              <span>Line value</span>
              <span className="font-semibold text-slate-950">{formatCurrency(totals.total)}</span>
            </div>
          </section>

          {error && (
            <div className="flex items-start gap-3 rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button type="submit" disabled={isSubmitting || isLoading} className="w-full rounded-full bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
            {isSubmitting ? "Creating quote..." : "Create sales quote"}
          </button>
        </aside>
      </form>
    </div>
  );
}
