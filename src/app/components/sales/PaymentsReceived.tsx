import { AlertCircle, BadgeIndianRupee, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth";
import {
  createReceipt,
  fetchReceipts,
  fetchSalesCustomers,
  type CustomerReceiptResponse,
  type SalesCustomerSummary,
} from "./api";

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value ?? 0);
}

export function PaymentsReceived() {
  const { token, user } = useAuth();
  const [customers, setCustomers] = useState<SalesCustomerSummary[]>([]);
  const [receipts, setReceipts] = useState<CustomerReceiptResponse[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [amount, setAmount] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [remarks, setRemarks] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    async function loadData() {
      if (!token || !user?.organizationId) {
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const [customerResponse, receiptResponse] = await Promise.all([
          fetchSalesCustomers(token, user.organizationId),
          fetchReceipts(token, user.organizationId),
        ]);
        setCustomers(customerResponse);
        setReceipts(receiptResponse);

        if (customerResponse.length > 0) {
          setSelectedCustomerId(String(customerResponse[0].id));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load customer receipts.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadData();
  }, [token, user?.organizationId]);

  const filteredReceipts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return receipts.filter((receipt) => {
      if (!query) {
        return true;
      }

      return (
        receipt.receiptNumber.toLowerCase().includes(query) ||
        receipt.paymentMethod.toLowerCase().includes(query) ||
        receipt.status.toLowerCase().includes(query)
      );
    });
  }, [receipts, searchTerm]);

  const summary = filteredReceipts.reduce(
    (accumulator, receipt) => {
      accumulator.totalAmount += receipt.amount ?? 0;
      return accumulator;
    },
    { totalAmount: 0 },
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token || !user?.organizationId || !user.defaultBranchId) {
      setError("Organization or branch context is missing in the current session.");
      return;
    }

    if (!selectedCustomerId || !Number(amount)) {
      setError("Customer and a valid receipt amount are required.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setSuccessMessage("");

    try {
      const createdReceipt = await createReceipt(token, {
        organizationId: user.organizationId,
        branchId: user.defaultBranchId,
        customerId: Number(selectedCustomerId),
        receiptDate,
        paymentMethod,
        amount: Number(amount),
        referenceNumber: referenceNumber.trim() || undefined,
        remarks: remarks.trim() || undefined,
      });

      setReceipts((current) => [createdReceipt, ...current]);
      setAmount("");
      setReferenceNumber("");
      setRemarks("");
      setSuccessMessage(`Receipt ${createdReceipt.receiptNumber} created successfully.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create customer receipt.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Sales</div>
          <h1 className="mt-3 text-3xl font-semibold text-slate-950">Customer Receipts</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Live ERP customer receipt flow using `/api/erp/sales/receipts`.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Receipts</div>
          <div className="mt-4 text-3xl font-semibold text-slate-950">{filteredReceipts.length}</div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Collected</div>
          <div className="mt-4 text-3xl font-semibold text-slate-950">{formatCurrency(summary.totalAmount)}</div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Customers</div>
          <div className="mt-4 text-3xl font-semibold text-slate-950">{customers.length}</div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
              <BadgeIndianRupee className="h-5 w-5" />
            </div>
            <div>
              <div className="text-lg font-semibold text-slate-950">Record Receipt</div>
              <div className="text-sm text-slate-500">Create a customer receipt in the ERP backend</div>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <label className="block">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Customer</div>
              <select value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)} className="crm-select">
                <option value="">Select customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.fullName}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label>
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Receipt Date</div>
                <input type="date" value={receiptDate} onChange={(e) => setReceiptDate(e.target.value)} className="crm-field" />
              </label>
              <label>
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Payment Method</div>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="crm-select">
                  <option value="CASH">Cash</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CARD">Card</option>
                  <option value="UPI">UPI</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </label>
            </div>

            <label className="block">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Amount</div>
              <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="crm-field" />
            </label>

            <label className="block">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Reference Number</div>
              <input value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} className="crm-field" placeholder="Optional payment reference" />
            </label>

            <label className="block">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Remarks</div>
              <input value={remarks} onChange={(e) => setRemarks(e.target.value)} className="crm-field" placeholder="Optional receipt notes" />
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
              {isSubmitting ? "Creating receipt..." : "Create customer receipt"}
            </button>
          </div>
        </form>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by receipt number, method, or status"
              className="crm-field pl-11"
            />
          </div>

          <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200">
            <div className="hidden grid-cols-[1fr_0.9fr_0.9fr_0.8fr] gap-4 bg-slate-50 px-5 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 lg:grid">
              <div>Receipt</div>
              <div>Date</div>
              <div>Amount</div>
              <div>Status</div>
            </div>

            <div className="divide-y divide-slate-200">
              {isLoading ? (
                <div className="px-6 py-16 text-center text-sm text-slate-500">Loading receipts...</div>
              ) : filteredReceipts.length > 0 ? (
                filteredReceipts.map((receipt) => (
                  <div key={receipt.id} className="grid gap-4 px-5 py-5 lg:grid-cols-[1fr_0.9fr_0.9fr_0.8fr] lg:items-center">
                    <div>
                      <div className="text-base font-semibold text-slate-950">{receipt.receiptNumber}</div>
                      <div className="mt-1 text-sm text-slate-500">Customer #{receipt.customerId}</div>
                    </div>
                    <div className="text-sm text-slate-600">{new Date(receipt.receiptDate).toLocaleDateString("en-IN")}</div>
                    <div className="text-sm font-medium text-slate-900">{formatCurrency(receipt.amount)}</div>
                    <div>
                      <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{receipt.status}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-6 py-16 text-center text-sm text-slate-500">No receipts found.</div>
              )}
            </div>
          </div>
        </section>
      </section>
    </div>
  );
}
