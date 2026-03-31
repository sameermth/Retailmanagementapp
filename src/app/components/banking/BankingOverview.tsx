import {
  ArrowUpRight,
  BadgeIndianRupee,
  CircleAlert,
  Landmark,
  Link2,
  RefreshCw,
  Wallet,
} from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router";
import { readBankingState } from "./demo-banking";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function BankingOverview() {
  const { accounts, transactions } = readBankingState();

  const summary = useMemo(() => {
    const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0);
    const incoming = transactions
      .filter((transaction) => transaction.type === "incoming")
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    const outgoing = transactions
      .filter((transaction) => transaction.type === "outgoing")
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    const reviewCount = transactions.filter(
      (transaction) => transaction.status === "needs-review",
    ).length;

    return { totalBalance, incoming, outgoing, reviewCount };
  }, [accounts, transactions]);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Banking
            </div>
            <h1 className="mt-3 text-3xl font-semibold text-slate-950">Banking Overview</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              A banking snapshot with linked accounts, reconciliation signals,
              and recent transaction review. This is still demo-backed because the backend
              does not expose a banking contract yet.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/banking/accounts"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              <Landmark className="h-4 w-4" />
              <span>View accounts</span>
            </Link>
            <Link
              to="/banking/import-statement"
              className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              <Link2 className="h-4 w-4" />
              <span>Import statement</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            <BadgeIndianRupee className="h-4 w-4" />
            Total Balance
          </div>
          <div className="mt-4 text-3xl font-semibold text-slate-950">
            {formatCurrency(summary.totalBalance)}
          </div>
          <div className="mt-2 text-sm text-slate-500">Across bank, cash, and clearing accounts</div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            <ArrowUpRight className="h-4 w-4 text-emerald-600" />
            Incoming
          </div>
          <div className="mt-4 text-3xl font-semibold text-slate-950">
            {formatCurrency(summary.incoming)}
          </div>
          <div className="mt-2 text-sm text-emerald-600">Recent matched receipts and settlements</div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            <Wallet className="h-4 w-4 text-rose-500" />
            Outgoing
          </div>
          <div className="mt-4 text-3xl font-semibold text-slate-950">
            {formatCurrency(summary.outgoing)}
          </div>
          <div className="mt-2 text-sm text-slate-500">Recent vendor payouts and bank charges</div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            <CircleAlert className="h-4 w-4 text-amber-500" />
            Needs Review
          </div>
          <div className="mt-4 text-3xl font-semibold text-slate-950">{summary.reviewCount}</div>
          <div className="mt-2 text-sm text-slate-500">Transactions waiting for manual reconciliation</div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Linked Accounts
              </div>
              <h2 className="mt-2 text-xl font-semibold text-slate-950">Bank and cash positions</h2>
            </div>
            <Link
              to="/banking/accounts"
              className="text-sm font-medium text-blue-600 transition hover:text-blue-700"
            >
              Open all
            </Link>
          </div>
          <div className="divide-y divide-slate-200">
            {accounts.map((account) => (
              <div key={account.id} className="flex items-center justify-between gap-4 px-6 py-5">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
                      <Landmark className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-base font-semibold text-slate-950">
                        {account.name}
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        {account.institution} · {account.accountNumber}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-lg font-semibold text-slate-950">
                    {formatCurrency(account.balance)}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {account.isPrimary ? "Primary account" : "Secondary account"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              <RefreshCw className="h-4 w-4" />
              Sync Status
            </div>
            <div className="mt-4 space-y-4">
              {accounts.slice(0, 3).map((account) => (
                <div key={account.id} className="rounded-2xl bg-slate-50 px-4 py-3">
                  <div className="text-sm font-medium text-slate-900">{account.name}</div>
                  <div className="mt-1 text-sm text-slate-500">
                    Last synced {new Date(account.lastSyncedAt).toLocaleString("en-IN")}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Reconciliation Queue
            </div>
            <div className="mt-4 space-y-3">
              {transactions.slice(0, 4).map((transaction) => (
                <div key={transaction.id} className="rounded-2xl border border-slate-200 px-4 py-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-medium text-slate-900">
                        {transaction.description}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {transaction.category} · {transaction.date}
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`text-sm font-semibold ${
                          transaction.type === "incoming"
                            ? "text-emerald-600"
                            : "text-rose-600"
                        }`}
                      >
                        {transaction.type === "incoming" ? "+" : "-"}
                        {formatCurrency(transaction.amount)}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">{transaction.status}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
