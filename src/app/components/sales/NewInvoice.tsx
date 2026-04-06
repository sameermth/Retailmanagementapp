import { AlertCircle, ArrowLeft, Camera, CirclePlus, ScanLine, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../../auth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  fetchProductScan,
  fetchWarehouses,
  type ProductScanResponse,
  type WarehouseResponse,
} from "../inventory/api";
import {
  createInvoice,
  fetchSalesCustomers,
  fetchStoreProductsForSales,
  type SalesCustomerSummary,
  type StoreProductOption,
} from "./api";
import { CustomerQuickCreateDialog } from "./CustomerQuickCreateDialog";

type BarcodeDetectorLike = {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>>;
};

declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats?: string[] }) => BarcodeDetectorLike;
  }
}

interface InvoiceLineDraft {
  scanQuery: string;
  trackingInput: string;
  productSearch: string;
  productId: string;
  productLabel: string;
  matchedBy: string;
  serialId: string;
  serialLabel: string;
  batchId: string;
  batchLabel: string;
  quantity: string;
  unitPrice: string;
  taxRate: string;
  discountAmount: string;
}

function createEmptyLine(): InvoiceLineDraft {
  return {
    scanQuery: "",
    trackingInput: "",
    productSearch: "",
    productId: "",
    productLabel: "",
    matchedBy: "",
    serialId: "",
    serialLabel: "",
    batchId: "",
    batchLabel: "",
    quantity: "1",
    unitPrice: "",
    taxRate: "0",
    discountAmount: "0",
  };
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

interface CameraScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDetected: (value: string) => void;
}

