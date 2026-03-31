import {
  AlertCircle,
  Barcode,
  CirclePlus,
  Receipt,
  Search,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth";
import type { ProductResponse } from "../inventory/api";
import { fetchProducts } from "../inventory/api";
import {
  buildSaleNotes,
  createSale,
  fetchCustomerSummaries,
  generateInvoice,
  type CustomerSummaryResponse,
  type PaymentDetailsDraft,
  type PaymentMethod,
} from "./api";

interface PosCartLine {
  id: string;
  productId: number;
  name: string;
  sku: string;
  barcode: string | null;
  unitPrice: number;
  quantity: number;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

export function PosScreen() {
  const { token, user } = useAuth();
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [customers, setCustomers] = useState<CustomerSummaryResponse[]>([]);
  const [query, setQuery] = useState("");
  const [scanCode, setScanCode] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetailsDraft>({});
  const [shippingAmount, setShippingAmount] = useState("0");
  const [discountAmount, setDiscountAmount] = useState("0");
  const [cart, setCart] = useState<PosCartLine[]>([]);
  const [generateInvoiceAfterSale, setGenerateInvoiceAfterSale] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    async function loadDependencies() {
      if (!token) {
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const [productResponse, customerResponse] = await Promise.all([
          fetchProducts(token),
          fetchCustomerSummaries(token),
        ]);
        setProducts(productResponse.content.filter((product) => product.isActive));
        setCustomers(customerResponse);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load POS data.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadDependencies();
  }, [token]);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return products.filter((product) => {
      if (!normalizedQuery) {
        return true;
      }

      return (
        product.name.toLowerCase().includes(normalizedQuery) ||
        product.sku.toLowerCase().includes(normalizedQuery) ||
        product.category?.name?.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [products, query]);

  const totals = useMemo(() => {
    const subtotal = cart.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);

    return {
      subtotal,
      grandTotal: subtotal + (Number(shippingAmount) || 0) - (Number(discountAmount) || 0),
    };
  }, [cart, shippingAmount, discountAmount]);

  function createCartRow(product: ProductResponse) {
    return {
      id: `${product.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      productId: product.id,
      name: product.name,
      sku: product.sku,
      barcode: product.barcode,
      unitPrice: product.unitPrice,
      quantity: 1,
    };
  }

  function addToCart(product: ProductResponse, mode: "merge" | "new-row" = "merge") {
    setSuccessMessage("");
    setCart((current) => {
      if (mode === "new-row") {
        return [...current, createCartRow(product)];
      }

      const existingLine = current.find((line) => line.productId === product.id);

      if (existingLine) {
        return current.map((line) =>
          line.id === existingLine.id
            ? { ...line, quantity: line.quantity + 1 }
            : line,
        );
      }

      return [...current, createCartRow(product)];
    });
  }

  function handleScanSubmit(rawCode?: string) {
    const normalizedCode = (rawCode ?? scanCode).trim().toLowerCase();

    if (!normalizedCode) {
      return;
    }

    const matchedProduct = products.find((product) => {
      const barcodeMatch = product.barcode?.trim().toLowerCase() === normalizedCode;
      const skuMatch = product.sku.trim().toLowerCase() === normalizedCode;
      return barcodeMatch || skuMatch;
    });

    if (!matchedProduct) {
      setError(`No product found for scanned code "${rawCode ?? scanCode}".`);
      setSuccessMessage("");
      return;
    }

    addToCart(matchedProduct, "new-row");
    setError("");
    setSuccessMessage(`${matchedProduct.name} added from scan.`);
    setScanCode("");
  }

  function updateQuantity(lineId: string, quantity: number) {
    setCart((current) =>
      current
        .map((line) =>
          line.id === lineId ? { ...line, quantity: Math.max(1, quantity) } : line,
        )
        .filter((line) => line.quantity > 0),
    );
  }

  function removeLine(lineId: string) {
    setCart((current) => current.filter((line) => line.id !== lineId));
  }

  async function handleCheckout() {
    if (!token || !user) {
      setError("No authenticated session found.");
      return;
    }

    if (cart.length === 0) {
      setError("Add at least one product to the cart.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setSuccessMessage("");

    try {
      const sale = await createSale(token, {
        customerId: selectedCustomerId ? Number(selectedCustomerId) : undefined,
        userId: user.id,
        saleDate: new Date().toISOString(),
        items: cart.map((line) => ({
          productId: line.productId,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
        })),
        discountAmount: Number(discountAmount) || 0,
        shippingAmount: Number(shippingAmount) || 0,
        paymentMethod,
        notes: buildSaleNotes(undefined, paymentMethod, paymentDetails),
      });

      if (generateInvoiceAfterSale) {
        const invoice = await generateInvoice(token, sale.id);
        setSuccessMessage(`Sale completed and invoice ${invoice.invoiceNumber} generated.`);
      } else {
        setSuccessMessage(`Sale completed successfully under reference ${sale.invoiceNumber}.`);
      }

      setCart([]);
      setSelectedCustomerId("");
      setShippingAmount("0");
      setDiscountAmount("0");
      setPaymentDetails({});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete sale.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_380px]">
      <section className="space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Sales
              </div>
              <h1 className="mt-3 text-3xl font-semibold text-slate-950">Point of Sale</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                Fast cashier flow using live products and customers. Checkout creates a sale in
                the backend, and can optionally generate an invoice immediately after.
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Counter user: <span className="font-medium text-slate-900">{user?.username}</span>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by product name, SKU, or category"
                className="crm-field pl-11"
              />
            </div>

            <div className="relative">
              <Barcode className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={scanCode}
                onChange={(event) => setScanCode(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleScanSubmit();
                  }
                }}
                placeholder="Scan barcode or QR code and press Enter"
                className="crm-field pl-11"
              />
            </div>
          </div>

          <div className="mt-3 text-xs text-slate-500">
            Scan mode matches exact `barcode` or `SKU`, then adds a fresh cart row automatically.
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {isLoading ? (
              <div className="col-span-full py-12 text-sm text-slate-500">Loading products...</div>
            ) : filteredProducts.length > 0 ? (
              filteredProducts.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => addToCart(product)}
                  className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-left transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-base font-semibold text-slate-950">{product.name}</div>
                      <div className="mt-1 text-sm text-slate-500">
                        {product.sku} · {product.category?.name || "Uncategorized"}
                      </div>
                    </div>
                    <CirclePlus className="h-5 w-5 text-slate-400" />
                  </div>
                  <div className="mt-5 text-lg font-semibold text-slate-950">
                    {formatCurrency(product.unitPrice)}
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    Stock: {product.stockQuantity ?? "N/A"}
                  </div>
                </button>
              ))
            ) : (
              <div className="col-span-full py-12 text-sm text-slate-500">
                No matching products found.
              </div>
            )}
          </div>
        </div>
      </section>

      <aside className="space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <div>
              <div className="text-lg font-semibold text-slate-950">Cart</div>
              <div className="text-sm text-slate-500">{cart.length} line items</div>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <label className="block rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Customer
              </div>
              <select
                value={selectedCustomerId}
                onChange={(event) => setSelectedCustomerId(event.target.value)}
                className="mt-3 w-full bg-transparent text-sm text-slate-900 outline-none"
              >
                <option value="">Walk-in customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Payment Method
              </div>
              <select
                value={paymentMethod}
                onChange={(event) => setPaymentMethod(event.target.value)}
                className="mt-3 w-full bg-transparent text-sm text-slate-900 outline-none"
              >
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
                <option value="UPI">UPI</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
              </select>
            </label>

            {paymentMethod !== "CASH" && (
              <section className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Payment Details
                </div>
                <div className="mt-4 grid gap-4">
                  <label>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Transaction Reference
                    </div>
                    <input
                      value={paymentDetails.transactionReference ?? ""}
                      onChange={(event) =>
                        updatePaymentDetails("transactionReference", event.target.value)
                      }
                      placeholder="Gateway or settlement reference"
                      className="crm-field"
                    />
                  </label>

                  {paymentMethod === "CARD" && (
                    <>
                      <label>
                        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Card Last 4
                        </div>
                        <input
                          value={paymentDetails.cardLastFourDigits ?? ""}
                          onChange={(event) =>
                            updatePaymentDetails("cardLastFourDigits", event.target.value)
                          }
                          placeholder="1234"
                          className="crm-field"
                        />
                      </label>
                      <label>
                        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Approval Code
                        </div>
                        <input
                          value={paymentDetails.cardApprovalCode ?? ""}
                          onChange={(event) =>
                            updatePaymentDetails("cardApprovalCode", event.target.value)
                          }
                          placeholder="Bank approval code"
                          className="crm-field"
                        />
                      </label>
                      <label>
                        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Terminal ID
                        </div>
                        <input
                          value={paymentDetails.cardTerminalId ?? ""}
                          onChange={(event) =>
                            updatePaymentDetails("cardTerminalId", event.target.value)
                          }
                          placeholder="POS terminal or device ID"
                          className="crm-field"
                        />
                      </label>
                    </>
                  )}

                  {paymentMethod === "UPI" && (
                    <>
                      <label>
                        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          UPI App
                        </div>
                        <input
                          value={paymentDetails.upiAppName ?? ""}
                          onChange={(event) =>
                            updatePaymentDetails("upiAppName", event.target.value)
                          }
                          placeholder="PhonePe, GPay, Paytm..."
                          className="crm-field"
                        />
                      </label>
                      <label>
                        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          UPI Transaction ID
                        </div>
                        <input
                          value={paymentDetails.upiTransactionId ?? ""}
                          onChange={(event) =>
                            updatePaymentDetails("upiTransactionId", event.target.value)
                          }
                          placeholder="UTR or app transaction ID"
                          className="crm-field"
                        />
                      </label>
                      <label>
                        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          UPI Reference Number
                        </div>
                        <input
                          value={paymentDetails.upiReferenceNumber ?? ""}
                          onChange={(event) =>
                            updatePaymentDetails("upiReferenceNumber", event.target.value)
                          }
                          placeholder="Optional PSP reference"
                          className="crm-field"
                        />
                      </label>
                    </>
                  )}

                  {paymentMethod === "BANK_TRANSFER" && (
                    <>
                      <label>
                        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Bank Name
                        </div>
                        <input
                          value={paymentDetails.bankName ?? ""}
                          onChange={(event) => updatePaymentDetails("bankName", event.target.value)}
                          placeholder="Bank used for transfer"
                          className="crm-field"
                        />
                      </label>
                      <label>
                        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Account Last 4
                        </div>
                        <input
                          value={paymentDetails.bankAccountLastFourDigits ?? ""}
                          onChange={(event) =>
                            updatePaymentDetails("bankAccountLastFourDigits", event.target.value)
                          }
                          placeholder="Beneficiary account last 4"
                          className="crm-field"
                        />
                      </label>
                      <label>
                        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Transfer Reference
                        </div>
                        <input
                          value={paymentDetails.bankTransferReference ?? ""}
                          onChange={(event) =>
                            updatePaymentDetails("bankTransferReference", event.target.value)
                          }
                          placeholder="NEFT / IMPS / RTGS reference"
                          className="crm-field"
                        />
                      </label>
                      <label>
                        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Transfer Date
                        </div>
                        <input
                          type="date"
                          value={paymentDetails.transferDate ?? ""}
                          onChange={(event) =>
                            updatePaymentDetails("transferDate", event.target.value)
                          }
                          className="crm-field"
                        />
                      </label>
                    </>
                  )}
                </div>
              </section>
            )}
          </div>

          <div className="mt-6 space-y-3">
            {cart.length > 0 ? (
              cart.map((line) => (
                <div key={line.id} className="rounded-2xl border border-slate-200 px-4 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-slate-900">{line.name}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {line.sku}
                        {line.barcode ? ` · ${line.barcode}` : ""}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLine(line.id)}
                      className="rounded-full p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <input
                      type="number"
                      min="1"
                      value={line.quantity}
                      onChange={(event) =>
                        updateQuantity(line.id, Number(event.target.value))
                      }
                      className="crm-field w-20 px-3"
                    />
                    <div className="text-sm font-medium text-slate-900">
                      {formatCurrency(line.unitPrice * line.quantity)}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                Add products to start billing.
              </div>
            )}
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <label className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Shipping
              </div>
              <input
                type="number"
                min="0"
                step="0.01"
                value={shippingAmount}
                onChange={(event) => setShippingAmount(event.target.value)}
                className="mt-3 w-full bg-transparent text-sm text-slate-900 outline-none"
              />
            </label>
            <label className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Discount
              </div>
              <input
                type="number"
                min="0"
                step="0.01"
                value={discountAmount}
                onChange={(event) => setDiscountAmount(event.target.value)}
                className="mt-3 w-full bg-transparent text-sm text-slate-900 outline-none"
              />
            </label>
          </div>

          <label className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={generateInvoiceAfterSale}
              onChange={(event) => setGenerateInvoiceAfterSale(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            <span>Generate invoice after sale</span>
          </label>

          {(error || successMessage) && (
            <div className="mt-5 space-y-3">
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

          <div className="mt-6 border-t border-slate-200 pt-5">
            <div className="space-y-3 text-sm text-slate-600">
              <div className="flex items-center justify-between">
                <span>Subtotal</span>
                <span className="font-medium text-slate-900">{formatCurrency(totals.subtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Shipping</span>
                <span className="font-medium text-slate-900">
                  {formatCurrency(Number(shippingAmount) || 0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Discount</span>
                <span className="font-medium text-slate-900">
                  {formatCurrency(Number(discountAmount) || 0)}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 pt-4 text-base">
                <span className="font-semibold text-slate-900">Grand Total</span>
                <span className="font-semibold text-slate-900">
                  {formatCurrency(totals.grandTotal)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void handleCheckout()}
              disabled={isSubmitting || isLoading}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Receipt className="h-4 w-4" />
              <span>{isSubmitting ? "Completing sale..." : "Complete sale"}</span>
            </button>
          </div>
        </section>
      </aside>
    </div>
  );
}
  function updatePaymentDetails(field: keyof PaymentDetailsDraft, value: string) {
    setPaymentDetails((current) => ({
      ...current,
      [field]: value,
    }));
  }
