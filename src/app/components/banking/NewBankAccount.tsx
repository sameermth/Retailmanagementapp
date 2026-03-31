import { AlertCircle, PlusCircle } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { createBankAccount } from "./demo-banking";

type AccountType = "bank" | "cash" | "credit-card" | "clearing";

const accountTypes: Array<{ value: AccountType; label: string }> = [
  { value: "bank", label: "Bank Account" },
  { value: "cash", label: "Cash Account" },
  { value: "credit-card", label: "Credit Card" },
  { value: "clearing", label: "Payment Clearing" },
];

export function NewBankAccount() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    accountType: "bank" as AccountType,
    accountNumber: "",
    institution: "",
    balance: "0",
    isPrimary: false,
  });
  const [error, setError] = useState("");

  function updateField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!form.name || !form.accountNumber || !form.institution) {
      setError("Name, account number, and institution are required.");
      return;
    }

    createBankAccount({
      name: form.name,
      accountType: form.accountType,
      accountNumber: form.accountNumber,
      institution: form.institution,
      balance: Number(form.balance) || 0,
      isPrimary: form.isPrimary,
    });

    navigate("/banking/accounts");
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Banking
        </div>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">Add Bank or Credit Card</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Create a new linked account in demo mode so the banking section has the same shape as a
          real bookkeeping workspace.
        </p>
      </section>

      <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="grid gap-6 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Account Name</span>
            <input
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-300"
              placeholder="HDFC Current Account"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Account Type</span>
            <select
              value={form.accountType}
              onChange={(event) => updateField("accountType", event.target.value as AccountType)}
              className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-300"
            >
              {accountTypes.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Institution</span>
            <input
              value={form.institution}
              onChange={(event) => updateField("institution", event.target.value)}
              className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-300"
              placeholder="HDFC Bank"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Account Number</span>
            <input
              value={form.accountNumber}
              onChange={(event) => updateField("accountNumber", event.target.value)}
              className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-300"
              placeholder="31955028"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Opening Balance</span>
            <input
              value={form.balance}
              onChange={(event) => updateField("balance", event.target.value)}
              type="number"
              min="0"
              step="0.01"
              className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-300"
            />
          </label>

          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3">
            <input
              checked={form.isPrimary}
              onChange={(event) => updateField("isPrimary", event.target.checked)}
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300"
            />
            <span className="text-sm text-slate-700">Mark this as the primary account</span>
          </label>
        </div>

        {error && (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-8 flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Create account</span>
          </button>
        </div>
      </form>
    </div>
  );
}