function CameraScannerDialog({ open, onOpenChange, onDetected }: CameraScannerDialogProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const detectorRef = useRef<BarcodeDetectorLike | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Align the serial, batch, barcode, or QR code inside the camera frame.");

  useEffect(() => {
    async function startScanner() {
      if (!open) {
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setError("This browser does not support camera access for scanning.");
        return;
      }

      if (!window.BarcodeDetector) {
        setError("Camera scanning is available only in browsers that support BarcodeDetector.");
        return;
      }

      try {
        setError("");
        setStatus("Starting camera...");
        detectorRef.current = new window.BarcodeDetector({
          formats: ["qr_code", "code_128", "code_39", "ean_13", "ean_8", "upc_a", "upc_e"],
        });

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
          },
          audio: false,
        });

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute("playsinline", "true");
          await videoRef.current.play();
          setStatus("Scanning... hold the code steady.");
        }

        const scanFrame = async () => {
          const video = videoRef.current;
          const detector = detectorRef.current;

          if (!open || !video || !detector) {
            return;
          }

          try {
            if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
              const results = await detector.detect(video);
              const match = results.find((result) => result.rawValue?.trim());

              if (match?.rawValue) {
                onDetected(match.rawValue.trim());
                onOpenChange(false);
                return;
              }
            }
          } catch {
            setStatus("Scanning... hold the code steady.");
          }

          frameRef.current = window.requestAnimationFrame(() => {
            void scanFrame();
          });
        };

        void scanFrame();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to start camera scanning.");
      }
    }

    const cleanup = () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };

    void startScanner();

    return cleanup;
  }, [onDetected, onOpenChange, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Camera Scan</DialogTitle>
          <DialogDescription>
            Point the camera at a barcode, QR code, serial number label, or batch code.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-950">
            <video ref={videoRef} className="aspect-[4/3] w-full object-cover" muted autoPlay playsInline />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {error || status}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function NewInvoice() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<SalesCustomerSummary[]>([]);
  const [products, setProducts] = useState<StoreProductOption[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseResponse[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [remarks, setRemarks] = useState("");
  const [lines, setLines] = useState<InvoiceLineDraft[]>([createEmptyLine()]);
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [scanLoadingIndex, setScanLoadingIndex] = useState<number | null>(null);
  const [cameraRowIndex, setCameraRowIndex] = useState<number | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [lineError, setLineError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDependencies() {
      if (!token || !user?.organizationId) {
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const [customerResponse, productResponse, warehouseResponse] = await Promise.all([
          fetchSalesCustomers(token, user.organizationId),
          fetchStoreProductsForSales(token, user.organizationId),
          fetchWarehouses(token, user.organizationId, user.defaultBranchId ?? undefined),
        ]);

        setCustomers(customerResponse.filter((customer) => customer.status !== "INACTIVE"));
        setProducts(productResponse.filter((product) => product.isActive));
        setWarehouses(warehouseResponse.filter((warehouse) => warehouse.isActive));
        const preferredWarehouse = warehouseResponse.find((warehouse) => warehouse.isPrimary) ?? warehouseResponse[0];
        if (preferredWarehouse) {
          setWarehouseId(preferredWarehouse.id.toString());
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load invoice dependencies.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadDependencies();
  }, [token, user?.organizationId]);

  function updateLine(index: number, field: keyof InvoiceLineDraft, value: string) {
    setLines((current) =>
      current.map((line, lineIndex) => (lineIndex === index ? { ...line, [field]: value } : line)),
    );
  }

  function addLine() {
    setLines((current) => [...current, createEmptyLine()]);
  }

  function removeLine(index: number) {
    setLines((current) => (current.length === 1 ? current : current.filter((_, i) => i !== index)));
  }

  function applyProductToLine(index: number, product: StoreProductOption, scan?: ProductScanResponse | null) {
    const resolvedTrackingValue = scan?.serial?.serialNumber ?? scan?.batch?.batchNumber ?? "";

    setLines((current) =>
      current.map((line, lineIndex) =>
        lineIndex === index
          ? {
              ...line,
              productSearch: `${product.name} (${product.sku})`,
              productId: String(product.id),
              productLabel: `${product.name} (${product.sku})`,
              matchedBy: scan?.matchedBy ?? "",
              serialId: scan?.serial?.id ? String(scan.serial.id) : "",
              serialLabel: scan?.serial?.serialNumber ?? "",
              batchId: scan?.batch?.id ? String(scan.batch.id) : "",
              batchLabel: scan?.batch?.batchNumber ?? "",
              trackingInput: resolvedTrackingValue || line.trackingInput,
              quantity: scan?.serial?.id ? "1" : line.quantity,
              unitPrice:
                line.unitPrice && Number(line.unitPrice) > 0
                  ? line.unitPrice
                  : String(product.defaultSalePrice ?? ""),
            }
          : line,
      ),
    );
  }

  async function resolveScanQuery(index: number, rawQuery: string) {
    if (!token || !user?.organizationId) {
      return;
    }

    const queryText = rawQuery.trim();

    if (!queryText) {
      setLineError("Enter or scan a barcode/QR/serial value first.");
      return;
    }

    setScanLoadingIndex(index);
    setLineError("");
    setError("");

    try {
      const scan = await fetchProductScan(
        token,
        user.organizationId,
        queryText,
        warehouseId ? Number(warehouseId) : undefined,
      );

      const matchedStoreProductId = scan.storeProduct?.id;
      const matchedProduct =
        products.find((item) => item.id === matchedStoreProductId) ??
        products.find((item) => item.productId === scan.product?.id);

      if (!matchedProduct) {
        setLineError(`No sellable store product was resolved for "${queryText}".`);
        return;
      }

      applyProductToLine(index, matchedProduct, scan);

      setLines((current) =>
        current.map((draft, draftIndex) =>
          draftIndex === index
            ? {
                ...draft,
                scanQuery: queryText,
                trackingInput:
                  scan.serial?.serialNumber ??
                  scan.batch?.batchNumber ??
                  (draft.trackingInput || queryText),
              }
            : draft,
        ),
      );

      if (index === lines.length - 1) {
        setLines((current) => [...current, createEmptyLine()]);
      }
    } catch (err) {
      setLineError(err instanceof Error ? err.message : "Failed to resolve scanned product.");
    } finally {
      setScanLoadingIndex(null);
    }
  }

  async function resolveScan(index: number) {
    const line = lines[index];
    await resolveScanQuery(index, line?.scanQuery ?? "");
  }

  async function resolveTrackingInput(index: number) {
    const line = lines[index];
    const trackingQuery = line?.trackingInput.trim() ?? "";

    if (!trackingQuery) {
      return;
    }

    if (trackingQuery === line.serialLabel || trackingQuery === line.batchLabel) {
      return;
    }

    await resolveScanQuery(index, trackingQuery);
  }

  function clearTrackedSelection(index: number, productLabel: string, unitPrice: string) {
    updateLine(index, "productLabel", productLabel);
    updateLine(index, "trackingInput", "");
    updateLine(index, "matchedBy", "");
    updateLine(index, "serialId", "");
    updateLine(index, "serialLabel", "");
    updateLine(index, "batchId", "");
    updateLine(index, "batchLabel", "");
    updateLine(index, "unitPrice", unitPrice);
  }

  function resolveProductSelection(index: number, rawValue: string) {
    const query = rawValue.trim().toLowerCase();

    if (!query) {
      updateLine(index, "productId", "");
      clearTrackedSelection(index, "", "");
      return;
    }

    const matchedProduct =
      products.find((product) => `${product.name} (${product.sku})`.toLowerCase() === query) ??
      products.find((product) => product.sku.toLowerCase() === query) ??
      products.find((product) => product.name.toLowerCase() === query);

    if (!matchedProduct) {
      return;
    }

    updateLine(index, "productSearch", `${matchedProduct.name} (${matchedProduct.sku})`);
    updateLine(index, "productId", String(matchedProduct.id));
    clearTrackedSelection(
      index,
      `${matchedProduct.name} (${matchedProduct.sku})`,
      String(matchedProduct.defaultSalePrice ?? ""),
    );
  }

  async function handleCameraDetected(value: string) {
    if (cameraRowIndex === null) {
      return;
    }

    updateLine(cameraRowIndex, "scanQuery", value);
    updateLine(cameraRowIndex, "trackingInput", value);
    await resolveScanQuery(cameraRowIndex, value);
  }

  const totals = useMemo(
    () =>
      lines.reduce(
        (summary, line) => {
          const quantity = Number(line.quantity) || 0;
          const unitPrice = Number(line.unitPrice) || 0;
          const discountAmount = Number(line.discountAmount) || 0;
          const taxRate = Number(line.taxRate) || 0;
          const taxable = Math.max(quantity * unitPrice - discountAmount, 0);
          summary.subtotal += taxable;
          summary.tax += taxable * (taxRate / 100);
          return summary;
        },
        { subtotal: 0, tax: 0 },
      ),
    [lines],
  );

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === Number(customerId)) ?? null,
    [customerId, customers],
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token || !user?.organizationId || !user.defaultBranchId) {
      setError("Organization or branch context is missing in the current session.");
      return;
    }

    if (!customerId || !warehouseId) {
      setError("Customer and warehouse are required.");
      return;
    }

    let normalizedLines: Array<{
      productId: number;
      uomId: number;
      quantity: number;
      baseQuantity: number;
      unitPrice?: number;
      discountAmount?: number;
      priceOverrideReason?: string;
      taxRate?: number;
      serialNumberIds?: number[];
      batchSelections?: Array<{
        batchId: number;
        quantity: number;
        baseQuantity: number;
      }>;
    }>;

    try {
      normalizedLines = lines
        .map((line) => {
          const product = products.find((item) => item.id === Number(line.productId));
          const quantity = Number(line.quantity);
          const unitPrice = Number(line.unitPrice);
          const taxRate = Number(line.taxRate);
          const discountAmount = Number(line.discountAmount);

          if (!product || !quantity || quantity <= 0) {
            return null;
          }

          if (product.serialTrackingEnabled) {
            if (!line.serialId) {
              throw new Error(`Scan a serial number for ${product.name} before creating the invoice.`);
            }

            if (quantity !== 1) {
              throw new Error(`Serial-tracked item ${product.name} must stay at quantity 1 per row.`);
            }
          }

          if (product.batchTrackingEnabled && !line.batchId) {
            throw new Error(`Scan a batch for ${product.name} before creating the invoice.`);
          }

          return {
            productId: product.id,
            uomId: product.baseUomId,
            quantity,
            baseQuantity: quantity,
            unitPrice: unitPrice > 0 ? unitPrice : undefined,
            discountAmount: discountAmount > 0 ? discountAmount : undefined,
            priceOverrideReason:
              unitPrice > 0 && product.defaultSalePrice !== null && unitPrice !== product.defaultSalePrice
                ? "Manual override from invoice sheet"
                : undefined,
            taxRate: taxRate > 0 ? taxRate : undefined,
            serialNumberIds: line.serialId ? [Number(line.serialId)] : undefined,
            batchSelections: line.batchId
              ? [
                  {
                    batchId: Number(line.batchId),
                    quantity,
                    baseQuantity: quantity,
                  },
                ]
              : undefined,
          };
        })
        .filter((line): line is NonNullable<typeof line> => line !== null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invoice lines are incomplete.");
      return;
    }

    if (normalizedLines.length === 0) {
      setError("Add at least one valid invoice line.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setLineError("");

    try {
      await createInvoice(token, {
        organizationId: user.organizationId,
        branchId: user.defaultBranchId,
        warehouseId: Number(warehouseId),
        customerId: Number(customerId),
        invoiceDate,
        dueDate,
        placeOfSupplyStateCode: selectedCustomer?.stateCode ?? undefined,
        remarks: remarks.trim() || undefined,
        lines: normalizedLines,
      });

      navigate("/sales/invoices");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create sales invoice.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <CameraScannerDialog
        open={isCameraOpen}
        onOpenChange={(open) => {
          setIsCameraOpen(open);
          if (!open) {
            setCameraRowIndex(null);
          }
        }}
        onDetected={(value) => {
          void handleCameraDetected(value);
        }}
      />

      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Sales
            </div>
            <h1 className="mt-3 text-3xl font-semibold text-slate-950">New Sales Invoice</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Backend-aligned invoice builder for `/api/erp/sales/invoices`.
            </p>
          </div>

          <Link
            to="/sales/invoices"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to invoices</span>
          </Link>
        </div>
      </section>

      <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_380px]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          {isLoading ? (
            <div className="py-12 text-sm text-slate-500">Loading customers and products...</div>
          ) : (
            <div className="space-y-8">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <label className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Customer
                  </div>
                  <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="crm-select mt-3">
                    <option value="">Select customer</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.fullName}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setIsCustomerDialogOpen(true)}
                    className="mt-3 inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                  >
                    <CirclePlus className="h-3.5 w-3.5" />
                    <span>New customer</span>
                  </button>
                </label>

                <label className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Warehouse
                  </div>
                  <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className="crm-select mt-3">
                    <option value="">Select warehouse</option>
                    {warehouses.map((warehouse) => (
                      <option key={warehouse.id} value={warehouse.id}>
                        {warehouse.name} ({warehouse.code})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Invoice Date
                  </div>
                  <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className="crm-field mt-3" />
                </label>

                <label className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Due Date
                  </div>
                  <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="crm-field mt-3" />
                </label>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-600">
                Posting branch: <span className="font-medium text-slate-950">#{user?.defaultBranchId ?? "-"}</span>
                {" · "}
                Place of supply: <span className="font-medium text-slate-950">{selectedCustomer?.stateCode || "Derived when customer has a state code"}</span>
              </div>

              <label className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4 block">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Remarks
                </div>
                <input value={remarks} onChange={(e) => setRemarks(e.target.value)} className="crm-field mt-3" placeholder="Optional invoice notes" />
              </label>

              <div className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-950">Invoice Lines</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Use this like a sheet: scan into a row or enter items manually, then keep adding rows.
                    </p>
                  </div>
                  <button type="button" onClick={addLine} className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-100">
                    <CirclePlus className="h-4 w-4" />
                    <span>Add line</span>
                  </button>
                </div>

                {lineError ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    {lineError}
                  </div>
                ) : null}

                <div className="overflow-x-auto rounded-3xl border border-slate-200">
                  <table className="min-w-full border-collapse">
                    <thead className="bg-slate-50">
                      <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        <th className="px-4 py-3">Scan</th>
                        <th className="px-4 py-3">Product</th>
                        <th className="px-4 py-3">Tracking</th>
                        <th className="px-4 py-3">Qty</th>
                        <th className="px-4 py-3">Unit Price</th>
                        <th className="px-4 py-3">Discount</th>
                        <th className="px-4 py-3">Tax %</th>
                        <th className="px-4 py-3">Amount</th>
                        <th className="px-4 py-3">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {lines.map((line, index) => {
                        const selectedProduct = products.find((item) => item.id === Number(line.productId));
                        const lineAmount = Math.max(
                          (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0) -
                            (Number(line.discountAmount) || 0),
                          0,
                        );

                        return (
                          <tr key={`${index}-${line.productId}-${line.scanQuery}`}>
                            <td className="align-top px-4 py-3">
                              <div className="flex min-w-[220px] gap-2">
                                <input
                                  value={line.scanQuery}
                                  onChange={(e) => updateLine(index, "scanQuery", e.target.value)}
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                      event.preventDefault();
                                      void resolveScan(index);
                                    }
                                  }}
                                  className="crm-field"
                                  placeholder="Barcode / QR / serial"
                                />
                                <button
                                  type="button"
                                  onClick={() => void resolveScan(index)}
                                  disabled={scanLoadingIndex === index}
                                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                                  title="Resolve scan"
                                >
                                  <ScanLine className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCameraRowIndex(index);
                                    setIsCameraOpen(true);
                                  }}
                                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-600 transition hover:bg-slate-100"
                                  title="Scan with camera"
                                >
                                  <Camera className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                            <td className="align-top px-4 py-3">
                              <div className="min-w-[260px] space-y-2">
                                <input
                                  list={`invoice-product-options-${index}`}
                                  value={line.productSearch}
                                  onChange={(e) => {
                                    updateLine(index, "productSearch", e.target.value);
                                    resolveProductSelection(index, e.target.value);
                                  }}
                                  onBlur={(e) => {
                                    resolveProductSelection(index, e.target.value);
                                  }}
                                  className="crm-field"
                                  placeholder="Search product or SKU"
                                />
                                <datalist id={`invoice-product-options-${index}`}>
                                  {products.map((product) => (
                                    <option key={product.id} value={`${product.name} (${product.sku})`} />
                                  ))}
                                </datalist>
                                <div className="text-xs text-slate-500">
                                  {line.productLabel || (selectedProduct ? `UOM #${selectedProduct.baseUomId}` : "Manual entry allowed")}
                                </div>
                              </div>
                            </td>
                            <td className="align-top px-4 py-3">
                              <div className="min-w-[190px] text-xs text-slate-600">
                                <input
                                  value={line.trackingInput}
                                  onChange={(e) => updateLine(index, "trackingInput", e.target.value)}
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                      event.preventDefault();
                                      void resolveTrackingInput(index);
                                    }
                                  }}
                                  onBlur={() => void resolveTrackingInput(index)}
                                  className="crm-field"
                                  placeholder="Serial / batch entry"
                                />
                                <div>{line.serialLabel ? `Serial: ${line.serialLabel}` : "Serial: -"}</div>
                                <div className="mt-1">{line.batchLabel ? `Batch: ${line.batchLabel}` : "Batch: -"}</div>
                                <div className="mt-1 text-slate-500">
                                  {line.matchedBy
                                    ? `Matched by ${line.matchedBy}`
                                    : "Scan tracked stock or enter standard items manually"}
                                </div>
                              </div>
                            </td>
                            <td className="align-top px-4 py-3">
                              <input
                                value={line.quantity}
                                onChange={(e) => updateLine(index, "quantity", e.target.value)}
                                type="number"
                                min="0"
                                step="0.001"
                                className="crm-field min-w-[90px]"
                              />
                            </td>
                            <td className="align-top px-4 py-3">
                              <input
                                value={line.unitPrice}
                                onChange={(e) => updateLine(index, "unitPrice", e.target.value)}
                                type="number"
                                min="0"
                                step="0.01"
                                className="crm-field min-w-[120px]"
                              />
                            </td>
                            <td className="align-top px-4 py-3">
                              <input
                                value={line.discountAmount}
                                onChange={(e) => updateLine(index, "discountAmount", e.target.value)}
                                type="number"
                                min="0"
                                step="0.01"
                                className="crm-field min-w-[110px]"
                              />
                            </td>
                            <td className="align-top px-4 py-3">
                              <input
                                value={line.taxRate}
                                onChange={(e) => updateLine(index, "taxRate", e.target.value)}
                                type="number"
                                min="0"
                                step="0.01"
                                className="crm-field min-w-[90px]"
                              />
                            </td>
                            <td className="align-top px-4 py-3 text-sm font-medium text-slate-900">
                              {formatCurrency(lineAmount)}
                            </td>
                            <td className="align-top px-4 py-3">
                              <button
                                type="button"
                                onClick={() => removeLine(index)}
                                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-rose-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </section>

        <aside className="space-y-5">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Summary</div>
            <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
              <span>Subtotal</span>
              <span className="font-semibold text-slate-950">{formatCurrency(totals.subtotal)}</span>
            </div>
            <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
              <span>Tax</span>
              <span className="font-semibold text-slate-950">{formatCurrency(totals.tax)}</span>
            </div>
            <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
              <span>Total</span>
              <span className="font-semibold text-slate-950">{formatCurrency(totals.subtotal + totals.tax)}</span>
            </div>
          </section>

          {error && (
            <div className="flex items-start gap-3 rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button type="submit" disabled={isSubmitting || isLoading} className="w-full rounded-full bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
            {isSubmitting ? "Creating invoice..." : "Create sales invoice"}
          </button>
        </aside>
      </form>
    </div>
  );
}
      <CustomerQuickCreateDialog
        open={isCustomerDialogOpen}
        onOpenChange={setIsCustomerDialogOpen}
        onCreated={(customer) => {
          setCustomers((current) => [customer, ...current]);
          setCustomerId(String(customer.id));
        }}
      />
