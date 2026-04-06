import { Building2, Landmark } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "../../auth";
import type { AccountResponse } from "../accounting/api";
import { fetchBankingAccounts } from "./api";

export function BankAccounts() {
  const { token, user } = useAuth();
  const [accounts, setAccounts] = useState<AccountResponse[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadAccounts() {
      if (!token || !user?.organizationId) {
        return;
      }

      try {
        setAccounts(await fetchBankingAccounts(token, user.organizationId));
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "We could not load bank accounts.");
      }
    }

    void loadAccounts();
  }, [token, user?.organizationId]);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Banking
            </div>
            <h1 className="mt-3 text-3xl font-semibold text-slate-950">Bank Accounts</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              ERP finance accounts that behave as bank, cash, card, wallet, or clearing accounts
              in reconciliation and cash-bank reporting flows.
            </p>
          </div>

          <Link
            to="/accountant/chart-of-accounts"
            className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            <Landmark className="h-4 w-4" />
            <span>Open chart of accounts</span>
          </Link>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {accounts.map((account) => (
          <article
            key={account.id}
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
                {account.accountType === "cash" ? (
                  <Building2 className="h-5 w-5" />
                ) : (
                  <Landmark className="h-5 w-5" />
                )}
              </div>
              {account.isPrimary && (
                <div className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                  Primary
                </div>
              )}
            </div>

            <h2 className="mt-5 text-lg font-semibold text-slate-950">{account.name}</h2>
            <div className="mt-2 text-sm text-slate-500">{account.code}</div>
            <div className="mt-6 text-3xl font-semibold text-slate-950">{account.accountType}</div>
            <div className="mt-2 text-sm capitalize text-slate-500">
              {account.isSystem ? "System-managed" : "User-managed"} account
            </div>
          </article>
        ))}
        {accounts.length === 0 ? (
          <article className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
            No bank-style finance accounts are available for this organization yet.
          </article>
        ) : null}
      </section>
    </div>
  );
}
