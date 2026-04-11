import { AlertCircle, CirclePlus, ScrollText, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth";
import { fetchWarehouses, type WarehouseResponse } from "../inventory/api";
import { DataTable, type DataTableColumn } from "../ui/data-table";
import { SurfaceCard } from "../ui/surface";
import {
  cancelOrder,
  createOrder,
  fetchOrder,
  fetchOrderPdf,
  fetchOrders,
  fetchSalesCustomers,
  fetchStoreProductsForSales,
  type SalesCustomerSummary,
  type SalesOrderDetailResponse,
  type SalesOrderSummaryResponse,
  type StoreProductOption,
} from "./api";
import { CustomerQuickCreateDialog } from "./CustomerQuickCreateDialog";
import { DocumentDetailsDialog, formatDate } from "./DocumentDetailsDialog";

interface OrderLineDraft {
  productId: string;
  quantity: string;
  unitPrice: string;
}

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(value ?? 0);
}

export function SalesOrders() {
  const { token, user } = useAuth();
  const [orders, setOrders] = useState<SalesOrderSummaryResponse[]>([]);
  const [customers, setCustomers] = useState<SalesCustomerSummary[]>([]);
  const [products, setProducts] = useState<StoreProductOption[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseResponse[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [remarks, setRemarks] = useState("");
  const [lines, setLines] = useState<OrderLineDraft[]>([{ productId: "", quantity: "1", unitPrice: "" }]);
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<SalesOrderDetailResponse | null>(null);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [orderPdfUrl, setOrderPdfUrl] = useState<string | null>(null);
  const [isOrderPdfLoading, setIsOrderPdfLoading] = useState(false);
  const [orderPdfError, setOrderPdfError] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [cancelSuccess, setCancelSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    async function loadData() {
      if (!token || !user?.organizationId) return;
      setIsLoading(true);
      setError("");
      try {
        const [ordersResponse, customersResponse, productsResponse, warehouseResponse] = await Promise.all([
          fetchOrders(token, user.organizationId),
          fetchSalesCustomers(token, user.organizationId),
          fetchStoreProductsForSales(token, user.organizationId),
          fetchWarehouses(token, user.organizationId, user.defaultBranchId ?? undefined),
        ]);
        setOrders(ordersResponse);
        setCustomers(customersResponse);
        setProducts(productsResponse.filter((product) => product.isActive));
        setWarehouses(warehouseResponse.filter((warehouse) => warehouse.isActive));
        if (customersResponse[0]) setCustomerId(String(customersResponse[0].id));
        const preferredWarehouse = warehouseResponse.find((warehouse) => warehouse.isPrimary) ?? warehouseResponse[0];
        if (preferredWarehouse) {
          setWarehouseId(preferredWarehouse.id.toString());
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load sales orders.");
      } finally {
        setIsLoading(false);
      }
    }
    void loadData();
  }, [token, user?.organizationId]);

  useEffect(
    () => () => {
      if (orderPdfUrl) {
        URL.revokeObjectURL(orderPdfUrl);
      }
    },
    [orderPdfUrl],
  );

  function updateLine(index: number, field: keyof OrderLineDraft, value: string) {
    setLines((current) => current.map((line, i) => (i === index ? { ...line, [field]: value } : line)));
  }

  const filteredOrders = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return orders.filter((order) => !query || order.orderNumber.toLowerCase().includes(query) || order.status.toLowerCase().includes(query));
  }, [orders, searchTerm]);

  const orderColumns = useMemo<DataTableColumn<SalesOrderSummaryResponse>[]>(
    () => [
      {
        key: "order",
        header: "Order",
        value: (order) => `${order.orderNumber} ${order.customerId}`,
        render: (order) => (
          <div>
            <div className="text-base font-semibold text-slate-950">{order.orderNumber}</div>
            <div className="mt-1 text-sm text-slate-500">Customer #{order.customerId}</div>
          </div>
        ),
      },
      {
        key: "date",
        header: "Date",
        value: (order) => order.orderDate,
        render: (order) => (
          <span className="text-sm text-slate-600">
            {new Date(order.orderDate).toLocaleDateString("en-IN")}
          </span>
        ),
      },
      {
        key: "total",
        header: "Total",
        value: (order) => order.totalAmount,
        render: (order) => <span className="text-sm font-medium text-slate-900">{formatCurrency(order.totalAmount)}</span>,
      },
      {
        key: "status",
        header: "Status",
        value: (order) => order.status,
        render: (order) => (
          <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
            {order.status}
          </span>
        ),
      },
      {
        key: "action",
        header: "Action",
        sortable: false,
        filterable: false,
        render: (order) => (
          <button
            type="button"
            onClick={() => void openDetails(order.id)}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
          >
            View details
          </button>
        ),
      },
    ],
    [openDetails],
  );

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === Number(customerId)) ?? null,
    [customerId, customers],
  );

  async function handleCreateOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !user?.organizationId || !user.defaultBranchId) {
      setError("Organization or branch context is missing in the current session.");
      return;
    }

    const normalizedLines = lines.map((line) => {
      const product = products.find((item) => item.id === Number(line.productId));
      const quantity = Number(line.quantity);
      const unitPrice = Number(line.unitPrice);
      return product && quantity > 0
        ? { productId: product.id, uomId: product.baseUomId, quantity, baseQuantity: quantity, unitPrice: unitPrice || 0 }
        : null;
    }).filter((line): line is NonNullable<typeof line> => Boolean(line));

    if (!customerId || !warehouseId || normalizedLines.length === 0) {
      setError("Customer, warehouse, and at least one valid line are required.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setSuccessMessage("");
    try {
      await createOrder(token, {
        organizationId: user.organizationId,
        branchId: user.defaultBranchId,
        warehouseId: Number(warehouseId),
        customerId: Number(customerId),
        orderDate,
        placeOfSupplyStateCode: selectedCustomer?.stateCode ?? undefined,
        remarks: remarks.trim() || undefined,
        lines: normalizedLines,
      });
      setOrders(await fetchOrders(token, user.organizationId));
      setSuccessMessage("Sales order created.");
      setLines([{ productId: "", quantity: "1", unitPrice: "" }]);
      setRemarks("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create sales order.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function openDetails(orderId: number) {
    if (!token) {
      return;
    }

    if (orderPdfUrl) {
      URL.revokeObjectURL(orderPdfUrl);
      setOrderPdfUrl(null);
    }
    setOrderPdfError("");
    setCancelReason("");
    setCancelError("");
    setCancelSuccess("");
    setSelectedOrderId(orderId);
    setIsDetailsLoading(true);

    try {
      setSelectedOrder(await fetchOrder(token, orderId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sales order details.");
    } finally {
      setIsDetailsLoading(false);
    }
  }

  async function loadOrderPdf() {
    if (!token || !selectedOrderId) {
      return;
    }

    setIsOrderPdfLoading(true);
    setOrderPdfError("");

    try {
      const pdfBlob = await fetchOrderPdf(token, selectedOrderId);
      if (orderPdfUrl) {
        URL.revokeObjectURL(orderPdfUrl);
      }
      setOrderPdfUrl(URL.createObjectURL(pdfBlob));
    } catch (err) {
      setOrderPdfError(err instanceof Error ? err.message : "Failed to load order PDF.");
    } finally {
      setIsOrderPdfLoading(false);
    }
  }

  function printOrderPdf() {
    if (!orderPdfUrl) {
      return;
    }

    const previewWindow = window.open(orderPdfUrl, "_blank", "noopener,noreferrer");
    previewWindow?.addEventListener("load", () => previewWindow.print(), { once: true });
  }

  async function handleCancelOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token || !selectedOrder || !cancelReason.trim()) {
      setCancelError("Cancellation reason is required.");
      return;
    }

    setIsCancelling(true);
    setCancelError("");
    setCancelSuccess("");

    try {
      const updatedOrder = await cancelOrder(token, selectedOrder.id, {
        organizationId: selectedOrder.organizationId,
        branchId: selectedOrder.branchId,
        reason: cancelReason.trim(),
      });
      setSelectedOrder(updatedOrder);
      if (user?.organizationId) {
        setOrders(await fetchOrders(token, user.organizationId));
      }
      setCancelSuccess(`Order ${updatedOrder.orderNumber} cancelled.`);
      setCancelReason("");
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : "Failed to cancel sales order.");
    } finally {
      setIsCancelling(false);
    }
  }

  return (
    <div className="space-y-6">
      <SurfaceCard as="section" padding="lg">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Sales</div>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">Sales Orders</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">Live ERP sales orders from `/api/erp/sales/orders`, with direct order creation.</p>
      </SurfaceCard>

      <section className="grid gap-6 xl:grid-cols-[520px_minmax(0,1fr)] 2xl:grid-cols-[560px_minmax(0,1fr)]">
        <SurfaceCard as="form" onSubmit={handleCreateOrder}>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-slate-100 p-3 text-slate-700"><CirclePlus className="h-5 w-5" /></div>
            <div><div className="text-lg font-semibold text-slate-950">Create Order</div><div className="text-sm text-slate-500">Direct ERP sales order flow</div></div>
          </div>
          <div className="mt-6 space-y-4">
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="crm-select">
              <option value="">Select customer</option>
              {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.fullName}</option>)}
            </select>
            <button
              type="button"
              onClick={() => setIsCustomerDialogOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-700"
            >
              <CirclePlus className="h-4 w-4" />
              <span>New customer</span>
            </button>
            <div className="grid gap-4 md:grid-cols-2">
              <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className="crm-select">
                <option value="">Select warehouse</option>
                {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name} ({warehouse.code})</option>)}
              </select>
              <input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} className="crm-field" />
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Posting branch: <span className="font-medium text-slate-950">#{user?.defaultBranchId ?? "-"}</span>
              {" · "}
              Place of supply: <span className="font-medium text-slate-950">{selectedCustomer?.stateCode || "Derived when customer has a state code"}</span>
            </div>
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <div className="hidden grid-cols-[minmax(0,1.8fr)_110px_140px_140px_54px] gap-3 bg-slate-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 lg:grid">
                <div>Product</div>
                <div>Qty</div>
                <div>Price</div>
                <div>Amount</div>
                <div>Action</div>
              </div>
              <div className="divide-y divide-slate-200 bg-white">
                {lines.map((line, index) => {
                  const lineAmount = (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0);

                  return (
                    <div key={index} className="grid gap-3 px-4 py-4 lg:grid-cols-[minmax(0,1.8fr)_110px_140px_140px_54px] lg:items-center">
                      <div>
                        <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 lg:hidden">Product</div>
                        <select value={line.productId} onChange={(e) => {
                          const product = products.find((item) => item.id === Number(e.target.value));
                          updateLine(index, "productId", e.target.value);
                          updateLine(index, "unitPrice", String(product?.defaultSalePrice ?? ""));
                        }} className="crm-select">
                          <option value="">Select product</option>
                          {products.map((product) => <option key={product.id} value={product.id}>{product.name} ({product.sku})</option>)}
                        </select>
                      </div>
                      <div>
                        <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 lg:hidden">Qty</div>
                        <input value={line.quantity} onChange={(e) => updateLine(index, "quantity", e.target.value)} type="number" min="0" step="0.001" className="crm-field" placeholder="Qty" />
                      </div>
                      <div>
                        <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 lg:hidden">Price</div>
                        <input value={line.unitPrice} onChange={(e) => updateLine(index, "unitPrice", e.target.value)} type="number" min="0" step="0.01" className="crm-field" placeholder="Price" />
                      </div>
                      <div>
                        <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 lg:hidden">Amount</div>
                        <div className="flex h-9 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-900">
                          {formatCurrency(lineAmount)}
                        </div>
                      </div>
                      <div className="flex justify-end lg:justify-center">
                        <button type="button" onClick={() => setLines((current) => current.length === 1 ? current : current.filter((_, i) => i !== index))} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <button type="button" onClick={() => setLines((current) => [...current, { productId: "", quantity: "1", unitPrice: "" }])} className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-700"><CirclePlus className="h-4 w-4" />Add line</button>
            <input value={remarks} onChange={(e) => setRemarks(e.target.value)} className="crm-field" placeholder="Remarks" />
            {(error || successMessage) && (
              <div className="space-y-3">
                {error && <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"><AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" /><span>{error}</span></div>}
                {successMessage && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{successMessage}</div>}
              </div>
            )}
            <button type="submit" disabled={isSubmitting || isLoading} className="w-full rounded-full bg-slate-950 px-4 py-3 text-sm font-medium text-white disabled:opacity-60">{isSubmitting ? "Creating..." : "Create sales order"}</button>
          </div>
        </SurfaceCard>

        <SurfaceCard as="section">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search order number or status" className="crm-field pl-11" />
          </div>
          <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200">
            {isLoading ? (
              <div className="px-6 py-16 text-center text-sm text-slate-500">Loading orders...</div>
            ) : filteredOrders.length > 0 ? (
              <DataTable
                columns={orderColumns}
                rows={filteredOrders}
                rowKey={(order) => order.id}
                className="overflow-x-auto"
              />
            ) : (
              <div className="px-6 py-16 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                  <ScrollText className="h-6 w-6" />
                </div>
                <h2 className="mt-4 text-lg font-semibold text-slate-950">No sales orders yet</h2>
              </div>
            )}
          </div>
        </SurfaceCard>
      </section>
      <CustomerQuickCreateDialog
        open={isCustomerDialogOpen}
        onOpenChange={setIsCustomerDialogOpen}
        onCreated={(customer) => {
          setCustomers((current) => [customer, ...current]);
          setCustomerId(String(customer.id));
        }}
      />
      <DocumentDetailsDialog
        open={selectedOrderId !== null}
        onOpenChange={(open) => {
          if (!open) {
            if (orderPdfUrl) {
              URL.revokeObjectURL(orderPdfUrl);
            }
            setSelectedOrderId(null);
            setSelectedOrder(null);
            setOrderPdfUrl(null);
            setOrderPdfError("");
            setCancelReason("");
            setCancelError("");
            setCancelSuccess("");
          }
        }}
        title={selectedOrder?.orderNumber ?? "Order details"}
        description="Sales order details from the ERP sales order endpoint."
        loading={isDetailsLoading}
        rows={[
          { label: "Customer", value: selectedOrder?.customerId ? `Customer #${selectedOrder.customerId}` : "-" },
          { label: "Order Date", value: formatDate(selectedOrder?.orderDate) },
          { label: "Warehouse", value: selectedOrder?.warehouseId ? `Warehouse #${selectedOrder.warehouseId}` : "-" },
          { label: "Status", value: selectedOrder?.status ?? "-" },
          { label: "Subtotal", value: formatCurrency(selectedOrder?.subtotal) },
          { label: "Tax", value: formatCurrency(selectedOrder?.taxAmount) },
          { label: "Total", value: formatCurrency(selectedOrder?.totalAmount) },
          { label: "Remarks", value: selectedOrder?.remarks ?? "-" },
        ]}
        lines={(selectedOrder?.lines ?? []).map((line) => ({
          id: line.id,
          productId: line.productId,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          lineAmount: line.lineAmount,
          remarks: line.remarks,
        }))}
        pdfUrl={orderPdfUrl}
        pdfLoading={isOrderPdfLoading}
        pdfError={orderPdfError}
        onLoadPdf={() => void loadOrderPdf()}
        onPrintPdf={printOrderPdf}
      >
        {selectedOrder && selectedOrder.status !== "CANCELLED" ? (
          <form onSubmit={handleCancelOrder} className="rounded-3xl border border-slate-200 bg-white p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Cancel Order
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  Cancel this order when it should no longer remain active. Orders already converted to invoices will still be blocked by the backend.
                </div>
              </div>
              <div className="rounded-2xl bg-slate-100 px-3 py-2 text-right">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Current Status
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-950">{selectedOrder.status}</div>
              </div>
            </div>

            <label className="mt-4 block">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Cancellation Reason
              </div>
              <input
                value={cancelReason}
                onChange={(event) => setCancelReason(event.target.value)}
                className="crm-field"
                placeholder="Reason for cancelling this order"
              />
            </label>

            {cancelError ? (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {cancelError}
              </div>
            ) : null}

            {cancelSuccess ? (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {cancelSuccess}
              </div>
            ) : null}

            <div className="mt-4 flex justify-end">
              <button
                type="submit"
                disabled={isCancelling}
                className="rounded-full bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCancelling ? "Cancelling..." : "Cancel order"}
              </button>
            </div>
          </form>
        ) : null}
      </DocumentDetailsDialog>
    </div>
  );
}
