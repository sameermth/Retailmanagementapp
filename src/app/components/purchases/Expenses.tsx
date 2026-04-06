import { AlertCircle, CirclePlus, CreditCard, RefreshCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "../../auth";
import {
  createExpense,
  fetchExpenseCategories,
  fetchExpenses,
  payExpense,
  type ExpenseCategoryResponse,
  type ExpenseResponse,
} from "./api";

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value ?? 0);
}

export function Expenses() {
  const { token, user } = useAuth();
  const [categories, setCategories] = useState<ExpenseCategoryResponse[]>([]);
  const [expenses, setExpenses] = useState<ExpenseResponse[]>([]);
  const [expenseCategoryId, setExpenseCategoryId] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [remarks, setRemarks] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [markPaid, setMarkPaid] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function loadData() {
    if (!token || !user?.organizationId) return;
    setIsLoading(true);
    setError("");
    try {
      const [categoryResponse, expenseResponse] = await Promise.all([
        fetchExpenseCategories(token, user.organizationId),
        fetchExpenses(token, user.organizationId),
      ]);
      setCategories(categoryResponse);
      setExpenses(expenseResponse);
      if (categoryResponse[0] && !expenseCategoryId) {
        setExpenseCategoryId(String(categoryResponse[0].id));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load expenses.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [token, user?.organizationId]);

  async function handleCreateExpense(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !user?.organizationId || !user.defaultBranchId || !expenseCategoryId || !amount) {
      setError("Category, amount, and branch context are required.");
      return;
    }
    setIsSubmitting(true);
    setError("");
    setSuccessMessage("");
    try {
      await createExpense(token, {
        organizationId: user.organizationId,
        branchId: user.defaultBranchId,
        expenseCategoryId: Number(expenseCategoryId),
        expenseDate,
        amount: Number(amount),
        paymentMethod: markPaid ? paymentMethod : undefined,
        remarks: remarks.trim() || undefined,
        markPaid,
      });
      setSuccessMessage("Expense created.");
      setAmount("");
      setRemarks("");
      setMarkPaid(false);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create expense.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePayExpense(expenseId: number) {
    if (!token) return;
    setError("");
    setSuccessMessage("");
    try {
      await payExpense(token, expenseId, {
        paymentMethod,
        paidDate: new Date().toISOString().slice(0, 10),
      });
      setSuccessMessage("Expense paid.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to pay expense.");
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Purchases</div>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">Expenses</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          This screen now uses the live ERP expense category, expense creation, and expense payment endpoints.
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <form onSubmit={handleCreateExpense} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-slate-100 p-3 text-slate-700"><CirclePlus className="h-5 w-5" /></div>
            <div><div className="text-lg font-semibold text-slate-950">Create Expense</div><div className="text-sm text-slate-500">Direct ERP expense posting flow</div></div>
          </div>
          <div className="mt-6 space-y-4">
            <select value={expenseCategoryId} onChange={(event) => setExpenseCategoryId(event.target.value)} className="crm-select">
              <option value="">Select expense category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name} ({category.code})</option>
              ))}
            </select>
            <div className="grid gap-4 md:grid-cols-2">
              <input type="date" value={expenseDate} onChange={(event) => setExpenseDate(event.target.value)} className="crm-field" />
              <input value={amount} onChange={(event) => setAmount(event.target.value)} type="number" min="0.01" step="0.01" className="crm-field" placeholder="Amount" />
            </div>
            <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} className="crm-select">
              {["CASH", "BANK", "CARD", "UPI"].map((method) => <option key={method} value={method}>{method}</option>)}
            </select>
            <label className="flex items-center gap-3 text-sm text-slate-600">
              <input type="checkbox" checked={markPaid} onChange={(event) => setMarkPaid(event.target.checked)} />
              Mark as paid on create
            </label>
            <input value={remarks} onChange={(event) => setRemarks(event.target.value)} className="crm-field" placeholder="Remarks" />
            {(error || successMessage) && (
              <div className="space-y-3">
                {error ? <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"><AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" /><span>{error}</span></div> : null}
                {successMessage ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{successMessage}</div> : null}
              </div>
            )}
            <button type="submit" disabled={isSubmitting || isLoading} className="w-full rounded-full bg-slate-950 px-4 py-3 text-sm font-medium text-white disabled:opacity-60">
              {isSubmitting ? "Creating..." : "Create expense"}
            </button>
          </div>
        </form>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Expense Register</h2>
              <p className="mt-2 text-sm text-slate-600">Backend source: `/api/erp/expenses`</p>
            </div>
            <button type="button" onClick={() => void loadData()} className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </button>
          </div>
          <div className="mt-5 space-y-3">
            {expenses.length > 0 ? expenses.map((expense) => (
              <div key={expense.id} className="rounded-2xl border border-slate-200 px-4 py-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="text-sm font-medium text-slate-900">{expense.expenseNumber}</div>
                    <div className="mt-1 text-sm text-slate-500">Date {new Date(expense.expenseDate).toLocaleDateString("en-IN")} · Category #{expense.expenseCategoryId}</div>
                    <div className="mt-1 text-xs text-slate-500">{expense.remarks || "No remarks"}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-semibold text-slate-900">{formatCurrency(expense.amount)}</div>
                    <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{expense.status}</span>
                    {expense.outstandingAmount && expense.outstandingAmount > 0 ? (
                      <button type="button" onClick={() => void handlePayExpense(expense.id)} className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
                        <CreditCard className="h-4 w-4" />
                        Pay now
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            )) : <div className="text-sm text-slate-500">No expenses returned yet.</div>}
          </div>
        </section>
      </section>
    </div>
  );
}
