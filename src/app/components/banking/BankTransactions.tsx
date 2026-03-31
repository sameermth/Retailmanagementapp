import { ArrowDownLeft, ArrowUpRight, CircleAlert, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { updateTransactionStatus, readBankingState } from "./demo-banking";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

const statusClasses = {
  matched: "bg-emerald-50 text-emerald-700",
  reconciled: "bg-blue-50 text-blue-700",
  "needs-review": "bg-amber-50 text-amber-700",
};

export function BankTransactions() {
  const [{ accounts, transactions }, setBankingState] = useState(() => readBankingState());
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "matched" | "reconciled" | "needs-review">(
    "all",
  );

  const accountMap = useMemo(
    () => Object.fromEntries(accounts.map((account) => [account.id, account])),
    [accounts],
  );

  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      const matchesQuery =
        query.trim().length === 0 ||
        transaction.description.toLowerCase().includes(query.toLowerCase()) ||
        transaction.category.toLowerCase().includes(query.toLowerCase()) ||
        accountMap[transaction.accountId]?.name.toLowerCase().includes(query.toLowerCase());

      const matchesStatus = statusFilter === "all" || transaction.status === statusFilter;

      return matchesQuery && matchesStatus;
    });
  }, [accountMap, query, statusFilter, transactions]);

  function handleStatusChange(transactionId: string, status: "matched" | "reconciled" | "needs-review") {
    updateTransactionStatus(transactionId, status);
    setBankingState(readBankingState());
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Banking
        </div>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">Transactions</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Review incoming and outgoing bank activity, then mark lines as matched or reconciled as
          the books catch up.
        </p>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by description, category, or account"
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-300 focus:bg-white"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {(["all", "matched", "needs-review", "reconciled"] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  statusFilter === status
                    ? "bg-slate-950 text-white"
                    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                }`}
              >
                {status === "all" ? "All transactions" : status.replace("-", " ")}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)_140px_140px_220px] gap-4 border-b border-slate-200 px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          <div>Transaction</div>
          <div>Account</div>
          <div>Amount</div>
          <div>Status</div>
          <div>Actions</div>
        </div>

        <div className="divide-y divide-slate-200">
          {filteredTransactions.length > 0 ? (
            filteredTransactions.map((transaction) => {
              const account = accountMap[transaction.accountId];

              return (
                <div
                  key={transaction.id}
                  className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)_140px_140px_220px] gap-4 px-6 py-5"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <div
                        className={`rounded-2xl p-3 ${
                          transaction.type === "incoming"
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-rose-50 text-rose-600"
                        }`}
                      >
                        {transaction.type === "incoming" ? (
                          <ArrowDownLeft className="h-4 w-4" />
                        ) : (
                          <ArrowUpRight className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-950">
                          {transaction.description}
                        </div>
                        <div className="mt-1 text-sm text-slate-500">
                          {transaction.category} · {transaction.date}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-sm text-slate-600">{account?.name || "Unknown account"}</div>

                  <div
                    className={`text-sm font-semibold ${
                      transaction.type === "incoming" ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {transaction.type === "incoming" ? "+" : "-"}
                    {formatCurrency(transaction.amount)}
                  </div>

                  <div>
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium capitalize ${
                        statusClasses[transaction.status]
                      }`}
                    >
                      {transaction.status.replace("-", " ")}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {transaction.status !== "matched" && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(transaction.id, "matched")}
                        className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                      >
                        Mark matched
                      </button>
                    )}
                    {transaction.status !== "reconciled" && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(transaction.id, "reconciled")}
                        className="rounded-full bg-slate-950 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-slate-800"
                      >
                        Reconcile
                      </button>
                    )}
                    {transaction.status !== "needs-review" && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(transaction.id, "needs-review")}
                        className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 transition hover:bg-amber-100"
                      >
                        Review
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex items-center gap-3 px-6 py-10 text-sm text-slate-500">
              <CircleAlert className="h-4 w-4" />
              <span>No transactions matched the current filters.</span>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
