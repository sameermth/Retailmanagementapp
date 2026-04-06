import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value ?? 0);
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "-";
  }
  return new Date(value).toLocaleDateString("en-IN");
}

interface DetailRow {
  label: string;
  value: string;
}

interface DetailLine {
  id: number;
  productId: number;
  hsnCode?: string | null;
  quantity: number;
  taxableAmount?: number | null;
  taxRate?: number | null;
  cgstAmount?: number | null;
  sgstAmount?: number | null;
  igstAmount?: number | null;
  cessAmount?: number | null;
  unitPrice?: number | null;
  lineAmount?: number | null;
  remarks?: string | null;
}

interface DocumentDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  loading?: boolean;
  rows: DetailRow[];
  lines?: DetailLine[];
  pdfUrl?: string | null;
  pdfLoading?: boolean;
  pdfError?: string;
  onLoadPdf?: () => void;
  onPrintPdf?: () => void;
  pdfLabel?: string;
  children?: ReactNode;
}

export function DocumentDetailsDialog({
  open,
  onOpenChange,
  title,
  description,
  loading,
  rows,
  lines = [],
  pdfUrl,
  pdfLoading,
  pdfError,
  onLoadPdf,
  onPrintPdf,
  pdfLabel,
  children,
}: DocumentDetailsDialogProps) {
  const hasTaxBreakdown = lines.some(
    (line) =>
      line.hsnCode ||
      line.taxableAmount != null ||
      line.taxRate != null ||
      line.cgstAmount != null ||
      line.sgstAmount != null ||
      line.igstAmount != null ||
      line.cessAmount != null,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-10 text-sm text-slate-500">Loading document details...</div>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-3 md:grid-cols-2">
              {rows.map((row) => (
                <div key={row.label} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    {row.label}
                  </div>
                  <div className="mt-2 text-sm font-medium text-slate-900">{row.value || "-"}</div>
                </div>
              ))}
            </div>

            {lines.length > 0 ? (
              <div className="overflow-hidden rounded-3xl border border-slate-200">
                {hasTaxBreakdown ? (
                  <div className="hidden grid-cols-[1.2fr_0.7fr_0.8fr_0.8fr_0.8fr_0.7fr_0.7fr_0.7fr_0.7fr_0.9fr] gap-4 bg-slate-50 px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 xl:grid">
                    <div>Product</div>
                    <div>HSN</div>
                    <div>Qty</div>
                    <div>Taxable</div>
                    <div>Tax Rate</div>
                    <div>CGST</div>
                    <div>SGST</div>
                    <div>IGST</div>
                    <div>CESS</div>
                    <div>Line Amount</div>
                  </div>
                ) : (
                  <div className="hidden grid-cols-[0.8fr_0.8fr_0.9fr_1fr] gap-4 bg-slate-50 px-5 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 lg:grid">
                    <div>Product</div>
                    <div>Qty</div>
                    <div>Unit Price</div>
                    <div>Line Amount</div>
                  </div>
                )}
                <div className="divide-y divide-slate-200">
                  {lines.map((line) => (
                    hasTaxBreakdown ? (
                      <div key={line.id} className="grid gap-4 px-5 py-4 xl:grid-cols-[1.2fr_0.7fr_0.8fr_0.8fr_0.8fr_0.7fr_0.7fr_0.7fr_0.7fr_0.9fr] xl:items-center">
                        <div>
                          <div className="text-sm font-medium text-slate-950">Product #{line.productId}</div>
                          {line.remarks ? <div className="mt-1 text-xs text-slate-500">{line.remarks}</div> : null}
                        </div>
                        <div className="text-sm text-slate-700">{line.hsnCode || "-"}</div>
                        <div className="text-sm text-slate-700">{line.quantity}</div>
                        <div className="text-sm text-slate-700">{formatCurrency(line.taxableAmount)}</div>
                        <div className="text-sm text-slate-700">{line.taxRate != null ? `${line.taxRate}%` : "-"}</div>
                        <div className="text-sm text-slate-700">{formatCurrency(line.cgstAmount)}</div>
                        <div className="text-sm text-slate-700">{formatCurrency(line.sgstAmount)}</div>
                        <div className="text-sm text-slate-700">{formatCurrency(line.igstAmount)}</div>
                        <div className="text-sm text-slate-700">{formatCurrency(line.cessAmount)}</div>
                        <div className="text-sm font-medium text-slate-900">{formatCurrency(line.lineAmount)}</div>
                      </div>
                    ) : (
                      <div key={line.id} className="grid gap-4 px-5 py-4 lg:grid-cols-[0.8fr_0.8fr_0.9fr_1fr] lg:items-center">
                        <div>
                          <div className="text-sm font-medium text-slate-950">Product #{line.productId}</div>
                          {line.remarks ? <div className="mt-1 text-xs text-slate-500">{line.remarks}</div> : null}
                        </div>
                        <div className="text-sm text-slate-700">{line.quantity}</div>
                        <div className="text-sm text-slate-700">{formatCurrency(line.unitPrice)}</div>
                        <div className="text-sm font-medium text-slate-900">{formatCurrency(line.lineAmount)}</div>
                      </div>
                    )
                  ))}
                </div>
              </div>
            ) : null}

            {children}

            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Print Preview
                  </div>
                  <div className="mt-1 text-sm text-slate-600">
                    {pdfLabel
                      ? `Showing ${pdfLabel}. You can print or download it for the customer.`
                      : "Open the backend-generated PDF, then print or download it for the customer."}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onLoadPdf}
                    disabled={pdfLoading}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {pdfUrl ? "Refresh PDF" : pdfLoading ? "Loading PDF..." : "Load PDF"}
                  </button>
                  <button
                    type="button"
                    onClick={onPrintPdf}
                    disabled={!pdfUrl}
                    className="rounded-full bg-slate-950 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Print
                  </button>
                </div>
              </div>

              {pdfError ? (
                <div className="px-5 py-4 text-sm text-rose-700">{pdfError}</div>
              ) : pdfUrl ? (
                <iframe
                  title={`${title} PDF`}
                  src={pdfUrl}
                  className="h-[60vh] w-full bg-white"
                />
              ) : (
                <div className="px-5 py-10 text-sm text-slate-500">
                  Load the generated PDF to preview the printable document here.
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          {pdfUrl ? (
            <a
              href={pdfUrl}
              download={`${title}.pdf`}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Download PDF
            </a>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { formatCurrency, formatDate };
