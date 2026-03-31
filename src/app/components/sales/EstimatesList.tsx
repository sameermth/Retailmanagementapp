import { AlertCircle, CirclePlus, FileText, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "../../auth";
import { fetchQuotes, type SalesQuoteSummaryResponse } from "./api";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

export function EstimatesList() {
  const { token, user } = useAuth();
  const [quotes, setQuotes] = useState<SalesQuoteSummaryResponse[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

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
          <div className="hidden grid-cols-[1fr_1fr_0.8fr_0.8fr_0.8fr] gap-4 bg-slate-50 px-5 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 lg:grid">
            <div>Quote</div>
            <div>Type</div>
            <div>Date</div>
            <div>Total</div>
            <div>Status</div>
          </div>

          <div className="divide-y divide-slate-200">
            {isLoading ? (
              <div className="px-6 py-16 text-center text-sm text-slate-500">Loading quotes...</div>
            ) : filteredQuotes.length > 0 ? (
              filteredQuotes.map((quote) => (
                <div
                  key={quote.id}
                  className="grid gap-4 px-5 py-5 lg:grid-cols-[1fr_1fr_0.8fr_0.8fr_0.8fr] lg:items-center"
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
    </div>
  );
}
