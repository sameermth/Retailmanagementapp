import { AlertCircle, Landmark, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth";
import {
  allocateSupplierPayment,
  createSupplierPayment,
  fetchPurchaseReceipts,
  fetchSupplierPayments,
  fetchSupplierSummaries,
  type PurchaseReceiptSummaryResponse,
  type SupplierPaymentRequestPayload,
  type SupplierPaymentResponse,
  type SupplierSummaryResponse,
} from "./api";

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value ?? 0);
}

export function SupplierPayments() {
  const { token, user } = useAuth();
  const [suppliers, setSuppliers] = useState<SupplierSummaryResponse[]>([]);
  const [receipts, setReceipts] = useState<PurchaseReceiptSummaryResponse[]>([]);
  const [payments, setPayments] = useState<SupplierPaymentResponse[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [form, setForm] = useState<SupplierPaymentRequestPayload>({
    organizationId: 0,
    branchId: undefined,
    supplierId: 0,
    amount: 0,
    paymentMethod: "BANK_TRANSFER",
    paymentDate: new Date().toISOString().slice(0, 10),
  });
  const [selectedReceiptId, setSelectedReceiptId] = useState("");

  useEffect(() => {
    async function loadData() {
      if (!token || !user?.organizationId) {
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const [supplierResponse, receiptResponse, paymentResponse] = await Promise.all([
          fetchSupplierSummaries(token, user.organizationId),
          fetchPurchaseReceipts(token, user.organizationId),
          fetchSupplierPayments(token, user.organizationId),
        ]);
        setSuppliers(supplierResponse);
        setReceipts(receiptResponse);
        setPayments(paymentResponse);

        if (supplierResponse.length > 0) {
          setForm((current) => ({
            ...current,
            organizationId: user.organizationId ?? 0,
            branchId: user.defaultBranchId ?? undefined,
            supplierId: current.supplierId || supplierResponse[0].id,
          }));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load supplier payments.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadData();
  }, [token, user?.organizationId, user?.defaultBranchId]);

  const filteredPayments = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();

    return payments.filter((payment) => {
      if (!normalized) {
        return true;
      }

      return (
        payment.paymentNumber.toLowerCase().includes(normalized) ||
        payment.paymentMethod.toLowerCase().includes(normalized) ||
        payment.status.toLowerCase().includes(normalized)
      );
    });
  }, [payments, searchTerm]);

  const supplierReceipts = receipts.filter(
    (receipt) => !form.supplierId || receipt.supplierId === form.supplierId,
  );

  const totals = filteredPayments.reduce(
    (summary, payment) => {
      summary.total += payment.amount ?? 0;
      summary.count += 1;
      return summary;
    },
    { total: 0, count: 0 },
  );

  function updateForm<K extends keyof SupplierPaymentRequestPayload>(
    field: K,
    value: SupplierPaymentRequestPayload[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token || !user?.organizationId || !user.defaultBranchId) {
      setError("Organization or branch context is missing in the current session.");
      return;
    }

    if (!form.supplierId || !form.amount || form.amount <= 0) {
      setError("Supplier and a positive payment amount are required.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setSuccessMessage("");

    try {
      const createdPayment = await createSupplierPayment(token, {
        ...form,
        organizationId: user.organizationId,
        branchId: user.defaultBranchId,
      });

      if (selectedReceiptId) {
        await allocateSupplierPayment(token, createdPayment.id, Number(selectedReceiptId), form.amount);
      }

      const refreshedPayments = await fetchSupplierPayments(token, user.organizationId);
      setPayments(refreshedPayments);
      setSuccessMessage(`Payment ${createdPayment.paymentNumber} created successfully.`);
      setSelectedReceiptId("");
      setForm((current) => ({
        ...current,
        organizationId: user.organizationId,
        branchId: user.defaultBranchId,
        amount: 0,
        referenceNumber: undefined,
        remarks: undefined,
        paymentDate: new Date().toISOString().slice(0, 10),
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create supplier payment.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Purchases
          </div>
          <h1 className="mt-3 text-3xl font-semibold text-slate-950">Supplier Payments</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Live ERP supplier payment flow using `/api/erp/purchases/supplier-payments`.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Payments</div>
          <div className="mt-4 text-3xl font-semibold text-slate-950">{totals.count}</div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Total Paid</div>
          <div className="mt-4 text-3xl font-semibold text-slate-950">{formatCurrency(totals.total)}</div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Suppliers</div>
          <div className="mt-4 text-3xl font-semibold text-slate-950">{suppliers.length}</div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[520px_minmax(0,1fr)] 2xl:grid-cols-[560px_minmax(0,1fr)]">
        <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
              <Landmark className="h-5 w-5" />
            </div>
            <div>
              <div className="text-lg font-semibold text-slate-950">Record Payment</div>
              <div className="text-sm text-slate-500">Create a supplier payment and optionally allocate it</div>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <label className="block">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Supplier</div>
              <select
                value={form.supplierId || ""}
                onChange={(event) => {
                  const supplierId = Number(event.target.value);
                  setForm((current) => ({ ...current, supplierId }));
                  setSelectedReceiptId("");
                }}
                className="crm-select"
              >
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Allocate To Receipt</div>
              <select value={selectedReceiptId} onChange={(e) => setSelectedReceiptId(e.target.value)} className="crm-select">
                <option value="">Unallocated payment</option>
                {supplierReceipts.map((receipt) => (
                  <option key={receipt.id} value={receipt.id}>
                    {receipt.receiptNumber} · Outstanding {formatCurrency(receipt.outstandingAmount)}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label>
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Amount</div>
                <input type="number" min="0" step="0.01" value={form.amount || ""} onChange={(e) => updateForm("amount", Number(e.target.value))} className="crm-field" />
              </label>
              <label>
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Payment Date</div>
                <input type="date" value={form.paymentDate || ""} onChange={(e) => updateForm("paymentDate", e.target.value)} className="crm-field" />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label>
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Payment Method</div>
                <select value={form.paymentMethod} onChange={(e) => updateForm("paymentMethod", e.target.value)} className="crm-select">
                  <option value="CASH">Cash</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="CARD">Card</option>
                  <option value="UPI">UPI</option>
                </select>
              </label>
              <label>
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Reference Number</div>
                <input value={form.referenceNumber || ""} onChange={(e) => updateForm("referenceNumber", e.target.value)} className="crm-field" />
              </label>
            </div>

            <label className="block">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Remarks</div>
              <input value={form.remarks || ""} onChange={(e) => updateForm("remarks", e.target.value)} className="crm-field" />
            </label>

            {(error || successMessage) && (
              <div className="space-y-3">
                {error && (
                  <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                {successMessage && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {successMessage}
                  </div>
                )}
              </div>
            )}

            <button type="submit" disabled={isSubmitting || isLoading} className="w-full rounded-full bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
              {isSubmitting ? "Creating payment..." : "Create supplier payment"}
            </button>
          </div>
        </form>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search by payment number, method, or status" className="crm-field pl-11" />
          </div>

          <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200">
            <div className="hidden grid-cols-[1fr_0.9fr_0.9fr_0.8fr] gap-4 bg-slate-50 px-5 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 lg:grid">
              <div>Payment</div>
              <div>Date</div>
              <div>Amount</div>
              <div>Status</div>
            </div>

            <div className="divide-y divide-slate-200">
              {isLoading ? (
                <div className="px-6 py-16 text-center text-sm text-slate-500">Loading payments...</div>
              ) : filteredPayments.length > 0 ? (
                filteredPayments.map((payment) => (
                  <div key={payment.id} className="grid gap-4 px-5 py-5 lg:grid-cols-[1fr_0.9fr_0.9fr_0.8fr] lg:items-center">
                    <div>
                      <div className="text-base font-semibold text-slate-950">{payment.paymentNumber}</div>
                      <div className="mt-1 text-sm text-slate-500">Supplier #{payment.supplierId}</div>
                    </div>
                    <div className="text-sm text-slate-600">{new Date(payment.paymentDate).toLocaleDateString("en-IN")}</div>
                    <div className="text-sm font-medium text-slate-900">{formatCurrency(payment.amount)}</div>
                    <div>
                      <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{payment.status}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-6 py-16 text-center text-sm text-slate-500">No supplier payments found.</div>
              )}
            </div>
          </div>
        </section>
      </section>
    </div>
  );
}
