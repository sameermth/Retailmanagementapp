import { AlertCircle, CirclePlus, PlayCircle, RefreshCcw, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth";
import { fetchWarehouses, type WarehouseResponse } from "../inventory/api";
import { SurfaceCard } from "../ui/surface";
import {
  createRecurringInvoice,
  fetchRecurringInvoices,
  fetchSalesCustomers,
  fetchStoreProductsForSales,
  runRecurringInvoice,
  type CreateRecurringInvoicePayload,
  type RecurringInvoiceSummaryResponse,
  type SalesCustomerSummary,
  type StoreProductOption,
} from "./api";

interface RecurringLineDraft {
  productId: string;
  quantity: string;
  unitPrice: string;
}

function formatDate(value: string | null | undefined) {
  return value ? new Date(value).toLocaleDateString("en-IN") : "Not set";
}

function formatDateInput(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function RecurringInvoices() {
  const { token, user } = useAuth();
  const [templates, setTemplates] = useState<RecurringInvoiceSummaryResponse[]>([]);
  const [customers, setCustomers] = useState<SalesCustomerSummary[]>([]);
  const [products, setProducts] = useState<StoreProductOption[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseResponse[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [frequency, setFrequency] = useState("MONTHLY");
  const [startDate, setStartDate] = useState(formatDateInput());
  const [nextRunDate, setNextRunDate] = useState(formatDateInput());
  const [endDate, setEndDate] = useState("");
  const [dueDays, setDueDays] = useState("7");
  const [remarks, setRemarks] = useState("");
  const [lines, setLines] = useState<RecurringLineDraft[]>([{ productId: "", quantity: "1", unitPrice: "" }]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function loadData() {
    if (!token || !user?.organizationId) {
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const [templateResponse, customerResponse, productResponse, warehouseResponse] = await Promise.all([
        fetchRecurringInvoices(token, user.organizationId),
        fetchSalesCustomers(token, user.organizationId),
        fetchStoreProductsForSales(token, user.organizationId),
        fetchWarehouses(token, user.organizationId, user.defaultBranchId ?? undefined),
      ]);
      setTemplates(templateResponse);
      setCustomers(customerResponse);
      setProducts(productResponse.filter((product) => product.isActive));
      const activeWarehouses = warehouseResponse.filter((warehouse) => warehouse.isActive);
      setWarehouses(activeWarehouses);

      if (customerResponse[0] && !customerId) {
        setCustomerId(String(customerResponse[0].id));
      }
      if (!warehouseId) {
        const preferredWarehouse =
          activeWarehouses.find((warehouse) => warehouse.isPrimary) ?? activeWarehouses[0] ?? null;
        if (preferredWarehouse) {
          setWarehouseId(String(preferredWarehouse.id));
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load recurring invoices.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [token, user?.organizationId]);

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === Number(customerId)) ?? null,
    [customerId, customers],
  );

  function updateLine(index: number, field: keyof RecurringLineDraft, value: string) {
    setLines((current) => current.map((line, lineIndex) => (lineIndex === index ? { ...line, [field]: value } : line)));
  }

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !user?.organizationId || !user.defaultBranchId || !warehouseId || !customerId) {
      setError("Customer, warehouse, and branch context are required.");
      return;
    }

    const normalizedLines = lines
      .map((line) => {
        const product = products.find((item) => item.id === Number(line.productId));
        const quantity = Number(line.quantity);
        return product && quantity > 0
          ? {
              productId: product.id,
              uomId: product.baseUomId,
              quantity,
              baseQuantity: quantity,
              unitPrice: line.unitPrice ? Number(line.unitPrice) : product.defaultSalePrice ?? undefined,
            }
          : null;
      })
      .filter((line): line is CreateRecurringInvoicePayload["lines"][number] => Boolean(line));

    if (normalizedLines.length === 0) {
      setError("At least one valid recurring line is required.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setSuccessMessage("");

    try {
      await createRecurringInvoice(token, {
        organizationId: user.organizationId,
        branchId: user.defaultBranchId,
        warehouseId: Number(warehouseId),
        customerId: Number(customerId),
        frequency,
        startDate,
        nextRunDate,
        endDate: endDate || undefined,
        dueDays: dueDays ? Number(dueDays) : undefined,
        placeOfSupplyStateCode: selectedCustomer?.stateCode ?? undefined,
        remarks: remarks.trim() || undefined,
        isActive: true,
        lines: normalizedLines,
      });
      setSuccessMessage("Recurring invoice template created.");
      setLines([{ productId: "", quantity: "1", unitPrice: "" }]);
      setRemarks("");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create recurring invoice template.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRunNow(templateId: number) {
    if (!token || !user?.organizationId) {
      return;
    }

    setError("");
    setSuccessMessage("");
    try {
      await runRecurringInvoice(token, templateId, user.organizationId, {
        runDate: formatDateInput(),
      });
      setSuccessMessage("Recurring invoice template executed.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run recurring invoice template.");
    }
  }

  return (
    <div className="space-y-6">
      <SurfaceCard as="section" padding="lg">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Sales</div>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">Recurring Invoices</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          This screen is now aligned to the live ERP recurring invoice template flow and supports
          both template creation and immediate run actions.
        </p>
      </SurfaceCard>

      <section className="grid gap-6 xl:grid-cols-[520px_minmax(0,1fr)] 2xl:grid-cols-[560px_minmax(0,1fr)]">
        <SurfaceCard as="form" onSubmit={handleCreate}>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
              <CirclePlus className="h-5 w-5" />
            </div>
            <div>
              <div className="text-lg font-semibold text-slate-950">Create Template</div>
              <div className="text-sm text-slate-500">ERP recurring billing flow</div>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <select value={customerId} onChange={(event) => setCustomerId(event.target.value)} className="crm-select">
              <option value="">Select customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.fullName}
                </option>
              ))}
            </select>

            <div className="grid gap-4 md:grid-cols-2">
              <select value={warehouseId} onChange={(event) => setWarehouseId(event.target.value)} className="crm-select">
                <option value="">Select warehouse</option>
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name} ({warehouse.code})
                  </option>
                ))}
              </select>
              <select value={frequency} onChange={(event) => setFrequency(event.target.value)} className="crm-select">
                {["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"].map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="crm-field" />
              <input type="date" value={nextRunDate} onChange={(event) => setNextRunDate(event.target.value)} className="crm-field" />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="crm-field" placeholder="End date" />
              <input value={dueDays} onChange={(event) => setDueDays(event.target.value)} type="number" min="0" className="crm-field" placeholder="Due days" />
            </div>

            {lines.map((line, index) => (
              <div key={index} className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-[minmax(0,1.4fr)_90px_110px_40px]">
                <select
                  value={line.productId}
                  onChange={(event) => {
                    const product = products.find((item) => item.id === Number(event.target.value));
                    updateLine(index, "productId", event.target.value);
                    updateLine(index, "unitPrice", String(product?.defaultSalePrice ?? ""));
                  }}
                  className="crm-select"
                >
                  <option value="">Select product</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.sku})
                    </option>
                  ))}
                </select>
                <input value={line.quantity} onChange={(event) => updateLine(index, "quantity", event.target.value)} type="number" min="0" step="0.001" className="crm-field" placeholder="Qty" />
                <input value={line.unitPrice} onChange={(event) => updateLine(index, "unitPrice", event.target.value)} type="number" min="0" step="0.01" className="crm-field" placeholder="Price" />
                <button type="button" onClick={() => setLines((current) => current.length === 1 ? current : current.filter((_, lineIndex) => lineIndex !== index))} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}

            <button type="button" onClick={() => setLines((current) => [...current, { productId: "", quantity: "1", unitPrice: "" }])} className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-700">
              <CirclePlus className="h-4 w-4" />
              Add line
            </button>

            <input value={remarks} onChange={(event) => setRemarks(event.target.value)} className="crm-field" placeholder="Remarks" />

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Posting branch: <span className="font-medium text-slate-950">#{user?.defaultBranchId ?? "-"}</span>
              {" · "}
              Place of supply: <span className="font-medium text-slate-950">{selectedCustomer?.stateCode || "Derived from customer"}</span>
            </div>

            {(error || successMessage) && (
              <div className="space-y-3">
                {error ? (
                  <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                ) : null}
                {successMessage ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {successMessage}
                  </div>
                ) : null}
              </div>
            )}

            <button type="submit" disabled={isSubmitting || isLoading} className="w-full rounded-full bg-slate-950 px-4 py-3 text-sm font-medium text-white disabled:opacity-60">
              {isSubmitting ? "Creating..." : "Create recurring template"}
            </button>
          </div>
        </SurfaceCard>

        <SurfaceCard as="section">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Recurring Templates</h2>
              <p className="mt-2 text-sm text-slate-600">Backend source: `/api/erp/sales/recurring-invoices`</p>
            </div>
            <button type="button" onClick={() => void loadData()} className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </button>
          </div>

          <div className="mt-5 space-y-3">
            {templates.length > 0 ? (
              templates.map((template) => (
                <div key={template.id} className="rounded-2xl border border-slate-200 px-4 py-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="text-sm font-medium text-slate-900">{template.templateNumber}</div>
                      <div className="mt-1 text-sm text-slate-500">
                        Customer #{template.customerId} · Warehouse #{template.warehouseId}
                      </div>
                      <div className="mt-2 text-xs text-slate-500">
                        {template.frequency} · Next run {formatDate(template.nextRunDate)}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        Start {formatDate(template.startDate)} · End {formatDate(template.endDate)}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => void handleRunNow(template.id)} className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
                        <PlayCircle className="h-4 w-4" />
                        Run now
                      </button>
                      <span className={`inline-flex rounded-full px-3 py-2 text-xs font-medium ${template.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                        {template.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-slate-500">No recurring invoice templates returned yet.</div>
            )}
          </div>
        </SurfaceCard>
      </section>
    </div>
  );
}
