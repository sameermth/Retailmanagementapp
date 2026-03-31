import { AlertCircle, CirclePlus, ReceiptText, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "../../auth";
import { fetchInvoices, type SalesInvoiceSummaryResponse } from "./api";

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value ?? 0);
}

export function InvoicesList() {
  const { token, user } = useAuth();
  const [invoices, setInvoices] = useState<SalesInvoiceSummaryResponse[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadInvoices() {
      if (!token || !user?.organizationId) {
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        setInvoices(await fetchInvoices(token, user.organizationId));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load invoices.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadInvoices();
  }, [token, user?.organizationId]);

  const filteredInvoices = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return invoices.filter((invoice) => {
      if (!query) {
        return true;
      }

      return (
        invoice.invoiceNumber.toLowerCase().includes(query) ||
        invoice.status.toLowerCase().includes(query)
      );
    });
  }, [invoices, searchTerm]);

  const totals = useMemo(
    () =>
      filteredInvoices.reduce(
        (summary, invoice) => {
          summary.totalAmount += invoice.totalAmount ?? 0;
          summary.balanceDue += invoice.outstandingAmount ?? 0;
          return summary;
        },
        { totalAmount: 0, balanceDue: 0 },
      ),
    [filteredInvoices],
  );

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Sales
            </div>
            <h1 className="mt-3 text-3xl font-semibold text-slate-950">Sales Invoices</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Live ERP invoice register from `/api/erp/sales/invoices` for the active organization.
            </p>
          </div>

          <Link
            to="/sales/invoices/new"
            className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            <CirclePlus className="h-4 w-4" />
            <span>New invoice</span>
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Invoices
          </div>
          <div className="mt-4 text-3xl font-semibold text-slate-950">{filteredInvoices.length}</div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Total Amount
          </div>
          <div className="mt-4 text-3xl font-semibold text-slate-950">
            {formatCurrency(totals.totalAmount)}
          </div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Outstanding
          </div>
          <div className="mt-4 text-3xl font-semibold text-slate-950">
            {formatCurrency(totals.balanceDue)}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by invoice number or status"
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
          <div className="hidden grid-cols-[1fr_0.9fr_0.9fr_0.9fr_0.9fr] gap-4 bg-slate-50 px-5 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 lg:grid">
            <div>Invoice</div>
            <div>Date</div>
            <div>Total</div>
            <div>Outstanding</div>
            <div>Status</div>
          </div>

          <div className="divide-y divide-slate-200">
            {isLoading ? (
              <div className="px-6 py-16 text-center text-sm text-slate-500">Loading invoices...</div>
            ) : filteredInvoices.length > 0 ? (
              filteredInvoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="grid gap-4 px-5 py-5 lg:grid-cols-[1fr_0.9fr_0.9fr_0.9fr_0.9fr] lg:items-center"
                >
                  <div>
                    <div className="text-base font-semibold text-slate-950">{invoice.invoiceNumber}</div>
                    <div className="mt-1 text-sm text-slate-500">Customer #{invoice.customerId}</div>
                  </div>
                  <div className="text-sm text-slate-600">
                    {new Date(invoice.invoiceDate).toLocaleDateString("en-IN")}
                  </div>
                  <div className="text-sm font-medium text-slate-900">
                    {formatCurrency(invoice.totalAmount)}
                  </div>
                  <div className="text-sm font-medium text-slate-900">
                    {formatCurrency(invoice.outstandingAmount)}
                  </div>
                  <div>
                    <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                      {invoice.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-6 py-16 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                  <ReceiptText className="h-6 w-6" />
                </div>
                <h2 className="mt-4 text-lg font-semibold text-slate-950">No invoices yet</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Create the first invoice using the ERP sales invoice flow.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
