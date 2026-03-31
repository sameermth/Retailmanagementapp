import { Building2, Landmark, Plus } from "lucide-react";
import { Link } from "react-router";
import { readBankingState } from "./demo-banking";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function BankAccounts() {
  const { accounts } = readBankingState();

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
              Linked bank, cash, card, and clearing accounts. This is demo-backed until
              the backend exposes a dedicated banking/accounts contract.
            </p>
          </div>

          <Link
            to="/banking/accounts/new"
            className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            <span>Add bank or credit card</span>
          </Link>
        </div>
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
            <div className="mt-2 text-sm text-slate-500">
              {account.institution} · {account.accountNumber}
            </div>
            <div className="mt-6 text-3xl font-semibold text-slate-950">
              {formatCurrency(account.balance)}
            </div>
            <div className="mt-2 text-sm capitalize text-slate-500">
              {account.accountType.replace("-", " ")} account
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
