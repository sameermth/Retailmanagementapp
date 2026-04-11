import { AlertCircle, CirclePlus, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth";
import { DataTable, type DataTableColumn } from "../ui/data-table";
import {
  createPurchaseReturn,
  fetchPurchaseReceipt,
  fetchPurchaseReceipts,
  fetchPurchaseReturns,
  type PurchaseReceiptDetailResponse,
  type PurchaseReceiptSummaryResponse,
  type PurchaseReturnSummaryResponse,
} from "./api";

interface ReturnLineDraft {
  originalPurchaseReceiptLineId: number;
  productId: number;
  productName: string | null;
  maxQuantity: number;
  quantity: string;
}

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(value ?? 0);
}

export function PurchaseReturns() {
  const { token, user } = useAuth();
  const [returns, setReturns] = useState<PurchaseReturnSummaryResponse[]>([]);
  const [receipts, setReceipts] = useState<PurchaseReceiptSummaryResponse[]>([]);
  const [receiptDetail, setReceiptDetail] = useState<PurchaseReceiptDetailResponse | null>(null);
  const [selectedReceiptId, setSelectedReceiptId] = useState("");
  const [returnDate, setReturnDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState("");
  const [remarks, setRemarks] = useState("");
  const [lineDrafts, setLineDrafts] = useState<ReturnLineDraft[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReceiptLoading, setIsReceiptLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    async function loadData() {
      if (!token || !user?.organizationId) return;
      setIsLoading(true);
      setError("");
      try {
        const [returnsResponse, receiptsResponse] = await Promise.all([
          fetchPurchaseReturns(token, user.organizationId),
          fetchPurchaseReceipts(token, user.organizationId),
        ]);
        setReturns(returnsResponse);
        setReceipts(receiptsResponse);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load purchase returns.");
      } finally {
        setIsLoading(false);
      }
    }
    void loadData();
  }, [token, user?.organizationId]);

  useEffect(() => {
    async function loadReceiptDetail() {
      if (!token || !selectedReceiptId) {
        setReceiptDetail(null);
        setLineDrafts([]);
        return;
      }
      setIsReceiptLoading(true);
      setError("");
      try {
        const detail = await fetchPurchaseReceipt(token, Number(selectedReceiptId));
        setReceiptDetail(detail);
        setLineDrafts(
          detail.lines.map((line) => ({
            originalPurchaseReceiptLineId: line.id,
            productId: line.productId,
            productName: line.productName,
            maxQuantity: Number(line.quantity),
            quantity: "",
          })),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load purchase receipt details.");
      } finally {
        setIsReceiptLoading(false);
      }
    }
    void loadReceiptDetail();
  }, [selectedReceiptId, token]);

  const eligibleReceipts = useMemo(
    () => receipts.filter((receipt) => receipt.status !== "CANCELLED"),
    [receipts],
  );

  const returnColumns = useMemo<DataTableColumn<PurchaseReturnSummaryResponse>[]>(
    () => [
      {
        key: "return",
        header: "Return",
        value: (item) => `${item.returnNumber} ${item.originalPurchaseReceiptId}`,
        render: (item) => (
          <div>
            <div className="text-base font-semibold text-slate-950">{item.returnNumber}</div>
            <div className="mt-1 text-sm text-slate-500">Original receipt #{item.originalPurchaseReceiptId}</div>
          </div>
        ),
      },
      {
        key: "date",
        header: "Date",
        value: (item) => item.returnDate,
        render: (item) => (
          <span className="text-sm text-slate-600">{new Date(item.returnDate).toLocaleDateString("en-IN")}</span>
        ),
      },
      {
        key: "total",
        header: "Total",
        value: (item) => item.totalAmount,
        render: (item) => <span className="text-sm font-medium text-slate-900">{formatCurrency(item.totalAmount)}</span>,
      },
      {
        key: "status",
        header: "Status",
        value: (item) => item.status,
        render: (item) => (
          <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
            {item.status}
          </span>
        ),
      },
    ],
    [],
  );

  function updateQuantity(lineId: number, quantity: string) {
    setLineDrafts((current) =>
      current.map((line) => {
        if (line.originalPurchaseReceiptLineId !== lineId) {
          return line;
        }

        if (!quantity) {
          return { ...line, quantity: "" };
        }

        const numeric = Number(quantity);
        if (!Number.isFinite(numeric)) {
          return line;
        }

        const bounded = Math.min(Math.max(numeric, 0), line.maxQuantity);
        return { ...line, quantity: String(bounded) };
      }),
    );
  }

  async function handleCreateReturn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !user?.organizationId || !user.defaultBranchId || !receiptDetail) {
      setError("Organization, branch, and source receipt are required.");
      return;
    }

    const invalidLine = lineDrafts.find((draft) => Number(draft.quantity) > draft.maxQuantity);
    if (invalidLine) {
      setError("One or more return quantities exceed the original received quantity.");
      return;
    }

    const lines = lineDrafts
      .map((draft) => {
        const quantity = Number(draft.quantity);
        return quantity > 0
          ? {
              originalPurchaseReceiptLineId: draft.originalPurchaseReceiptLineId,
              quantity,
              baseQuantity: quantity,
              reason: reason.trim() || undefined,
            }
          : null;
      })
      .filter((line): line is NonNullable<typeof line> => Boolean(line));

    if (lines.length === 0) {
      setError("Add at least one return line quantity.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setSuccessMessage("");
    try {
      await createPurchaseReturn(token, {
        organizationId: user.organizationId,
        branchId: user.defaultBranchId,
        originalPurchaseReceiptId: receiptDetail.id,
        returnDate,
        reason: reason.trim() || undefined,
        remarks: remarks.trim() || undefined,
        lines,
      });
      const [returnsResponse, receiptsResponse] = await Promise.all([
        fetchPurchaseReturns(token, user.organizationId),
        fetchPurchaseReceipts(token, user.organizationId),
      ]);
      setReturns(returnsResponse);
      setReceipts(receiptsResponse);
      setSuccessMessage("Purchase return created.");
      setSelectedReceiptId("");
      setReceiptDetail(null);
      setLineDrafts([]);
      setReason("");
      setRemarks("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create purchase return.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Purchases</div>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">Purchase Returns</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Create returns from live purchase receipt lines through `/api/erp/returns/purchases`, then review the posted register below.
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-[520px_minmax(0,1fr)] 2xl:grid-cols-[560px_minmax(0,1fr)]">
        <form onSubmit={handleCreateReturn} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-slate-100 p-3 text-slate-700"><CirclePlus className="h-5 w-5" /></div>
            <div>
              <div className="text-lg font-semibold text-slate-950">Create Purchase Return</div>
              <div className="text-sm text-slate-500">Select a receipt and return against original line IDs</div>
            </div>
          </div>
          <div className="mt-6 space-y-4">
            <select value={selectedReceiptId} onChange={(e) => setSelectedReceiptId(e.target.value)} className="crm-select">
              <option value="">Select source receipt</option>
              {eligibleReceipts.map((receipt) => (
                <option key={receipt.id} value={receipt.id}>
                  {receipt.receiptNumber} - Supplier #{receipt.supplierId}
                </option>
              ))}
            </select>
            <div className="grid gap-4 md:grid-cols-2">
              <input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} className="crm-field" />
              <input value={reason} onChange={(e) => setReason(e.target.value)} className="crm-field" placeholder="Return reason" />
            </div>
            <input value={remarks} onChange={(e) => setRemarks(e.target.value)} className="crm-field" placeholder="Remarks" />

            {isReceiptLoading ? <div className="text-sm text-slate-500">Loading receipt lines...</div> : null}

            {receiptDetail ? (
              <div className="space-y-3">
                {receiptDetail.lines.map((line) => {
                  const draft = lineDrafts.find((item) => item.originalPurchaseReceiptLineId === line.id);
                  return (
                    <div key={line.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-sm font-semibold text-slate-950">{line.productName ?? `Product #${line.productId}`}</div>
                          <div className="mt-1 text-xs text-slate-500">Receipt line #{line.id}</div>
                          <div className="mt-1 text-xs text-slate-500">Received qty: {line.quantity}</div>
                          <div className="mt-1 text-xs text-slate-500">Max returnable: {draft?.maxQuantity ?? Number(line.quantity)}</div>
                        </div>
                        <input
                          value={draft?.quantity ?? ""}
                          onChange={(e) => updateQuantity(line.id, e.target.value)}
                          type="number"
                          min="0"
                          max={draft?.maxQuantity ?? Number(line.quantity)}
                          step="0.001"
                          className="crm-field w-28"
                          placeholder="Return qty"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                Pick a purchase receipt to load original line references for the return.
              </div>
            )}

            {(error || successMessage) && (
              <div className="space-y-3">
                {error ? <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"><AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" /><span>{error}</span></div> : null}
                {successMessage ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{successMessage}</div> : null}
              </div>
            )}

            <button type="submit" disabled={isSubmitting || isLoading || isReceiptLoading} className="w-full rounded-full bg-slate-950 px-4 py-3 text-sm font-medium text-white disabled:opacity-60">
              {isSubmitting ? "Creating..." : "Create purchase return"}
            </button>
          </div>
        </form>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="overflow-hidden rounded-3xl border border-slate-200">
            {isLoading ? (
              <div className="px-6 py-16 text-center text-sm text-slate-500">Loading purchase returns...</div>
            ) : returns.length > 0 ? (
              <DataTable
                columns={returnColumns}
                rows={returns}
                rowKey={(item) => item.id}
                className="overflow-x-auto"
              />
            ) : (
              <div className="px-6 py-16 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                  <RotateCcw className="h-6 w-6" />
                </div>
                <h2 className="mt-4 text-lg font-semibold text-slate-950">No purchase returns yet</h2>
              </div>
            )}
          </div>
        </section>
      </section>
    </div>
  );
}
