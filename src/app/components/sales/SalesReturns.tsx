import { AlertCircle, CirclePlus, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth";
import {
  createSalesReturn,
  fetchInvoice,
  fetchInvoices,
  fetchSalesReturns,
  fetchStoreProductsForSales,
  type SalesInvoiceDetailResponse,
  type SalesInvoiceSummaryResponse,
  type SalesReturnSummaryResponse,
  type StoreProductOption,
} from "./api";

interface ReturnLineDraft {
  originalSalesInvoiceLineId: number;
  productId: number;
  maxQuantity: number;
  quantity: string;
}

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(value ?? 0);
}

export function SalesReturns() {
  const { token, user } = useAuth();
  const [returns, setReturns] = useState<SalesReturnSummaryResponse[]>([]);
  const [invoices, setInvoices] = useState<SalesInvoiceSummaryResponse[]>([]);
  const [products, setProducts] = useState<StoreProductOption[]>([]);
  const [invoiceDetail, setInvoiceDetail] = useState<SalesInvoiceDetailResponse | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [returnDate, setReturnDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState("");
  const [remarks, setRemarks] = useState("");
  const [lineDrafts, setLineDrafts] = useState<ReturnLineDraft[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInvoiceLoading, setIsInvoiceLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    async function loadData() {
      if (!token || !user?.organizationId) return;
      setIsLoading(true);
      setError("");
      try {
        const [returnsResponse, invoicesResponse, productsResponse] = await Promise.all([
          fetchSalesReturns(token, user.organizationId),
          fetchInvoices(token, user.organizationId),
          fetchStoreProductsForSales(token, user.organizationId),
        ]);
        setReturns(returnsResponse);
        setInvoices(invoicesResponse);
        setProducts(productsResponse.filter((product) => product.isActive));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load sales returns.");
      } finally {
        setIsLoading(false);
      }
    }
    void loadData();
  }, [token, user?.organizationId]);

  useEffect(() => {
    async function loadInvoiceDetail() {
      if (!token || !selectedInvoiceId) {
        setInvoiceDetail(null);
        setLineDrafts([]);
        return;
      }
      setIsInvoiceLoading(true);
      setError("");
      try {
        const detail = await fetchInvoice(token, Number(selectedInvoiceId));
        setInvoiceDetail(detail);
        setLineDrafts(
          detail.lines.map((line) => ({
            originalSalesInvoiceLineId: line.id,
            productId: line.productId,
            maxQuantity: Number(line.quantity),
            quantity: "",
          })),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load invoice details.");
      } finally {
        setIsInvoiceLoading(false);
      }
    }
    void loadInvoiceDetail();
  }, [selectedInvoiceId, token]);

  const eligibleInvoices = useMemo(
    () => invoices.filter((invoice) => invoice.status !== "CANCELLED"),
    [invoices],
  );

  function updateQuantity(lineId: number, quantity: string) {
    setLineDrafts((current) =>
      current.map((line) => {
        if (line.originalSalesInvoiceLineId !== lineId) {
          return line;
        }

        if (!quantity) {
          return { ...line, quantity: "" };
        }

        const numeric = Number(quantity);
        if (!Number.isFinite(numeric)) {
          return line;
        }

        const bounded = Math.min(Math.max(numeric, 0), line.maxQuantity);
        return { ...line, quantity: String(bounded) };
      }),
    );
  }

  async function handleCreateReturn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !user?.organizationId || !user.defaultBranchId || !invoiceDetail) {
      setError("Organization, branch, and source invoice are required.");
      return;
    }

    const invalidLine = lineDrafts.find((draft) => Number(draft.quantity) > draft.maxQuantity);
    if (invalidLine) {
      setError("One or more return quantities exceed the original invoiced quantity.");
      return;
    }

    const lines = lineDrafts
      .map((draft) => {
        const quantity = Number(draft.quantity);
        return quantity > 0
          ? {
              originalSalesInvoiceLineId: draft.originalSalesInvoiceLineId,
              quantity,
              baseQuantity: quantity,
              reason: reason.trim() || undefined,
            }
          : null;
      })
      .filter((line): line is NonNullable<typeof line> => Boolean(line));

    if (lines.length === 0) {
      setError("Add at least one return line quantity.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setSuccessMessage("");
    try {
      await createSalesReturn(token, {
        organizationId: user.organizationId,
        branchId: user.defaultBranchId,
        originalSalesInvoiceId: invoiceDetail.id,
        returnDate,
        reason: reason.trim() || undefined,
        remarks: remarks.trim() || undefined,
        lines,
      });
      const [returnsResponse, invoicesResponse] = await Promise.all([
        fetchSalesReturns(token, user.organizationId),
        fetchInvoices(token, user.organizationId),
      ]);
      setReturns(returnsResponse);
      setInvoices(invoicesResponse);
      setSuccessMessage("Sales return created.");
      setSelectedInvoiceId("");
      setInvoiceDetail(null);
      setLineDrafts([]);
      setReason("");
      setRemarks("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create sales return.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Sales</div>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">Sales Returns</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Create returns from live invoice lines through `/api/erp/returns/sales`, then review the posted return register below.
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <form onSubmit={handleCreateReturn} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-slate-100 p-3 text-slate-700"><CirclePlus className="h-5 w-5" /></div>
            <div>
              <div className="text-lg font-semibold text-slate-950">Create Sales Return</div>
              <div className="text-sm text-slate-500">Select an invoice and return against original line IDs</div>
            </div>
          </div>
          <div className="mt-6 space-y-4">
            <select value={selectedInvoiceId} onChange={(e) => setSelectedInvoiceId(e.target.value)} className="crm-select">
              <option value="">Select source invoice</option>
              {eligibleInvoices.map((invoice) => (
                <option key={invoice.id} value={invoice.id}>
                  {invoice.invoiceNumber} - Customer #{invoice.customerId}
                </option>
              ))}
            </select>
            <div className="grid gap-4 md:grid-cols-2">
              <input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} className="crm-field" />
              <input value={reason} onChange={(e) => setReason(e.target.value)} className="crm-field" placeholder="Return reason" />
            </div>
            <input value={remarks} onChange={(e) => setRemarks(e.target.value)} className="crm-field" placeholder="Remarks" />

            {isInvoiceLoading ? <div className="text-sm text-slate-500">Loading invoice lines...</div> : null}

            {invoiceDetail ? (
              <div className="space-y-3">
                {invoiceDetail.lines.map((line) => {
                  const draft = lineDrafts.find((item) => item.originalSalesInvoiceLineId === line.id);
                  const product = products.find((item) => item.id === line.productId);
                  return (
                    <div key={line.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-sm font-semibold text-slate-950">
                            {product ? `${product.name} (${product.sku})` : `Product #${line.productId}`}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">Invoice line #{line.id}</div>
                          <div className="mt-1 text-xs text-slate-500">Invoiced qty: {line.quantity}</div>
                          <div className="mt-1 text-xs text-slate-500">Max returnable: {draft?.maxQuantity ?? Number(line.quantity)}</div>
                        </div>
                        <input
                          value={draft?.quantity ?? ""}
                          onChange={(e) => updateQuantity(line.id, e.target.value)}
                          type="number"
                          min="0"
                          max={draft?.maxQuantity ?? Number(line.quantity)}
                          step="0.001"
                          className="crm-field w-28"
                          placeholder="Return qty"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                Pick an invoice to load original line references for the return.
              </div>
            )}

            {(error || successMessage) && (
              <div className="space-y-3">
                {error ? <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"><AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" /><span>{error}</span></div> : null}
                {successMessage ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{successMessage}</div> : null}
              </div>
            )}

            <button type="submit" disabled={isSubmitting || isLoading || isInvoiceLoading} className="w-full rounded-full bg-slate-950 px-4 py-3 text-sm font-medium text-white disabled:opacity-60">
              {isSubmitting ? "Creating..." : "Create sales return"}
            </button>
          </div>
        </form>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="overflow-hidden rounded-3xl border border-slate-200">
            <div className="hidden grid-cols-[1fr_0.9fr_0.9fr_0.8fr] gap-4 bg-slate-50 px-5 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 lg:grid">
              <div>Return</div><div>Date</div><div>Total</div><div>Status</div>
            </div>
            <div className="divide-y divide-slate-200">
              {isLoading ? (
                <div className="px-6 py-16 text-center text-sm text-slate-500">Loading sales returns...</div>
              ) : returns.length > 0 ? (
                returns.map((item) => (
                  <div key={item.id} className="grid gap-4 px-5 py-5 lg:grid-cols-[1fr_0.9fr_0.9fr_0.8fr] lg:items-center">
                    <div><div className="text-base font-semibold text-slate-950">{item.returnNumber}</div><div className="mt-1 text-sm text-slate-500">Original invoice #{item.originalSalesInvoiceId}</div></div>
                    <div className="text-sm text-slate-600">{new Date(item.returnDate).toLocaleDateString("en-IN")}</div>
                    <div className="text-sm font-medium text-slate-900">{formatCurrency(item.totalAmount)}</div>
                    <div><span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{item.status}</span></div>
                  </div>
                ))
              ) : (
                <div className="px-6 py-16 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500"><RotateCcw className="h-6 w-6" /></div>
                  <h2 className="mt-4 text-lg font-semibold text-slate-950">No sales returns yet</h2>
                </div>
              )}
            </div>
          </div>
        </section>
      </section>
    </div>
  );
}
