import { AlertCircle, CirclePlus, ReceiptText, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "../../auth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  allocateReceipt,
  createServiceAgreement,
  createReceipt,
  createWarrantyExtension,
  fetchOwnershipWarrantySummary,
  fetchServiceAgreement,
  fetchServiceAgreements,
  fetchReceiptPdf,
  fetchInvoice,
  fetchInvoicePdf,
  fetchInvoices,
  fetchStoreProductsForSales,
  type SalesInvoiceAllocationResponse,
  type SalesInvoiceDetailResponse,
  type SalesInvoiceSummaryResponse,
  type OwnershipWarrantySummaryResponse,
  type ServiceAgreementResponse,
  type StoreProductOption,
} from "./api";
import { DocumentDetailsDialog, formatCurrency, formatDate } from "./DocumentDetailsDialog";

interface AgreementLineDraft {
  salesInvoiceLineId: number;
  productId: number;
  selected: boolean;
  coverageScope: "FULL" | "LABOR_ONLY" | "PARTS_ONLY" | "VISIT_ONLY";
  includedServiceNotes: string;
}

interface InvoiceOwnershipEntry {
  ownershipId: number;
  lineId: number;
  productId: number;
}

function addMonthsToDate(dateValue: string, months: number) {
  const nextDate = new Date(dateValue);
  nextDate.setMonth(nextDate.getMonth() + months);
  return nextDate.toISOString().slice(0, 10);
}

