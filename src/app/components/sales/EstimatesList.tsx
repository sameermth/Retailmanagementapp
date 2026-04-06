import { AlertCircle, CirclePlus, FileText, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "../../auth";
import {
  cancelQuote,
  fetchQuote,
  fetchQuotePdf,
  fetchQuotes,
  type SalesQuoteDetailResponse,
  type SalesQuoteSummaryResponse,
} from "./api";
import { DocumentDetailsDialog, formatCurrency, formatDate } from "./DocumentDetailsDialog";

export function EstimatesList() {
  const { token, user } = useAuth();
  const [quotes, setQuotes] = useState<SalesQuoteSummaryResponse[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<SalesQuoteDetailResponse | null>(null);
  const [selectedQuoteId, setSelectedQuoteId] = useState<number | null>(null);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [quotePdfUrl, setQuotePdfUrl] = useState<string | null>(null);
  const [isQuotePdfLoading, setIsQuotePdfLoading] = useState(false);
  const [quotePdfError, setQuotePdfError] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [cancelSuccess, setCancelSuccess] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(
    () => () => {
      if (quotePdfUrl) {
        URL.revokeObjectURL(quotePdfUrl);
      }
    },
    [quotePdfUrl],
  );

  useEffect(() => {
    async function loadQuotes() {
      if (!token || !user?.organizationId) {
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        setQuotes(await fetchQuotes(token, user.organizationId));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load sales quotes.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadQuotes();
  }, [token, user?.organizationId]);

  const filteredQuotes = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return quotes.filter((quote) => {
      if (!query) {
        return true;
      }

      return (
        quote.quoteNumber.toLowerCase().includes(query) ||
        quote.quoteType.toLowerCase().includes(query) ||
        quote.status.toLowerCase().includes(query)
      );
    });
  }, [quotes, searchTerm]);

  const totals = useMemo(
    () =>
      filteredQuotes.reduce(
        (summary, quote) => {
          summary.totalAmount += quote.totalAmount;
          summary.openCount += ["DRAFT", "OPEN", "PENDING"].includes(quote.status.toUpperCase()) ? 1 : 0;
          return summary;
        },
        { totalAmount: 0, openCount: 0 },
      ),
    [filteredQuotes],
  );

  async function openDetails(quoteId: number) {
    if (!token) {
      return;
    }

    if (quotePdfUrl) {
      URL.revokeObjectURL(quotePdfUrl);
      setQuotePdfUrl(null);
    }
    setQuotePdfError("");
    setCancelReason("");
    setCancelError("");
    setCancelSuccess("");
    setSelectedQuoteId(quoteId);
    setIsDetailsLoading(true);

    try {
      setSelectedQuote(await fetchQuote(token, quoteId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load quote details.");
    } finally {
      setIsDetailsLoading(false);
    }
  }

  async function loadQuotePdf() {
    if (!token || !selectedQuoteId) {
      return;
    }

    setIsQuotePdfLoading(true);
    setQuotePdfError("");

    try {
      const pdfBlob = await fetchQuotePdf(token, selectedQuoteId);
      if (quotePdfUrl) {
        URL.revokeObjectURL(quotePdfUrl);
      }
      setQuotePdfUrl(URL.createObjectURL(pdfBlob));
    } catch (err) {
      setQuotePdfError(err instanceof Error ? err.message : "Failed to load quote PDF.");
    } finally {
      setIsQuotePdfLoading(false);
    }
  }

  function printQuotePdf() {
    if (!quotePdfUrl) {
      return;
    }

    const previewWindow = window.open(quotePdfUrl, "_blank", "noopener,noreferrer");
    previewWindow?.addEventListener("load", () => previewWindow.print(), { once: true });
  }

  async function handleCancelQuote(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token || !selectedQuote || !cancelReason.trim()) {
      setCancelError("Cancellation reason is required.");
      return;
    }

    setIsCancelling(true);
    setCancelError("");
    setCancelSuccess("");

    try {
      const updatedQuote = await cancelQuote(token, selectedQuote.id, {
        organizationId: selectedQuote.organizationId,
        branchId: selectedQuote.branchId,
        reason: cancelReason.trim(),
      });
      setSelectedQuote(updatedQuote);
      if (user?.organizationId) {
        setQuotes(await fetchQuotes(token, user.organizationId));
      }
      setCancelSuccess(`Quote ${updatedQuote.quoteNumber} cancelled.`);
      setCancelReason("");
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : "Failed to cancel quote.");
    } finally {
      setIsCancelling(false);
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
            <h1 className="mt-3 text-3xl font-semibold text-slate-950">Sales Quotes</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Live ERP quotation register from `/api/erp/sales/quotes` for the active organization.
            </p>
          </div>

          <Link
            to="/sales/quotes/new"
            className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            <CirclePlus className="h-4 w-4" />
            <span>New quote</span>
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Quotes
          </div>
          <div className="mt-4 text-3xl font-semibold text-slate-950">{filteredQuotes.length}</div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Open Quotes
          </div>
          <div className="mt-4 text-3xl font-semibold text-slate-950">{totals.openCount}</div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Quoted Value
          </div>
          <div className="mt-4 text-3xl font-semibold text-slate-950">
            {formatCurrency(totals.totalAmount)}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by quote number, type, or status"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
          />
        </div>

        {error && (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200">
          <div className="hidden grid-cols-[1fr_1fr_0.8fr_0.8fr_0.8fr_0.8fr] gap-4 bg-slate-50 px-5 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 lg:grid">
            <div>Quote</div>
            <div>Type</div>
            <div>Date</div>
            <div>Total</div>
            <div>Status</div>
            <div>Action</div>
          </div>

          <div className="divide-y divide-slate-200">
            {isLoading ? (
              <div className="px-6 py-16 text-center text-sm text-slate-500">Loading quotes...</div>
            ) : filteredQuotes.length > 0 ? (
              filteredQuotes.map((quote) => (
                <div
                  key={quote.id}
                  className="grid gap-4 px-5 py-5 lg:grid-cols-[1fr_1fr_0.8fr_0.8fr_0.8fr_0.8fr] lg:items-center"
                >
                  <div>
                    <div className="text-base font-semibold text-slate-950">{quote.quoteNumber}</div>
                    <div className="mt-1 text-sm text-slate-500">Customer #{quote.customerId}</div>
                  </div>
                  <div className="text-sm font-medium text-slate-900">{quote.quoteType}</div>
                  <div className="text-sm text-slate-600">
                    {new Date(quote.quoteDate).toLocaleDateString("en-IN")}
                  </div>
                  <div className="text-sm font-medium text-slate-900">
                    {formatCurrency(quote.totalAmount)}
                  </div>
                  <div>
                    <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                      {quote.status}
                    </span>
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() => void openDetails(quote.id)}
                      className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                    >
                      View details
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-6 py-16 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                  <FileText className="h-6 w-6" />
                </div>
                <h2 className="mt-4 text-lg font-semibold text-slate-950">No quotes yet</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Start with a new quote using the ERP sales quote flow.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <DocumentDetailsDialog
        open={selectedQuoteId !== null}
        onOpenChange={(open) => {
          if (!open) {
            if (quotePdfUrl) {
              URL.revokeObjectURL(quotePdfUrl);
            }
            setSelectedQuoteId(null);
            setSelectedQuote(null);
            setQuotePdfUrl(null);
            setQuotePdfError("");
            setCancelReason("");
            setCancelError("");
            setCancelSuccess("");
          }
        }}
        title={selectedQuote?.quoteNumber ?? "Quote details"}
        description="Sales quote details from the ERP quote endpoint."
        loading={isDetailsLoading}
        rows={[
          { label: "Customer", value: selectedQuote?.customerId ? `Customer #${selectedQuote.customerId}` : "-" },
          { label: "Quote Type", value: selectedQuote?.quoteType ?? "-" },
          { label: "Quote Date", value: formatDate(selectedQuote?.quoteDate) },
          { label: "Valid Until", value: formatDate(selectedQuote?.validUntil) },
          { label: "Warehouse", value: selectedQuote?.warehouseId ? `Warehouse #${selectedQuote.warehouseId}` : "-" },
          { label: "Status", value: selectedQuote?.status ?? "-" },
          { label: "Subtotal", value: formatCurrency(selectedQuote?.subtotal) },
          { label: "Tax", value: formatCurrency(selectedQuote?.taxAmount) },
          { label: "Total", value: formatCurrency(selectedQuote?.totalAmount) },
          { label: "Remarks", value: selectedQuote?.remarks ?? "-" },
        ]}
        lines={(selectedQuote?.lines ?? []).map((line) => ({
          id: line.id,
          productId: line.productId,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          lineAmount: line.lineAmount,
          remarks: line.remarks,
        }))}
        pdfUrl={quotePdfUrl}
        pdfLoading={isQuotePdfLoading}
        pdfError={quotePdfError}
        onLoadPdf={() => void loadQuotePdf()}
        onPrintPdf={printQuotePdf}
      >
        {selectedQuote && selectedQuote.status !== "CANCELLED" ? (
          <form onSubmit={handleCancelQuote} className="rounded-3xl border border-slate-200 bg-white p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Cancel Quote
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  Cancel this quote when it should no longer remain active. The backend will still block quotes that already have an active converted order or invoice.
                </div>
              </div>
              <div className="rounded-2xl bg-slate-100 px-3 py-2 text-right">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Current Status
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-950">{selectedQuote.status}</div>
              </div>
            </div>

            <label className="mt-4 block">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Cancellation Reason
              </div>
              <input
                value={cancelReason}
                onChange={(event) => setCancelReason(event.target.value)}
                className="crm-field"
                placeholder="Reason for cancelling this quote"
              />
            </label>

            {cancelError ? (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {cancelError}
              </div>
            ) : null}

            {cancelSuccess ? (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {cancelSuccess}
              </div>
            ) : null}

            <div className="mt-4 flex justify-end">
              <button
                type="submit"
                disabled={isCancelling}
                className="rounded-full bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCancelling ? "Cancelling..." : "Cancel quote"}
              </button>
            </div>
          </form>
        ) : null}
      </DocumentDetailsDialog>
    </div>
  );
}
