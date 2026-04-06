import { CheckCircle2, CircleAlert, Landmark, Link2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth";
import type { AccountResponse } from "../accounting/api";
import {
  fetchBankingAccounts,
  fetchBankReconciliationSummary,
  fetchReconciliationCandidates,
  reconcileBankStatement,
  unreconcileBankStatement,
  type BankReconciliationCandidateResponse,
  type BankStatementEntryResponse,
} from "./api";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function BankReconciliation() {
  const { token, user } = useAuth();
  const [accounts, setAccounts] = useState<AccountResponse[]>([]);
  const [entries, setEntries] = useState<BankStatementEntryResponse[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [fromDate, setFromDate] = useState(() => new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [candidateMap, setCandidateMap] = useState<Record<number, BankReconciliationCandidateResponse[]>>({});
  const [error, setError] = useState("");

  async function loadSummary(accountIdOverride?: number) {
    if (!token || !user?.organizationId) {
      return;
    }

    try {
      const bankAccounts = accounts.length > 0 ? accounts : await fetchBankingAccounts(token, user.organizationId);
      if (accounts.length === 0) {
        setAccounts(bankAccounts);
      }

      const effectiveAccountId = accountIdOverride ?? Number(selectedAccountId || bankAccounts[0]?.id);
      if (!effectiveAccountId) {
        setEntries([]);
        return;
      }

      if (!selectedAccountId) {
        setSelectedAccountId(String(effectiveAccountId));
      }

      const summary = await fetchBankReconciliationSummary(token, user.organizationId, {
        accountId: effectiveAccountId,
        fromDate,
        toDate,
      });
      setEntries(summary.entries);
      setCandidateMap({});
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We could not load reconciliation.");
    }
  }

  useEffect(() => {
    void loadSummary();
  }, [token, user?.organizationId, fromDate, toDate]);

  const summary = useMemo(() => {
    const pending = entries.filter((entry) => entry.status !== "RECONCILED");
    const matched = entries.filter((entry) => entry.matchedLedgerEntryId && entry.status !== "RECONCILED");
    const reconciled = entries.filter((entry) => entry.status === "RECONCILED");

    return {
      pendingCount: pending.length,
      pendingAmount: pending.reduce((sum, entry) => sum + Math.abs(Number(entry.signedAmount ?? 0)), 0),
      matchedCount: matched.length,
      reconciledCount: reconciled.length,
    };
  }, [entries]);

  const reviewQueue = useMemo(
    () => entries.filter((entry) => entry.status !== "RECONCILED"),
    [entries],
  );

  async function handleLoadCandidates(statementEntryId: number) {
    if (!token || !user?.organizationId) {
      return;
    }

    const existing = candidateMap[statementEntryId];
    if (existing) {
      return;
    }

    try {
      const candidates = await fetchReconciliationCandidates(token, user.organizationId, statementEntryId);
      setCandidateMap((current) => ({ ...current, [statementEntryId]: candidates }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We could not load matching candidates.");
    }
  }

  async function handleReconcile(statementEntryId: number, ledgerEntryId: number) {
    if (!token || !user?.organizationId) {
      return;
    }

    try {
      await reconcileBankStatement(token, user.organizationId, statementEntryId, ledgerEntryId);
      await loadSummary(Number(selectedAccountId));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We could not reconcile this entry.");
    }
  }

  async function handleUnreconcile(statementEntryId: number) {
    if (!token || !user?.organizationId) {
      return;
    }

    try {
      await unreconcileBankStatement(token, user.organizationId, statementEntryId);
      await loadSummary(Number(selectedAccountId));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We could not unreconcile this entry.");
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Banking
        </div>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">Reconciliation</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Match imported bank statement activity with ERP ledger candidates and close the
          reconciliation loop using the backend finance flow.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <select
            value={selectedAccountId}
            onChange={(event) => setSelectedAccountId(event.target.value)}
            className="crm-field"
          >
            <option value="">Select account</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
          <input value={fromDate} onChange={(event) => setFromDate(event.target.value)} type="date" className="crm-field" />
          <input value={toDate} onChange={(event) => setToDate(event.target.value)} type="date" className="crm-field" />
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}
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
                const candidates = candidateMap[transaction.id] ?? [];
                return (
                  <div key={transaction.id} className="px-6 py-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-950">{transaction.description || "Statement entry"}</div>
                      <div className="mt-1 text-sm text-slate-500">
                        {transaction.entryDate} · {account?.name || "Unknown account"} · {transaction.referenceNumber || "No reference"}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-sm font-semibold text-slate-950">
                          {formatCurrency(Math.abs(Number(transaction.signedAmount ?? 0)))}
                        </div>
                        <div className="mt-1 text-xs capitalize text-slate-500">
                          {transaction.status.replace(/_/g, " ")}
                        </div>
                      </div>
                      {transaction.matchedLedgerEntryId ? (
                        <button
                          type="button"
                          onClick={() => void handleUnreconcile(transaction.id)}
                          className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                        >
                          <CircleAlert className="h-4 w-4" />
                          <span>Unreconcile</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void handleLoadCandidates(transaction.id)}
                          className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Find matches</span>
                        </button>
                      )}
                    </div>
                  </div>

                    {candidates.length > 0 ? (
                      <div className="mt-4 space-y-2 rounded-2xl bg-slate-50 p-4">
                        {candidates.slice(0, 3).map((candidate) => (
                          <div key={candidate.ledgerEntryId} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                            <div>
                              <div className="text-sm font-medium text-slate-900">
                                {candidate.voucherNumber} · {candidate.voucherType}
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                {candidate.entryDate} · {candidate.narrative || "No narrative"} · day diff {candidate.dayDifference ?? "-"}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => void handleReconcile(transaction.id, candidate.ledgerEntryId)}
                              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                            >
                              Match
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : null}
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
                <div className="text-sm font-semibold text-amber-900">Backend reconciliation flow</div>
                <p className="mt-2 text-sm leading-6 text-amber-800">
                  Imported bank statements now use the ERP finance contract. Candidate matching is
                  limited to the backend’s returned suggestions for each statement line.
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
