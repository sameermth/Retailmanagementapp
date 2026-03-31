import { AlertCircle, FileUp, Upload } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { importBankStatement, readBankingState } from "./demo-banking";

const demoRows = [
  {
    date: "2026-03-25",
    description: "Marketplace settlement",
    category: "Sales receipt",
    type: "incoming" as const,
    amount: 12450,
  },
  {
    date: "2026-03-25",
    description: "Card MDR charge",
    category: "Bank charges",
    type: "outgoing" as const,
    amount: 180,
  },
  {
    date: "2026-03-24",
    description: "Vendor transfer - Metro Foods",
    category: "Vendor payment",
    type: "outgoing" as const,
    amount: 8200,
  },
];

export function ImportStatement() {
  const navigate = useNavigate();
  const { accounts } = readBankingState();
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [preview, setPreview] = useState(JSON.stringify(demoRows, null, 2));
  const [error, setError] = useState("");

  const parsedCount = useMemo(() => {
    try {
      const rows = JSON.parse(preview) as unknown[];
      return Array.isArray(rows) ? rows.length : 0;
    } catch {
      return 0;
    }
  }, [preview]);

  function handleImport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    try {
      const rows = JSON.parse(preview) as typeof demoRows;

      if (!Array.isArray(rows) || rows.length === 0) {
        setError("Paste at least one statement row before importing.");
        return;
      }

      importBankStatement({ accountId, rows });
      navigate("/banking/transactions");
    } catch {
      setError("The preview must be valid JSON array data.");
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Banking
        </div>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">Import Statement</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          This demo import mirrors a bank-statement workflow without needing a real parser yet.
          Importing rows sends them into the banking transaction queue as lines that need review.
        </p>
      </section>

      <form onSubmit={handleImport} className="grid gap-6 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            <FileUp className="h-4 w-4" />
            Import Setup
          </div>

          <div className="mt-6 space-y-5">
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Destination Account</span>
              <select
                value={accountId}
                onChange={(event) => setAccountId(event.target.value)}
                className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-300"
              >
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="text-sm font-medium text-slate-900">Rows ready to import</div>
              <div className="mt-2 text-3xl font-semibold text-slate-950">{parsedCount}</div>
              <div className="mt-2 text-sm text-slate-500">
                Imported lines will begin in the <code>needs-review</code> state.
              </div>
            </div>

            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              <Upload className="h-4 w-4" />
              <span>Import statement rows</span>
            </button>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            JSON Preview
          </div>
          <textarea
            value={preview}
            onChange={(event) => setPreview(event.target.value)}
            className="mt-4 h-[420px] w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 font-mono text-sm text-slate-900 outline-none transition focus:border-blue-300 focus:bg-white"
          />

          {error && (
            <div className="mt-4 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </section>
      </form>
    </div>
  );
}
