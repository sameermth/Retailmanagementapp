import { AlertCircle, CirclePlus, ReceiptText, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "../../auth";
import { fetchPurchases, type PurchaseResponse } from "./api";

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value ?? 0);
}

export function BillsList() {
  const { token } = useAuth();
  const [bills, setBills] = useState<PurchaseResponse[]>([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadBills() {
      if (!token) {
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const response = await fetchPurchases(token);
        setBills(response.content);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load bills.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadBills();
  }, [token]);

  const filteredBills = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return bills.filter((bill) => {
      if (!normalizedQuery) {
        return true;
      }

      return (
        bill.purchaseOrderNumber.toLowerCase().includes(normalizedQuery) ||
        bill.supplierName.toLowerCase().includes(normalizedQuery) ||
        bill.supplierCode.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [bills, query]);

  const totals = useMemo(() => {
    return filteredBills.reduce(
      (summary, bill) => {
        summary.total += bill.totalAmount ?? 0;
        summary.pending += bill.pendingAmount ?? 0;
        return summary;
      },
      { total: 0, pending: 0 },
    );
  }, [filteredBills]);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Purchases
            </div>
            <h1 className="mt-3 text-3xl font-semibold text-slate-950">Bills</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Backend-backed purchase register built on the current `/api/purchases` contract.
            </p>
          </div>

          <Link
            to="/purchases/bills/new"
            className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            <CirclePlus className="h-4 w-4" />
            <span>New bill</span>
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Bills</div>
          <div className="mt-4 text-3xl font-semibold text-slate-950">{filteredBills.length}</div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Total Amount</div>
          <div className="mt-4 text-3xl font-semibold text-slate-950">
            {formatCurrency(totals.total)}
          </div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Pending</div>
          <div className="mt-4 text-3xl font-semibold text-slate-950">
            {formatCurrency(totals.pending)}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by bill number or supplier"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
          />
        </div>

        {error && (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {isLoading ? (
            <div className="col-span-full py-12 text-sm text-slate-500">Loading bills...</div>
          ) : filteredBills.length > 0 ? (
            filteredBills.map((bill) => (
              <article key={bill.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="rounded-2xl bg-white p-3 text-slate-700 shadow-sm">
                    <ReceiptText className="h-5 w-5" />
                  </div>
                  <div className="rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-slate-700">
                    {bill.status}
                  </div>
                </div>

                <h2 className="mt-5 text-lg font-semibold text-slate-950">{bill.purchaseOrderNumber}</h2>
                <div className="mt-1 text-sm text-slate-500">
                  {bill.supplierName} · {bill.supplierCode}
                </div>

                <div className="mt-5 space-y-2 text-sm text-slate-600">
                  <div>Ordered: {new Date(bill.orderDate).toLocaleDateString("en-IN")}</div>
                  <div>Payment: {bill.paymentStatus || "Pending"}</div>
                  <div>Terms: {bill.paymentTerms || "Not set"}</div>
                </div>

                <div className="mt-5 border-t border-slate-200 pt-4">
                  <div className="text-xs uppercase tracking-[0.14em] text-slate-500">Total</div>
                  <div className="mt-2 text-xl font-semibold text-slate-950">
                    {formatCurrency(bill.totalAmount)}
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    Pending {formatCurrency(bill.pendingAmount)}
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="col-span-full py-12 text-sm text-slate-500">No bills found.</div>
          )}
        </div>
      </section>
    </div>
  );
}