export function InvoicesList() {
  const { token, user, hasAnyPermission } = useAuth();
  const [invoices, setInvoices] = useState<SalesInvoiceSummaryResponse[]>([]);
  const [products, setProducts] = useState<StoreProductOption[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<SalesInvoiceDetailResponse | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [invoicePdfUrl, setInvoicePdfUrl] = useState<string | null>(null);
  const [isInvoicePdfLoading, setIsInvoicePdfLoading] = useState(false);
  const [invoicePdfError, setInvoicePdfError] = useState("");
  const [activePdfLabel, setActivePdfLabel] = useState("");
  const [receiptPreviewLoadingId, setReceiptPreviewLoadingId] = useState<number | null>(null);
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [receiptAmount, setReceiptAmount] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [receiptRemarks, setReceiptRemarks] = useState("");
  const [isCollectingPayment, setIsCollectingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [paymentSuccess, setPaymentSuccess] = useState("");
  const [invoiceAgreements, setInvoiceAgreements] = useState<ServiceAgreementResponse[]>([]);
  const [isAgreementLoading, setIsAgreementLoading] = useState(false);
  const [isAgreementSubmitting, setIsAgreementSubmitting] = useState(false);
  const [agreementError, setAgreementError] = useState("");
  const [agreementSuccess, setAgreementSuccess] = useState("");
  const [agreementType, setAgreementType] = useState<"AMC" | "INSTALLATION_SUPPORT" | "SERVICE_CONTRACT" | "PREVENTIVE_MAINTENANCE">("AMC");
  const [agreementStatus, setAgreementStatus] = useState<"DRAFT" | "ACTIVE">("ACTIVE");
  const [agreementStartDate, setAgreementStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [agreementEndDate, setAgreementEndDate] = useState(addMonthsToDate(new Date().toISOString().slice(0, 10), 12));
  const [agreementAmount, setAgreementAmount] = useState("");
  const [slaHours, setSlaHours] = useState("");
  const [visitLimit, setVisitLimit] = useState("");
  const [preventiveVisitsIncluded, setPreventiveVisitsIncluded] = useState("");
  const [agreementNotes, setAgreementNotes] = useState("");
  const [laborIncluded, setLaborIncluded] = useState(true);
  const [partsIncluded, setPartsIncluded] = useState(false);
  const [agreementLines, setAgreementLines] = useState<AgreementLineDraft[]>([]);
  const [selectedAgreementId, setSelectedAgreementId] = useState<number | null>(null);
  const [selectedAgreement, setSelectedAgreement] = useState<ServiceAgreementResponse | null>(null);
  const [isSelectedAgreementLoading, setIsSelectedAgreementLoading] = useState(false);
  const [selectedAgreementError, setSelectedAgreementError] = useState("");
  const [warrantySummaries, setWarrantySummaries] = useState<Record<number, OwnershipWarrantySummaryResponse>>({});
  const [isWarrantyLoading, setIsWarrantyLoading] = useState(false);
  const [warrantyError, setWarrantyError] = useState("");
  const [selectedOwnershipId, setSelectedOwnershipId] = useState<number | null>(null);
  const [warrantyExtensionType, setWarrantyExtensionType] = useState<"PAID_EXTENDED" | "MANUFACTURER_PROMO" | "GOODWILL" | "MANUAL_CORRECTION">("PAID_EXTENDED");
  const [warrantyMonthsAdded, setWarrantyMonthsAdded] = useState("12");
  const [warrantyAmount, setWarrantyAmount] = useState("");
  const [warrantyReferenceNumber, setWarrantyReferenceNumber] = useState("");
  const [warrantyReason, setWarrantyReason] = useState("");
  const [warrantyRemarks, setWarrantyRemarks] = useState("");
  const [isWarrantySubmitting, setIsWarrantySubmitting] = useState(false);
  const [warrantySubmitError, setWarrantySubmitError] = useState("");
  const [warrantySubmitSuccess, setWarrantySubmitSuccess] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const canViewService = hasAnyPermission(["service.view", "erp.service.view", "service.read"]);
  const canManageService = hasAnyPermission(["service.manage", "erp.service.manage", "service.create"]);

  useEffect(
    () => () => {
      if (invoicePdfUrl) {
        URL.revokeObjectURL(invoicePdfUrl);
      }
    },
    [invoicePdfUrl],
  );

  async function loadInvoices() {
    if (!token || !user?.organizationId) {
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      setInvoices(await fetchInvoices(token, user.organizationId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load invoices.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadInvoices();
  }, [token, user?.organizationId]);

  useEffect(() => {
    if (!token || !user?.organizationId) {
      return;
    }

    void (async () => {
      try {
        setProducts(await fetchStoreProductsForSales(token, user.organizationId));
      } catch {
        setProducts([]);
      }
    })();
  }, [token, user?.organizationId]);

  function getProductLabel(productId: number) {
    const product = products.find((entry) => entry.id === productId);
    if (!product) {
      return `Product #${productId}`;
    }
    return product.sku ? `${product.name} (${product.sku})` : product.name;
  }

  function resetAgreementDraft(invoice: SalesInvoiceDetailResponse) {
    const nextStartDate = invoice.invoiceDate || new Date().toISOString().slice(0, 10);
    setAgreementType("AMC");
    setAgreementStatus("ACTIVE");
    setAgreementStartDate(nextStartDate);
    setAgreementEndDate(addMonthsToDate(nextStartDate, 12));
    setAgreementAmount("");
    setSlaHours("");
    setVisitLimit("");
    setPreventiveVisitsIncluded("");
    setAgreementNotes("");
    setLaborIncluded(true);
    setPartsIncluded(false);
    setAgreementLines(
      (invoice.lines ?? []).map((line) => ({
        salesInvoiceLineId: line.id,
        productId: line.productId,
        selected: true,
        coverageScope: "FULL",
        includedServiceNotes: "",
      })),
    );
  }

  function getInvoiceOwnershipEntries(invoice: SalesInvoiceDetailResponse): InvoiceOwnershipEntry[] {
    return (invoice.lines ?? []).flatMap((line) => {
      const ids = line.productOwnershipIds?.length
        ? line.productOwnershipIds
        : line.productOwnershipId != null
          ? [line.productOwnershipId]
          : [];

      return ids.map((ownershipId) => ({
        ownershipId,
        lineId: line.id,
        productId: line.productId,
      }));
    });
  }

  async function refreshWarrantySummaries(invoice: SalesInvoiceDetailResponse) {
    if (!token || !user?.organizationId || !canViewService) {
      setWarrantySummaries({});
      return;
    }

    const ownershipEntries = getInvoiceOwnershipEntries(invoice);
    if (ownershipEntries.length === 0) {
      setWarrantySummaries({});
      return;
    }

    setIsWarrantyLoading(true);
    setWarrantyError("");

    try {
      const summaries = await Promise.all(
        ownershipEntries.map((entry) =>
          fetchOwnershipWarrantySummary(token, entry.ownershipId, user.organizationId),
        ),
      );

      setWarrantySummaries(
        summaries.reduce<Record<number, OwnershipWarrantySummaryResponse>>((accumulator, summary) => {
          accumulator[summary.productOwnershipId] = summary;
          return accumulator;
        }, {}),
      );
    } catch (err) {
      setWarrantyError(err instanceof Error ? err.message : "Failed to load ownership warranty details.");
    } finally {
      setIsWarrantyLoading(false);
    }
  }

  async function refreshInvoiceAgreements(invoiceId: number) {
    if (!token || !user?.organizationId || !canViewService) {
      setInvoiceAgreements([]);
      return;
    }

    setIsAgreementLoading(true);
    setAgreementError("");

    try {
      const agreements = await fetchServiceAgreements(token, user.organizationId);
      setInvoiceAgreements(
        agreements.filter((agreement) => agreement.salesInvoiceId === invoiceId),
      );
    } catch (err) {
      setAgreementError(err instanceof Error ? err.message : "Failed to load service agreements.");
    } finally {
      setIsAgreementLoading(false);
    }
  }

  const filteredInvoices = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return invoices.filter((invoice) => {
      if (!query) {
        return true;
      }

      return (
        invoice.invoiceNumber.toLowerCase().includes(query) ||
        invoice.status.toLowerCase().includes(query)
      );
    });
  }, [invoices, searchTerm]);

  const totals = useMemo(
    () =>
      filteredInvoices.reduce(
        (summary, invoice) => {
          summary.totalAmount += invoice.totalAmount ?? 0;
          summary.balanceDue += invoice.outstandingAmount ?? 0;
          return summary;
        },
        { totalAmount: 0, balanceDue: 0 },
      ),
    [filteredInvoices],
  );

  async function openDetails(invoiceId: number) {
    if (!token) {
      return;
    }

    if (invoicePdfUrl) {
      URL.revokeObjectURL(invoicePdfUrl);
      setInvoicePdfUrl(null);
    }
    setInvoicePdfError("");
    setActivePdfLabel("");
    setPaymentError("");
    setPaymentSuccess("");
    setReceiptDate(new Date().toISOString().slice(0, 10));
    setPaymentMethod("CASH");
    setReceiptAmount("");
    setReferenceNumber("");
    setReceiptRemarks("");
    setAgreementError("");
    setAgreementSuccess("");
    setSelectedAgreementId(null);
    setSelectedAgreement(null);
    setSelectedAgreementError("");
    setSelectedOwnershipId(null);
    setWarrantySubmitError("");
    setWarrantySubmitSuccess("");
    setWarrantyError("");
    setSelectedInvoiceId(invoiceId);
    setIsDetailsLoading(true);

    try {
      const invoice = await fetchInvoice(token, invoiceId);
      setSelectedInvoice(invoice);
      resetAgreementDraft(invoice);
      const ownershipEntries = getInvoiceOwnershipEntries(invoice);
      setSelectedOwnershipId(ownershipEntries[0]?.ownershipId ?? null);
      await Promise.all([
        refreshInvoiceAgreements(invoice.id),
        refreshWarrantySummaries(invoice),
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load invoice details.");
    } finally {
      setIsDetailsLoading(false);
    }
  }

  async function handleCollectPayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token || !user?.organizationId || !selectedInvoice) {
      setPaymentError("Invoice, organization, or branch context is missing.");
      return;
    }

    const branchId = user.defaultBranchId ?? selectedInvoice.branchId;
    if (!branchId) {
      setPaymentError("Invoice, organization, or branch context is missing.");
      return;
    }

    const numericAmount = Number(receiptAmount);
    const outstandingAmount = selectedInvoice.outstandingAmount ?? 0;

    if (!numericAmount || numericAmount <= 0) {
      setPaymentError("Enter a valid payment amount.");
      return;
    }

    if (numericAmount > outstandingAmount) {
      setPaymentError("Allocated amount cannot exceed the current outstanding balance.");
      return;
    }

    setIsCollectingPayment(true);
    setPaymentError("");
    setPaymentSuccess("");

    try {
      const receipt = await createReceipt(token, {
        organizationId: user.organizationId,
        branchId,
        customerId: selectedInvoice.customerId,
        receiptDate,
        paymentMethod,
        amount: numericAmount,
        referenceNumber: referenceNumber.trim() || undefined,
        remarks: receiptRemarks.trim() || undefined,
      });

      await allocateReceipt(token, receipt.id, {
        allocations: [
          {
            salesInvoiceId: selectedInvoice.id,
            allocatedAmount: numericAmount,
          },
        ],
      });

      const [freshInvoice, freshInvoices] = await Promise.all([
        fetchInvoice(token, selectedInvoice.id),
        fetchInvoices(token, user.organizationId),
      ]);

      setSelectedInvoice(freshInvoice);
      setInvoices(freshInvoices);
      setReceiptAmount("");
      setReferenceNumber("");
      setReceiptRemarks("");
      setPaymentSuccess(`Receipt ${receipt.receiptNumber} created and allocated to invoice ${freshInvoice.invoiceNumber}.`);
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : "Failed to collect and allocate payment.");
    } finally {
      setIsCollectingPayment(false);
    }
  }

  function updateAgreementLine(
    salesInvoiceLineId: number,
    updates: Partial<AgreementLineDraft>,
  ) {
    setAgreementLines((currentLines) =>
      currentLines.map((line) =>
        line.salesInvoiceLineId === salesInvoiceLineId ? { ...line, ...updates } : line,
      ),
    );
  }

  async function handleCreateAgreement(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token || !user?.organizationId || !selectedInvoice) {
      setAgreementError("Invoice, organization, or branch context is missing.");
      return;
    }

    const branchId = user.defaultBranchId ?? selectedInvoice.branchId;
    if (!branchId) {
      setAgreementError("Invoice, organization, or branch context is missing.");
      return;
    }

    const selectedLines = agreementLines.filter((line) => line.selected);
    if (selectedLines.length === 0) {
      setAgreementError("Select at least one invoice line to cover under the agreement.");
      return;
    }

    if (!agreementStartDate || !agreementEndDate) {
      setAgreementError("Start date and end date are required.");
      return;
    }

    if (agreementEndDate < agreementStartDate) {
      setAgreementError("Agreement end date cannot be before the start date.");
      return;
    }

    setIsAgreementSubmitting(true);
    setAgreementError("");
    setAgreementSuccess("");

    try {
      const createdAgreement = await createServiceAgreement(token, {
        organizationId: user.organizationId,
        branchId,
        customerId: selectedInvoice.customerId,
        salesInvoiceId: selectedInvoice.id,
        agreementType,
        status: agreementStatus,
        serviceStartDate: agreementStartDate,
        serviceEndDate: agreementEndDate,
        laborIncluded,
        partsIncluded,
        preventiveVisitsIncluded: preventiveVisitsIncluded ? Number(preventiveVisitsIncluded) : undefined,
        visitLimit: visitLimit ? Number(visitLimit) : undefined,
        slaHours: slaHours ? Number(slaHours) : undefined,
        agreementAmount: agreementAmount ? Number(agreementAmount) : undefined,
        notes: agreementNotes.trim() || undefined,
        items: selectedLines.map((line) => ({
          productId: line.productId,
          salesInvoiceLineId: line.salesInvoiceLineId,
          coverageScope: line.coverageScope,
          includedServiceNotes: line.includedServiceNotes.trim() || undefined,
        })),
      });

      await refreshInvoiceAgreements(selectedInvoice.id);
      setSelectedAgreement(createdAgreement);
      setSelectedAgreementId(createdAgreement.id);
      setAgreementSuccess(`Agreement ${createdAgreement.agreementNumber} created for invoice ${selectedInvoice.invoiceNumber}.`);
      resetAgreementDraft(selectedInvoice);
    } catch (err) {
      setAgreementError(err instanceof Error ? err.message : "Failed to create service agreement.");
    } finally {
      setIsAgreementSubmitting(false);
    }
  }

  async function openAgreementDetails(agreementId: number) {
    if (!token) {
      return;
    }

    setSelectedAgreementId(agreementId);
    setIsSelectedAgreementLoading(true);
    setSelectedAgreementError("");

    try {
      setSelectedAgreement(await fetchServiceAgreement(token, agreementId));
    } catch (err) {
      setSelectedAgreementError(err instanceof Error ? err.message : "Failed to load agreement details.");
    } finally {
      setIsSelectedAgreementLoading(false);
    }
  }

  async function handleCreateWarrantyExtension(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token || !user?.organizationId || !selectedInvoice || !selectedOwnershipId) {
      setWarrantySubmitError("Ownership, invoice, or organization context is missing.");
      return;
    }

    const branchId = user.defaultBranchId ?? selectedInvoice.branchId;
    if (!branchId) {
      setWarrantySubmitError("Ownership, invoice, or branch context is missing.");
      return;
    }

    const monthsAdded = Number(warrantyMonthsAdded);
    if (!monthsAdded || monthsAdded <= 0) {
      setWarrantySubmitError("Enter a valid warranty extension period in months.");
      return;
    }

    setIsWarrantySubmitting(true);
    setWarrantySubmitError("");
    setWarrantySubmitSuccess("");

    try {
      const extension = await createWarrantyExtension(token, selectedOwnershipId, {
        organizationId: user.organizationId,
        branchId,
        extensionType: warrantyExtensionType,
        monthsAdded,
        amount: warrantyAmount ? Number(warrantyAmount) : undefined,
        referenceNumber: warrantyReferenceNumber.trim() || undefined,
        reason: warrantyReason.trim() || undefined,
        remarks: warrantyRemarks.trim() || undefined,
      });

      await refreshWarrantySummaries(selectedInvoice);
      setWarrantySubmitSuccess(
        `Warranty extension ${extension.referenceNumber || `#${extension.id}`} created for ownership #${selectedOwnershipId}.`,
      );
      setWarrantyMonthsAdded("12");
      setWarrantyAmount("");
      setWarrantyReferenceNumber("");
      setWarrantyReason("");
      setWarrantyRemarks("");
    } catch (err) {
      setWarrantySubmitError(err instanceof Error ? err.message : "Failed to create warranty extension.");
    } finally {
      setIsWarrantySubmitting(false);
    }
  }

  async function previewInvoiceReceipt(receipt: SalesInvoiceAllocationResponse) {
    if (!token) {
      return;
    }

    setReceiptPreviewLoadingId(receipt.customerReceiptId);
    setInvoicePdfError("");

    try {
      const pdfBlob = await fetchReceiptPdf(token, receipt.customerReceiptId);
      if (invoicePdfUrl) {
        URL.revokeObjectURL(invoicePdfUrl);
      }
      setInvoicePdfUrl(URL.createObjectURL(pdfBlob));
      setActivePdfLabel(`receipt ${receipt.receiptNumber}`);
    } catch (err) {
      setInvoicePdfError(err instanceof Error ? err.message : "Failed to load receipt PDF.");
    } finally {
      setReceiptPreviewLoadingId(null);
    }
  }

  function printInvoiceReceipt(receipt: SalesInvoiceAllocationResponse) {
    if (activePdfLabel === `receipt ${receipt.receiptNumber}` && invoicePdfUrl) {
      const previewWindow = window.open(invoicePdfUrl, "_blank", "noopener,noreferrer");
      previewWindow?.addEventListener("load", () => previewWindow.print(), { once: true });
      return;
    }

    void (async () => {
      if (!token) {
        return;
      }

      setReceiptPreviewLoadingId(receipt.customerReceiptId);
      setInvoicePdfError("");

      try {
        const pdfBlob = await fetchReceiptPdf(token, receipt.customerReceiptId);
        if (invoicePdfUrl) {
          URL.revokeObjectURL(invoicePdfUrl);
        }

        const nextPdfUrl = URL.createObjectURL(pdfBlob);
        setInvoicePdfUrl(nextPdfUrl);
        setActivePdfLabel(`receipt ${receipt.receiptNumber}`);

        const previewWindow = window.open(nextPdfUrl, "_blank", "noopener,noreferrer");
        previewWindow?.addEventListener("load", () => previewWindow.print(), { once: true });
      } catch (err) {
        setInvoicePdfError(err instanceof Error ? err.message : "Failed to load receipt PDF.");
      } finally {
        setReceiptPreviewLoadingId(null);
      }
    })();
  }

  async function loadInvoicePdf() {
    if (!token || !selectedInvoiceId) {
      return;
    }

    setIsInvoicePdfLoading(true);
    setInvoicePdfError("");

    try {
      const pdfBlob = await fetchInvoicePdf(token, selectedInvoiceId);
      if (invoicePdfUrl) {
        URL.revokeObjectURL(invoicePdfUrl);
      }
      setInvoicePdfUrl(URL.createObjectURL(pdfBlob));
      setActivePdfLabel(`invoice ${selectedInvoice?.invoiceNumber ?? selectedInvoiceId}`);
    } catch (err) {
      setInvoicePdfError(err instanceof Error ? err.message : "Failed to load invoice PDF.");
    } finally {
      setIsInvoicePdfLoading(false);
    }
  }

  function printInvoicePdf() {
    if (!invoicePdfUrl) {
      return;
    }

    const previewWindow = window.open(invoicePdfUrl, "_blank", "noopener,noreferrer");
    previewWindow?.addEventListener("load", () => previewWindow.print(), { once: true });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Sales
            </div>
            <h1 className="mt-3 text-3xl font-semibold text-slate-950">Sales Invoices</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Live ERP invoice register from `/api/erp/sales/invoices` for the active organization.
            </p>
          </div>

          <Link
            to="/sales/invoices/new"
            className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            <CirclePlus className="h-4 w-4" />
            <span>New invoice</span>
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Invoices
          </div>
          <div className="mt-4 text-3xl font-semibold text-slate-950">{filteredInvoices.length}</div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Total Amount
          </div>
          <div className="mt-4 text-3xl font-semibold text-slate-950">
            {formatCurrency(totals.totalAmount)}
          </div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Outstanding
          </div>
          <div className="mt-4 text-3xl font-semibold text-slate-950">
            {formatCurrency(totals.balanceDue)}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by invoice number or status"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
          />
        </div>

        {error && (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200">
          <div className="hidden grid-cols-[1fr_0.9fr_0.9fr_0.9fr_0.9fr_0.9fr] gap-4 bg-slate-50 px-5 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 lg:grid">
            <div>Invoice</div>
            <div>Date</div>
            <div>Total</div>
            <div>Outstanding</div>
            <div>Status</div>
            <div>Action</div>
          </div>

          <div className="divide-y divide-slate-200">
            {isLoading ? (
              <div className="px-6 py-16 text-center text-sm text-slate-500">Loading invoices...</div>
            ) : filteredInvoices.length > 0 ? (
              filteredInvoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="grid gap-4 px-5 py-5 lg:grid-cols-[1fr_0.9fr_0.9fr_0.9fr_0.9fr_0.9fr] lg:items-center"
                >
                  <div>
                    <div className="text-base font-semibold text-slate-950">{invoice.invoiceNumber}</div>
                    <div className="mt-1 text-sm text-slate-500">Customer #{invoice.customerId}</div>
                  </div>
                  <div className="text-sm text-slate-600">
                    {new Date(invoice.invoiceDate).toLocaleDateString("en-IN")}
                  </div>
                  <div className="text-sm font-medium text-slate-900">
                    {formatCurrency(invoice.totalAmount)}
                  </div>
                  <div className="text-sm font-medium text-slate-900">
                    {formatCurrency(invoice.outstandingAmount)}
                  </div>
                  <div>
                    <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                      {invoice.status}
                    </span>
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() => void openDetails(invoice.id)}
                      className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                    >
                      View details
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-6 py-16 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                  <ReceiptText className="h-6 w-6" />
                </div>
                <h2 className="mt-4 text-lg font-semibold text-slate-950">No invoices yet</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Create the first invoice using the ERP sales invoice flow.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <DocumentDetailsDialog
        open={selectedInvoiceId !== null}
        onOpenChange={(open) => {
          if (!open) {
            if (invoicePdfUrl) {
              URL.revokeObjectURL(invoicePdfUrl);
            }
            setSelectedInvoiceId(null);
            setSelectedInvoice(null);
            setInvoicePdfUrl(null);
            setInvoicePdfError("");
            setActivePdfLabel("");
            setPaymentError("");
            setPaymentSuccess("");
            setInvoiceAgreements([]);
            setAgreementError("");
            setAgreementSuccess("");
            setSelectedAgreementId(null);
            setSelectedAgreement(null);
            setSelectedAgreementError("");
            setWarrantySummaries({});
            setSelectedOwnershipId(null);
            setWarrantyError("");
            setWarrantySubmitError("");
            setWarrantySubmitSuccess("");
          }
        }}
        title={selectedInvoice?.invoiceNumber ?? "Invoice details"}
        description="Sales invoice details from the ERP invoice endpoint."
        loading={isDetailsLoading}
        rows={[
          { label: "Customer", value: selectedInvoice?.customerId ? `Customer #${selectedInvoice.customerId}` : "-" },
          { label: "Invoice Date", value: formatDate(selectedInvoice?.invoiceDate) },
          { label: "Due Date", value: formatDate(selectedInvoice?.dueDate) },
          { label: "Warehouse", value: selectedInvoice?.warehouseId ? `Warehouse #${selectedInvoice.warehouseId}` : "-" },
          { label: "Status", value: selectedInvoice?.status ?? "-" },
          { label: "Subtotal", value: formatCurrency(selectedInvoice?.subtotal) },
          { label: "Tax", value: formatCurrency(selectedInvoice?.taxAmount) },
          { label: "Total", value: formatCurrency(selectedInvoice?.totalAmount) },
          { label: "Allocated", value: formatCurrency(selectedInvoice?.allocatedAmount) },
          { label: "Outstanding", value: formatCurrency(selectedInvoice?.outstandingAmount) },
        ]}
        lines={(selectedInvoice?.lines ?? []).map((line) => ({
          id: line.id,
          productId: line.productId,
          hsnCode: line.hsnCode,
          quantity: line.quantity,
          taxableAmount: line.taxableAmount,
          taxRate: line.taxRate,
          cgstAmount: line.cgstAmount,
          sgstAmount: line.sgstAmount,
          igstAmount: line.igstAmount,
          cessAmount: line.cessAmount,
          unitPrice: line.unitPrice,
          lineAmount: line.lineAmount,
          remarks: line.remarks,
        }))}
        pdfUrl={invoicePdfUrl}
        pdfLoading={isInvoicePdfLoading}
        pdfError={invoicePdfError}
        onLoadPdf={() => void loadInvoicePdf()}
        onPrintPdf={printInvoicePdf}
        pdfLabel={activePdfLabel}
      >
        {selectedInvoice && (selectedInvoice.outstandingAmount ?? 0) > 0 ? (
          <form onSubmit={handleCollectPayment} className="rounded-3xl border border-slate-200 bg-white p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Collect Payment
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  Create a customer receipt, allocate it to this invoice, and refresh the outstanding balance.
                </div>
              </div>
              <div className="rounded-2xl bg-slate-100 px-3 py-2 text-right">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Outstanding
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-950">
                  {formatCurrency(selectedInvoice.outstandingAmount)}
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="block">
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Receipt Date
                </div>
                <input
                  type="date"
                  value={receiptDate}
                  onChange={(event) => setReceiptDate(event.target.value)}
                  className="crm-field"
                />
              </label>
              <label className="block">
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Payment Method
                </div>
                <select
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value)}
                  className="crm-select"
                >
                  <option value="CASH">Cash</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CARD">Card</option>
                  <option value="UPI">UPI</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </label>
              <label className="block">
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Amount to Allocate
                </div>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  max={selectedInvoice.outstandingAmount ?? undefined}
                  value={receiptAmount}
                  onChange={(event) => setReceiptAmount(event.target.value)}
                  className="crm-field"
                  placeholder={`Up to ${selectedInvoice.outstandingAmount ?? 0}`}
                />
              </label>
              <label className="block">
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Reference Number
                </div>
                <input
                  value={referenceNumber}
                  onChange={(event) => setReferenceNumber(event.target.value)}
                  className="crm-field"
                  placeholder="Optional payment reference"
                />
              </label>
            </div>

            <label className="mt-4 block">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Remarks
              </div>
              <input
                value={receiptRemarks}
                onChange={(event) => setReceiptRemarks(event.target.value)}
                className="crm-field"
                placeholder="Optional receipt notes"
              />
            </label>

            {paymentError ? (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {paymentError}
              </div>
            ) : null}

            {paymentSuccess ? (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {paymentSuccess}
              </div>
            ) : null}

            <div className="mt-4 flex justify-end">
              <button
                type="submit"
                disabled={isCollectingPayment}
                className="rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCollectingPayment ? "Posting payment..." : "Collect payment"}
              </button>
            </div>
          </form>
        ) : null}

        {selectedInvoice ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Receipt Access
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  View and print receipts created from this invoice modal without going back to the receipt register.
                </div>
              </div>
              <div className="rounded-2xl bg-slate-100 px-3 py-2 text-right">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Invoice Status
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-950">{selectedInvoice.status}</div>
              </div>
            </div>

            {(selectedInvoice.allocations ?? []).length > 0 ? (
              <div className="mt-4 space-y-3">
                {(selectedInvoice.allocations ?? []).map((receipt) => (
                  <div
                    key={receipt.customerReceiptId}
                    className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <div className="text-sm font-semibold text-slate-950">{receipt.receiptNumber}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {formatDate(receipt.receiptDate)} · {receipt.paymentMethod} · Receipt {formatCurrency(receipt.receiptAmount)}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        Allocated to this invoice: {formatCurrency(receipt.allocatedAmount)}
                      </div>
                      {receipt.referenceNumber ? (
                        <div className="mt-1 text-xs text-slate-500">Reference: {receipt.referenceNumber}</div>
                      ) : null}
                      <div className="mt-1 text-xs text-slate-500">Status: {receipt.status}</div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void previewInvoiceReceipt(receipt)}
                        disabled={receiptPreviewLoadingId === receipt.customerReceiptId}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {receiptPreviewLoadingId === receipt.customerReceiptId ? "Loading..." : "View receipt"}
                      </button>
                      <button
                        type="button"
                        onClick={() => printInvoiceReceipt(receipt)}
                        className="rounded-full bg-slate-950 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-slate-800"
                      >
                        Print receipt
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                No receipts are allocated to this invoice yet.
              </div>
            )}
          </div>
        ) : null}

        {selectedInvoice && canViewService ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  AMC And Service Contracts
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  Create or review post-invoice AMC and service agreements for the sold items on this invoice.
                </div>
              </div>
              <div className="rounded-2xl bg-slate-100 px-3 py-2 text-right">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Linked Agreements
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-950">{invoiceAgreements.length}</div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Extended warranty still works on sold ownership items. The backend service agreement flow already supports invoice creation here, but warranty extension from this modal needs invoice lines to expose ownership references first.
            </div>

            <div className="mt-4">
              {isAgreementLoading ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                  Loading linked agreements...
                </div>
              ) : invoiceAgreements.length > 0 ? (
                <div className="space-y-3">
                  {invoiceAgreements.map((agreement) => (
                    <div
                      key={agreement.id}
                      className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <div className="text-sm font-semibold text-slate-950">{agreement.agreementNumber}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {agreement.agreementType} · {agreement.status} · {formatDate(agreement.serviceStartDate)} to {formatDate(agreement.serviceEndDate)}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          Amount: {formatCurrency(agreement.agreementAmount)} · SLA: {agreement.slaHours ?? "-"} hrs
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => void openAgreementDetails(agreement.id)}
                          className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                        >
                          View agreement
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                  No AMC or service contract is linked to this invoice yet.
                </div>
              )}
            </div>

            {canManageService ? (
              <form onSubmit={handleCreateAgreement} className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Create Post-Invoice Agreement
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  Use this when a customer wants AMC or service coverage after invoicing, especially for B2B sales.
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <label className="block">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Agreement Type
                    </div>
                    <select
                      value={agreementType}
                      onChange={(event) => setAgreementType(event.target.value as typeof agreementType)}
                      className="crm-select"
                    >
                      <option value="AMC">AMC</option>
                      <option value="SERVICE_CONTRACT">Service Contract</option>
                      <option value="INSTALLATION_SUPPORT">Installation Support</option>
                      <option value="PREVENTIVE_MAINTENANCE">Preventive Maintenance</option>
                    </select>
                  </label>
                  <label className="block">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Status
                    </div>
                    <select
                      value={agreementStatus}
                      onChange={(event) => setAgreementStatus(event.target.value as typeof agreementStatus)}
                      className="crm-select"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="DRAFT">Draft</option>
                    </select>
                  </label>
                  <label className="block">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Start Date
                    </div>
                    <input
                      type="date"
                      value={agreementStartDate}
                      onChange={(event) => setAgreementStartDate(event.target.value)}
                      className="crm-field"
                    />
                  </label>
                  <label className="block">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      End Date
                    </div>
                    <input
                      type="date"
                      value={agreementEndDate}
                      onChange={(event) => setAgreementEndDate(event.target.value)}
                      className="crm-field"
                    />
                  </label>
                  <label className="block">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Agreement Amount
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={agreementAmount}
                      onChange={(event) => setAgreementAmount(event.target.value)}
                      className="crm-field"
                      placeholder="Optional"
                    />
                  </label>
                  <label className="block">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      SLA Hours
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={slaHours}
                      onChange={(event) => setSlaHours(event.target.value)}
                      className="crm-field"
                      placeholder="Optional"
                    />
                  </label>
                  <label className="block">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Visit Limit
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={visitLimit}
                      onChange={(event) => setVisitLimit(event.target.value)}
                      className="crm-field"
                      placeholder="Optional"
                    />
                  </label>
                  <label className="block">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Preventive Visits
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={preventiveVisitsIncluded}
                      onChange={(event) => setPreventiveVisitsIncluded(event.target.value)}
                      className="crm-field"
                      placeholder="Optional"
                    />
                  </label>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={laborIncluded}
                      onChange={(event) => setLaborIncluded(event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    <span>Labor included</span>
                  </label>
                  <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={partsIncluded}
                      onChange={(event) => setPartsIncluded(event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    <span>Parts included</span>
                  </label>
                </div>

                <label className="mt-4 block">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Notes
                  </div>
                  <textarea
                    value={agreementNotes}
                    onChange={(event) => setAgreementNotes(event.target.value)}
                    className="crm-textarea min-h-24"
                    placeholder="Optional contract notes, billing details, or AMC clauses"
                  />
                </label>

                <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <div className="hidden grid-cols-[0.7fr_1.4fr_0.9fr_1.2fr] gap-4 bg-slate-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 lg:grid">
                    <div>Cover</div>
                    <div>Invoice Line</div>
                    <div>Scope</div>
                    <div>Service Notes</div>
                  </div>
                  <div className="divide-y divide-slate-200">
                    {agreementLines.map((line) => (
                      <div
                        key={line.salesInvoiceLineId}
                        className="grid gap-3 px-4 py-4 lg:grid-cols-[0.7fr_1.4fr_0.9fr_1.2fr] lg:items-center"
                      >
                        <label className="flex items-center gap-3 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={line.selected}
                            onChange={(event) =>
                              updateAgreementLine(line.salesInvoiceLineId, { selected: event.target.checked })
                            }
                            className="h-4 w-4 rounded border-slate-300"
                          />
                          <span>Select</span>
                        </label>
                        <div className="text-sm text-slate-800">
                          <div className="font-medium text-slate-950">{getProductLabel(line.productId)}</div>
                          <div className="mt-1 text-xs text-slate-500">Invoice line #{line.salesInvoiceLineId}</div>
                        </div>
                        <select
                          value={line.coverageScope}
                          onChange={(event) =>
                            updateAgreementLine(line.salesInvoiceLineId, {
                              coverageScope: event.target.value as AgreementLineDraft["coverageScope"],
                            })
                          }
                          className="crm-select"
                          disabled={!line.selected}
                        >
                          <option value="FULL">Full</option>
                          <option value="LABOR_ONLY">Labor Only</option>
                          <option value="PARTS_ONLY">Parts Only</option>
                          <option value="VISIT_ONLY">Visit Only</option>
                        </select>
                        <input
                          value={line.includedServiceNotes}
                          onChange={(event) =>
                            updateAgreementLine(line.salesInvoiceLineId, {
                              includedServiceNotes: event.target.value,
                            })
                          }
                          className="crm-field"
                          disabled={!line.selected}
                          placeholder="Optional line-specific notes"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {agreementError ? (
                  <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {agreementError}
                  </div>
                ) : null}

                {agreementSuccess ? (
                  <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {agreementSuccess}
                  </div>
                ) : null}

                <div className="mt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={isAgreementSubmitting}
                    className="rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isAgreementSubmitting ? "Creating agreement..." : "Create AMC / service contract"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                Your current session can view linked agreements but cannot create new AMC or service contracts.
              </div>
            )}
          </div>
        ) : null}

        {selectedInvoice && canViewService ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Warranty Coverage
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  Review sold ownership warranty and add extended warranty directly from the invoice when coverage needs to be upgraded later.
                </div>
              </div>
              <div className="rounded-2xl bg-slate-100 px-3 py-2 text-right">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Ownership Items
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-950">
                  {getInvoiceOwnershipEntries(selectedInvoice).length}
                </div>
              </div>
            </div>

            {warrantyError ? (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {warrantyError}
              </div>
            ) : null}

            {getInvoiceOwnershipEntries(selectedInvoice).length > 0 ? (
              <>
                <div className="mt-4 space-y-3">
                  {getInvoiceOwnershipEntries(selectedInvoice).map((entry) => {
                    const summary = warrantySummaries[entry.ownershipId];
                    const isSelected = selectedOwnershipId === entry.ownershipId;
                    return (
                      <button
                        key={`${entry.lineId}-${entry.ownershipId}`}
                        type="button"
                        onClick={() => {
                          setSelectedOwnershipId(entry.ownershipId);
                          setWarrantySubmitError("");
                          setWarrantySubmitSuccess("");
                        }}
                        className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                          isSelected
                            ? "border-slate-900 bg-slate-950 text-white"
                            : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                        }`}
                      >
                        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                          <div>
                            <div className={`text-sm font-semibold ${isSelected ? "text-white" : "text-slate-950"}`}>
                              {getProductLabel(entry.productId)}
                            </div>
                            <div className={`mt-1 text-xs ${isSelected ? "text-slate-200" : "text-slate-500"}`}>
                              Invoice line #{entry.lineId} · Ownership #{entry.ownershipId}
                              {summary?.serialNumberId ? ` · Serial #${summary.serialNumberId}` : ""}
                            </div>
                          </div>
                          <div className={`text-xs ${isSelected ? "text-slate-200" : "text-slate-500"}`}>
                            Effective coverage till {formatDate(summary?.effectiveWarrantyEndDate)}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  {isWarrantyLoading ? (
                    <div className="text-sm text-slate-600">Loading ownership warranty details...</div>
                  ) : selectedOwnershipId && warrantySummaries[selectedOwnershipId] ? (
                    <>
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        {[
                          ["Ownership", `#${warrantySummaries[selectedOwnershipId].productOwnershipId}`],
                          ["Serial", warrantySummaries[selectedOwnershipId].serialNumberId ? `#${warrantySummaries[selectedOwnershipId].serialNumberId}` : "-"],
                          ["Base Start", formatDate(warrantySummaries[selectedOwnershipId].baseWarrantyStartDate)],
                          ["Base End", formatDate(warrantySummaries[selectedOwnershipId].baseWarrantyEndDate)],
                          ["Effective End", formatDate(warrantySummaries[selectedOwnershipId].effectiveWarrantyEndDate)],
                          ["Extensions", String(warrantySummaries[selectedOwnershipId].extensions.length)],
                        ].map(([label, value]) => (
                          <div key={label} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</div>
                            <div className="mt-2 text-sm font-medium text-slate-900">{value}</div>
                          </div>
                        ))}
                      </div>

                      {(warrantySummaries[selectedOwnershipId].extensions ?? []).length > 0 ? (
                        <div className="mt-4 space-y-3">
                          {warrantySummaries[selectedOwnershipId].extensions.map((extension) => (
                            <div
                              key={extension.id}
                              className="rounded-2xl border border-slate-200 bg-white px-4 py-4"
                            >
                              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                                <div>
                                  <div className="text-sm font-semibold text-slate-950">
                                    {extension.referenceNumber || `Extension #${extension.id}`}
                                  </div>
                                  <div className="mt-1 text-xs text-slate-500">
                                    {extension.extensionType} · {extension.monthsAdded} months · {extension.status}
                                  </div>
                                  <div className="mt-1 text-xs text-slate-500">
                                    {formatDate(extension.startDate)} to {formatDate(extension.endDate)}
                                  </div>
                                </div>
                                <div className="text-sm font-medium text-slate-900">
                                  {formatCurrency(extension.amount)}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-4 text-sm text-slate-600">
                          No warranty extensions are linked to this ownership yet.
                        </div>
                      )}

                      {canManageService ? (
                        <form onSubmit={handleCreateWarrantyExtension} className="mt-5 rounded-3xl border border-slate-200 bg-white p-5">
                          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                            Add Extended Warranty
                          </div>
                          <div className="mt-1 text-sm text-slate-600">
                            Create a paid or goodwill extension for the selected sold ownership item.
                          </div>

                          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                            <label className="block">
                              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                Extension Type
                              </div>
                              <select
                                value={warrantyExtensionType}
                                onChange={(event) => setWarrantyExtensionType(event.target.value as typeof warrantyExtensionType)}
                                className="crm-select"
                              >
                                <option value="PAID_EXTENDED">Paid Extended</option>
                                <option value="MANUFACTURER_PROMO">Manufacturer Promo</option>
                                <option value="GOODWILL">Goodwill</option>
                                <option value="MANUAL_CORRECTION">Manual Correction</option>
                              </select>
                            </label>
                            <label className="block">
                              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                Months Added
                              </div>
                              <input
                                type="number"
                                min="1"
                                step="1"
                                value={warrantyMonthsAdded}
                                onChange={(event) => setWarrantyMonthsAdded(event.target.value)}
                                className="crm-field"
                              />
                            </label>
                            <label className="block">
                              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                Amount
                              </div>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={warrantyAmount}
                                onChange={(event) => setWarrantyAmount(event.target.value)}
                                className="crm-field"
                                placeholder="Optional"
                              />
                            </label>
                            <label className="block">
                              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                Reference Number
                              </div>
                              <input
                                value={warrantyReferenceNumber}
                                onChange={(event) => setWarrantyReferenceNumber(event.target.value)}
                                className="crm-field"
                                placeholder="Optional"
                              />
                            </label>
                          </div>

                          <div className="mt-4 grid gap-4 md:grid-cols-2">
                            <label className="block">
                              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                Reason
                              </div>
                              <input
                                value={warrantyReason}
                                onChange={(event) => setWarrantyReason(event.target.value)}
                                className="crm-field"
                                placeholder="Optional"
                              />
                            </label>
                            <label className="block">
                              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                Remarks
                              </div>
                              <input
                                value={warrantyRemarks}
                                onChange={(event) => setWarrantyRemarks(event.target.value)}
                                className="crm-field"
                                placeholder="Optional"
                              />
                            </label>
                          </div>

                          {warrantySubmitError ? (
                            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                              {warrantySubmitError}
                            </div>
                          ) : null}

                          {warrantySubmitSuccess ? (
                            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                              {warrantySubmitSuccess}
                            </div>
                          ) : null}

                          <div className="mt-4 flex justify-end">
                            <button
                              type="submit"
                              disabled={isWarrantySubmitting}
                              className="rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isWarrantySubmitting ? "Creating extension..." : "Add warranty extension"}
                            </button>
                          </div>
                        </form>
                      ) : null}
                    </>
                  ) : (
                    <div className="text-sm text-slate-600">
                      Select an ownership item to review its current warranty coverage.
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                This invoice does not currently expose sold ownership items for warranty follow-up.
              </div>
            )}
          </div>
        ) : null}
      </DocumentDetailsDialog>

      <Dialog
        open={selectedAgreementId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedAgreementId(null);
            setSelectedAgreement(null);
            setSelectedAgreementError("");
          }
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedAgreement?.agreementNumber ?? "Service agreement"}</DialogTitle>
            <DialogDescription>
              Service agreement details linked to the selected invoice.
            </DialogDescription>
          </DialogHeader>

          {isSelectedAgreementLoading ? (
            <div className="py-8 text-sm text-slate-500">Loading agreement details...</div>
          ) : selectedAgreementError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {selectedAgreementError}
            </div>
          ) : selectedAgreement ? (
            <div className="space-y-5">
              <div className="grid gap-3 md:grid-cols-2">
                {[
                  ["Type", selectedAgreement.agreementType],
                  ["Status", selectedAgreement.status],
                  ["Start Date", formatDate(selectedAgreement.serviceStartDate)],
                  ["End Date", formatDate(selectedAgreement.serviceEndDate)],
                  ["Amount", formatCurrency(selectedAgreement.agreementAmount)],
                  ["SLA", selectedAgreement.slaHours != null ? `${selectedAgreement.slaHours} hrs` : "-"],
                  ["Visit Limit", selectedAgreement.visitLimit != null ? String(selectedAgreement.visitLimit) : "-"],
                  ["Preventive Visits", selectedAgreement.preventiveVisitsIncluded != null ? String(selectedAgreement.preventiveVisitsIncluded) : "-"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</div>
                    <div className="mt-2 text-sm font-medium text-slate-900">{value || "-"}</div>
                  </div>
                ))}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Labor Included</div>
                  <div className="mt-2 font-medium text-slate-900">{selectedAgreement.laborIncluded ? "Yes" : "No"}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Parts Included</div>
                  <div className="mt-2 font-medium text-slate-900">{selectedAgreement.partsIncluded ? "Yes" : "No"}</div>
                </div>
              </div>

              {selectedAgreement.notes ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Notes</div>
                  <div className="mt-2 text-sm text-slate-700">{selectedAgreement.notes}</div>
                </div>
              ) : null}

              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <div className="hidden grid-cols-[1.2fr_0.8fr_1fr_1.2fr] gap-4 bg-slate-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 lg:grid">
                  <div>Product</div>
                  <div>Invoice Line</div>
                  <div>Scope</div>
                  <div>Included Notes</div>
                </div>
                <div className="divide-y divide-slate-200 bg-white">
                  {selectedAgreement.items.map((item) => (
                    <div
                      key={item.id}
                      className="grid gap-3 px-4 py-4 lg:grid-cols-[1.2fr_0.8fr_1fr_1.2fr] lg:items-center"
                    >
                      <div className="text-sm font-medium text-slate-950">{getProductLabel(item.productId)}</div>
                      <div className="text-sm text-slate-700">{item.salesInvoiceLineId ? `#${item.salesInvoiceLineId}` : "-"}</div>
                      <div className="text-sm text-slate-700">{item.coverageScope || "-"}</div>
                      <div className="text-sm text-slate-700">{item.includedServiceNotes || "-"}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-sm text-slate-500">No agreement selected.</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
