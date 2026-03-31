import { AlertCircle, ArrowLeft, CheckCircle2, CirclePlus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../../auth";
import type { ProductResponse } from "../inventory/api";
import { fetchProducts } from "../inventory/api";
import {
  createPurchase,
  fetchSupplierSummaries,
  type SupplierSummaryResponse,
} from "./api";

interface BillLineDraft {
  productId: string;
  quantity: string;
  unitPrice: string;
  taxRate: string;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

export function NewBill() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<SupplierSummaryResponse[]>([]);
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [shippingMethod, setShippingMethod] = useState("Road");
  const [paymentTerms, setPaymentTerms] = useState("Net 15");
  const [shippingAmount, setShippingAmount] = useState("0");
  const [discountAmount, setDiscountAmount] = useState("0");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<BillLineDraft[]>([
    { productId: "", quantity: "1", unitPrice: "", taxRate: "18" },
  ]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDependencies() {
      if (!token) {
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const [supplierResponse, productResponse] = await Promise.all([
          fetchSupplierSummaries(token),
          fetchProducts(token),
        ]);
        setSuppliers(supplierResponse);
        setProducts(productResponse.content.filter((product) => product.isActive));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load bill dependencies.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadDependencies();
  }, [token]);

  function updateLine(index: number, field: keyof BillLineDraft, value: string) {
    setLines((current) =>
      current.map((line, lineIndex) =>
        lineIndex === index ? { ...line, [field]: value } : line,
      ),
    );
  }

  function addLine() {
    setLines((current) => [...current, { productId: "", quantity: "1", unitPrice: "", taxRate: "18" }]);
  }

  function removeLine(index: number) {
    setLines((current) => (current.length === 1 ? current : current.filter((_, i) => i !== index)));
  }

  const totals = useMemo(() => {
    const subtotal = lines.reduce((sum, line) => {
      const quantity = Number(line.quantity) || 0;
      const unitPrice = Number(line.unitPrice) || 0;
      return sum + quantity * unitPrice;
    }, 0);

    return {
      subtotal,
      grandTotal: subtotal + (Number(shippingAmount) || 0) - (Number(discountAmount) || 0),
    };
  }, [lines, shippingAmount, discountAmount]);

  const lineSummaries = useMemo(() => {
    return lines.map((line) => {
      const quantity = Number(line.quantity) || 0;
      const unitPrice = Number(line.unitPrice) || 0;
      const taxRate = Number(line.taxRate) || 0;
      const subtotal = quantity * unitPrice;

      return {
        subtotal,
        total: subtotal * (1 + taxRate / 100),
      };
    });
  }, [lines]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token || !user) {
      setError("No authenticated session found.");
      return;
    }

    if (!supplierId) {
      setError("Select a supplier first.");
      return;
    }

    const normalizedLines = lines
      .map((line) => ({
        productId: Number(line.productId),
        quantity: Number(line.quantity),
        unitPrice: Number(line.unitPrice),
        taxRate: Number(line.taxRate),
      }))
      .filter((line) => line.productId && line.quantity > 0 && line.unitPrice > 0);

    if (normalizedLines.length === 0) {
      setError("Add at least one valid bill line.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      await createPurchase(token, {
        supplierId: Number(supplierId),
        userId: user.id,
        expectedDeliveryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        discountAmount: Number(discountAmount) || 0,
        shippingAmount: Number(shippingAmount) || 0,
        paymentTerms,
        shippingMethod,
        notes: notes.trim() || undefined,
        items: normalizedLines,
      });

      navigate("/purchases/bills");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create bill.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_380px]">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Purchases
            </div>
            <h1 className="mt-3 text-3xl font-semibold text-slate-950">New Bill</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Create a backend-backed purchase bill using live suppliers and products.
            </p>
          </div>

          <Link
            to="/purchases/bills"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to bills</span>
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-8">
          {isLoading ? (
            <div className="py-12 text-sm text-slate-500">Loading suppliers and products...</div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Supplier
                  </div>
                  <select
                    value={supplierId}
                    onChange={(event) => setSupplierId(event.target.value)}
                    className="crm-select mt-3"
                  >
                    <option value="">Select supplier</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Payment Terms
                  </div>
                  <input
                    value={paymentTerms}
                    onChange={(event) => setPaymentTerms(event.target.value)}
                    className="crm-field mt-3"
                  />
                </label>
              </div>

              <div className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-950">Bill Items</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Purchase lines now follow the same cleaner document layout as invoices.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addLine}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
                  >
                    <CirclePlus className="h-4 w-4" />
                    <span>Add line</span>
                  </button>
                </div>

                <div className="overflow-hidden rounded-[28px] border border-slate-200">
                  <div className="hidden grid-cols-[72px_minmax(0,1.4fr)_110px_150px_110px_160px_64px] gap-4 bg-slate-50 px-5 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 lg:grid">
                    <div>Line</div>
                    <div>Product</div>
                    <div>Qty</div>
                    <div>Rate</div>
                    <div>Tax</div>
                    <div>Amount</div>
                    <div />
                  </div>
                  <div className="divide-y divide-slate-200">
                    {lines.map((line, index) => (
                      <div
                        key={index}
                        className="grid gap-4 bg-white px-5 py-5 lg:grid-cols-[72px_minmax(0,1.4fr)_110px_150px_110px_160px_64px] lg:items-center"
                      >
                        <div className="text-sm font-semibold text-slate-400">#{index + 1}</div>
                        <div className="space-y-2">
                          <select
                            value={line.productId}
                            onChange={(event) => {
                              const nextProduct = products.find(
                                (product) => product.id === Number(event.target.value),
                              );
                              updateLine(index, "productId", event.target.value);
                              updateLine(
                                index,
                                "unitPrice",
                                nextProduct?.costPrice != null
                                  ? String(nextProduct.costPrice)
                                  : nextProduct
                                    ? String(nextProduct.unitPrice)
                                    : "",
                              );
                              updateLine(
                                index,
                                "taxRate",
                                nextProduct?.gstRate != null ? String(nextProduct.gstRate) : "18",
                              );
                            }}
                            className="crm-select"
                          >
                            <option value="">Select product</option>
                            {products.map((product) => (
                              <option key={product.id} value={product.id}>
                                {product.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <input
                          type="number"
                          min="1"
                          value={line.quantity}
                          onChange={(event) => updateLine(index, "quantity", event.target.value)}
                          className="crm-field"
                        />
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.unitPrice}
                          onChange={(event) => updateLine(index, "unitPrice", event.target.value)}
                          className="crm-field"
                        />
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.taxRate}
                          onChange={(event) => updateLine(index, "taxRate", event.target.value)}
                          className="crm-field"
                        />
                        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-950">
                          {formatCurrency(lineSummaries[index]?.total ?? 0)}
                        </div>
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => removeLine(index)}
                            className="rounded-full p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <label className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Shipping Method
                  </div>
                  <input
                    value={shippingMethod}
                    onChange={(event) => setShippingMethod(event.target.value)}
                    className="crm-field mt-3"
                  />
                </label>
                <label className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Shipping Amount
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={shippingAmount}
                    onChange={(event) => setShippingAmount(event.target.value)}
                    className="crm-field mt-3"
                  />
                </label>
                <label className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Discount Amount
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={discountAmount}
                    onChange={(event) => setDiscountAmount(event.target.value)}
                    className="crm-field mt-3"
                  />
                </label>
              </div>

              <label className="block rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Notes
                </div>
                <textarea
                  rows={4}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  className="crm-textarea mt-3 resize-none"
                />
              </label>

              {error && (
                <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 pt-6">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{isSubmitting ? "Saving..." : "Save bill"}</span>
                </button>
              </div>
            </>
          )}
        </form>
      </section>

      <aside className="space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Summary
          </div>
          <div className="mt-5 space-y-4 text-sm text-slate-600">
            <div className="flex items-center justify-between">
              <span>Subtotal</span>
              <span className="font-medium text-slate-900">{formatCurrency(totals.subtotal)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Shipping</span>
              <span className="font-medium text-slate-900">
                {formatCurrency(Number(shippingAmount) || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Discount</span>
              <span className="font-medium text-slate-900">
                {formatCurrency(Number(discountAmount) || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-slate-200 pt-4 text-base">
              <span className="font-semibold text-slate-900">Estimated Total</span>
              <span className="font-semibold text-slate-900">
                {formatCurrency(totals.grandTotal)}
              </span>
            </div>
          </div>
        </section>
      </aside>
    </div>
  );
}
