import { CheckCircle2, CircleAlert, Landmark, Link2 } from "lucide-react";
import { useMemo, useState } from "react";
import { updateTransactionStatus, readBankingState } from "./demo-banking";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function BankReconciliation() {
  const [{ accounts, transactions }, setBankingState] = useState(() => readBankingState());

  const summary = useMemo(() => {
    const pending = transactions.filter((transaction) => transaction.status !== "reconciled");
    const matched = transactions.filter((transaction) => transaction.status === "matched");
    const reconciled = transactions.filter((transaction) => transaction.status === "reconciled");

    return {
      pendingCount: pending.length,
      pendingAmount: pending.reduce((sum, transaction) => sum + transaction.amount, 0),
      matchedCount: matched.length,
      reconciledCount: reconciled.length,
    };
  }, [transactions]);

  const reviewQueue = useMemo(
    () => transactions.filter((transaction) => transaction.status !== "reconciled"),
    [transactions],
  );

  function handleReconcile(transactionId: string) {
    updateTransactionStatus(transactionId, "reconciled");
    setBankingState(readBankingState());
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Banking
        </div>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">Reconciliation</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Match imported statement activity with your books and push reviewed lines into a
          reconciled state.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Pending Lines
          </div>
          <div className="mt-4 text-3xl font-semibold text-slate-950">{summary.pendingCount}</div>
          <div className="mt-2 text-sm text-slate-500">Awaiting confirmation or matching</div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Pending Amount
          </div>
          <div className="mt-4 text-3xl font-semibold text-slate-950">
            {formatCurrency(summary.pendingAmount)}
          </div>
          <div className="mt-2 text-sm text-slate-500">Across open review and matched lines</div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Ready To Close
          </div>
          <div className="mt-4 text-3xl font-semibold text-slate-950">{summary.matchedCount}</div>
          <div className="mt-2 text-sm text-slate-500">Already matched, waiting for final close</div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Reconciled
          </div>
          <div className="mt-4 text-3xl font-semibold text-slate-950">{summary.reconciledCount}</div>
          <div className="mt-2 text-sm text-slate-500">Completed statement lines</div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Review Queue
              </div>
              <h2 className="mt-2 text-xl font-semibold text-slate-950">Open transaction matches</h2>
            </div>
          </div>

          <div className="divide-y divide-slate-200">
            {reviewQueue.length > 0 ? (
              reviewQueue.map((transaction) => {
                const account = accounts.find((item) => item.id === transaction.accountId);
                return (
                  <div key={transaction.id} className="flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-950">{transaction.description}</div>
                      <div className="mt-1 text-sm text-slate-500">
                        {transaction.category} · {transaction.date} · {account?.name || "Unknown account"}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-sm font-semibold text-slate-950">
                          {formatCurrency(transaction.amount)}
                        </div>
                        <div className="mt-1 text-xs capitalize text-slate-500">
                          {transaction.status.replace("-", " ")}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleReconcile(transaction.id)}
                        className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Reconcile</span>
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex items-center gap-3 px-6 py-10 text-sm text-slate-500">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Everything is reconciled right now.</span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              <Landmark className="h-4 w-4" />
              Statement Accounts
            </div>
            <div className="mt-4 space-y-3">
              {accounts.map((account) => (
                <div key={account.id} className="rounded-2xl bg-slate-50 px-4 py-3">
                  <div className="text-sm font-medium text-slate-900">{account.name}</div>
                  <div className="mt-1 text-sm text-slate-500">
                    {account.institution} · {account.accountNumber}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <CircleAlert className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
              <div>
                <div className="text-sm font-semibold text-amber-900">Demo reconciliation mode</div>
                <p className="mt-2 text-sm leading-6 text-amber-800">
                  This flow is local for now. Once banking APIs exist, these actions can map to
                  imported statement sessions and ledger matching endpoints.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              <Link2 className="h-4 w-4" />
              Workflow
            </div>
            <ol className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
              <li>1. Import a bank statement or manually review new lines.</li>
              <li>2. Mark lines as matched from the transactions feed.</li>
              <li>3. Reconcile matched lines to close the period.</li>
            </ol>
          </section>
        </div>
      </section>
    </div>
  );
}
