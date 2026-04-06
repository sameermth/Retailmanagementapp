import { ArrowUpRight, BadgeIndianRupee, CircleAlert, Landmark, Link2, RefreshCw, Wallet } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "../../auth";
import type { AccountResponse } from "../accounting/api";
import { fetchBankingAccounts, fetchBankReconciliationSummary, fetchCashBankSummary } from "./api";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function BankingOverview() {
  const { token, user } = useAuth();
  const [accounts, setAccounts] = useState<AccountResponse[]>([]);
  const [summary, setSummary] = useState({
    totalBalance: 0,
    incoming: 0,
    outgoing: 0,
    reviewCount: 0,
  });
  const [reconciliationPreview, setReconciliationPreview] = useState<Array<{
    id: number;
    description: string | null;
    entryDate: string;
    signedAmount: number | null;
    status: string;
    accountId: number;
  }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadOverview() {
      if (!token || !user?.organizationId) {
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const [bankAccounts, cashBankSummary] = await Promise.all([
          fetchBankingAccounts(token, user.organizationId),
          fetchCashBankSummary(token, user.organizationId),
        ]);

        setAccounts(bankAccounts);
        setSummary({
          totalBalance: cashBankSummary.netMovement,
          incoming: cashBankSummary.totalInflow,
          outgoing: cashBankSummary.totalOutflow,
          reviewCount: 0,
        });

        const previewAccount = bankAccounts[0] ?? cashBankSummary.accounts[0];
        if (previewAccount) {
          const today = new Date().toISOString().slice(0, 10);
          const thirtyDaysAgo = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000)
            .toISOString()
            .slice(0, 10);
          const reconciliation = await fetchBankReconciliationSummary(token, user.organizationId, {
            accountId: previewAccount.id ?? previewAccount.accountId,
            fromDate: thirtyDaysAgo,
            toDate: today,
          });

          setSummary((current) => ({
            ...current,
            reviewCount: reconciliation.unmatchedCount,
          }));
          setReconciliationPreview(
            reconciliation.entries.slice(0, 4).map((entry) => ({
              id: entry.id,
              description: entry.description,
              entryDate: entry.entryDate,
              signedAmount: entry.signedAmount,
              status: entry.status,
              accountId: entry.accountId,
            })),
          );
        } else {
          setReconciliationPreview([]);
        }
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "We could not load banking data.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadOverview();
  }, [token, user?.organizationId]);

  const accountCards = useMemo(
    () =>
      accounts.map((account) => ({
        id: account.id,
        name: account.name,
        institution: account.accountType,
        accountNumber: account.code,
        isPrimary: false,
      })),
    [accounts],
  );

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
              Cash and bank movement summaries, ERP finance accounts, and reconciliation signals
              from the current backend contract.
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

        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}
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
          <div className="mt-2 text-sm text-slate-500">Net movement across cash and bank accounts</div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            <ArrowUpRight className="h-4 w-4 text-emerald-600" />
            Incoming
          </div>
          <div className="mt-4 text-3xl font-semibold text-slate-950">
            {formatCurrency(summary.incoming)}
          </div>
          <div className="mt-2 text-sm text-emerald-600">Cash and bank inflow from the finance summary</div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            <Wallet className="h-4 w-4 text-rose-500" />
            Outgoing
          </div>
          <div className="mt-4 text-3xl font-semibold text-slate-950">
            {formatCurrency(summary.outgoing)}
          </div>
          <div className="mt-2 text-sm text-slate-500">Cash and bank outflow from the finance summary</div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            <CircleAlert className="h-4 w-4 text-amber-500" />
            Needs Review
          </div>
          <div className="mt-4 text-3xl font-semibold text-slate-950">{summary.reviewCount}</div>
          <div className="mt-2 text-sm text-slate-500">Statement entries still unmatched in reconciliation</div>
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
            {accountCards.map((account) => (
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
                  <div className="text-lg font-semibold text-slate-950">{account.accountNumber}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {account.isPrimary ? "Primary account" : "ERP finance account"}
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
              {accountCards.slice(0, 3).map((account) => (
                <div key={account.id} className="rounded-2xl bg-slate-50 px-4 py-3">
                  <div className="text-sm font-medium text-slate-900">{account.name}</div>
                  <div className="mt-1 text-sm text-slate-500">
                    Account code {account.accountNumber}
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
              {reconciliationPreview.map((transaction) => (
                <div key={transaction.id} className="rounded-2xl border border-slate-200 px-4 py-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-medium text-slate-900">
                        {transaction.description || "Statement entry"}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        Account {transaction.accountId} · {transaction.entryDate}
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`text-sm font-semibold ${
                          Number(transaction.signedAmount ?? 0) >= 0
                            ? "text-emerald-600"
                            : "text-rose-600"
                        }`}
                      >
                        {Number(transaction.signedAmount ?? 0) >= 0 ? "+" : "-"}
                        {formatCurrency(Math.abs(Number(transaction.signedAmount ?? 0)))}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">{transaction.status}</div>
                    </div>
                  </div>
                </div>
              ))}
              {!isLoading && reconciliationPreview.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-500">
                  No reconciliation entries are available yet for the selected window.
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
