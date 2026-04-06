import { AlertCircle, CirclePlus, Search, Settings2, SquarePen, Users, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "../../auth";
import {
  fetchCustomers,
  fetchCustomerTerms,
  updateCustomer,
  upsertCustomerTerms,
  type CustomerResponse,
  type CustomerRequestPayload,
} from "./api";

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value ?? 0);
}

interface CustomerEditorState {
  fullName: string;
  customerType: string;
  tradeName: string;
  email: string;
  phone: string;
  gstin: string;
  state: string;
  stateCode: string;
  creditLimit: string;
  status: string;
  customerSegment: string;
  creditDays: string;
  loyaltyEnabled: boolean;
  loyaltyPointsBalance: string;
  priceTier: string;
  discountPolicy: string;
  isPreferred: boolean;
  isActive: boolean;
  contractStart: string;
  contractEnd: string;
  remarks: string;
}

function createEditorState(customer: CustomerResponse): CustomerEditorState {
  return {
    fullName: customer.fullName ?? "",
    customerType: customer.customerType ?? "BUSINESS",
    tradeName: customer.tradeName ?? "",
    email: customer.email ?? "",
    phone: customer.phone ?? "",
    gstin: customer.gstin ?? "",
    state: customer.state ?? "",
    stateCode: customer.stateCode ?? "",
    creditLimit: customer.creditLimit != null ? String(customer.creditLimit) : "",
    status: customer.status ?? "ACTIVE",
    customerSegment: "",
    creditDays: "",
    loyaltyEnabled: false,
    loyaltyPointsBalance: "",
    priceTier: "",
    discountPolicy: "",
    isPreferred: false,
    isActive: true,
    contractStart: "",
    contractEnd: "",
    remarks: "",
  };
}

export function CustomersList() {
  const { token, user, hasAnyPermission } = useAuth();
  const [customers, setCustomers] = useState<CustomerResponse[]>([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerResponse | null>(null);
  const [editor, setEditor] = useState<CustomerEditorState | null>(null);
  const [isLoadingTerms, setIsLoadingTerms] = useState(false);
  const [modalError, setModalError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const canManageCustomers = hasAnyPermission(["sales.create", "sales.manage"]);

  async function loadCustomers() {
    if (!token || !user?.organizationId) {
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetchCustomers(token, user.organizationId);
      setCustomers(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load customers.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadCustomers();
  }, [token, user?.organizationId]);

  const filteredCustomers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return customers.filter((customer) => {
      if (!normalizedQuery) {
        return true;
      }

      return (
        customer.fullName.toLowerCase().includes(normalizedQuery) ||
        customer.customerCode.toLowerCase().includes(normalizedQuery) ||
        customer.tradeName?.toLowerCase().includes(normalizedQuery) ||
        customer.email?.toLowerCase().includes(normalizedQuery) ||
        customer.phone?.includes(normalizedQuery)
      );
    });
  }, [customers, query]);

  const activeCount = filteredCustomers.filter((customer) => customer.status === "ACTIVE").length;
  const totalCreditLimit = filteredCustomers.reduce(
    (total, customer) => total + Number(customer.creditLimit ?? 0),
    0,
  );

  async function openEditor(customer: CustomerResponse) {
    if (!token || !user?.organizationId) {
      return;
    }

    setSelectedCustomer(customer);
    setEditor(createEditorState(customer));
    setModalError("");
    setIsLoadingTerms(true);

    try {
      const terms = await fetchCustomerTerms(token, user.organizationId, customer.id).catch(() => null);
      setEditor((current) =>
        current
          ? {
              ...current,
              customerSegment: terms?.customerSegment ?? "",
              creditDays: terms?.creditDays != null ? String(terms.creditDays) : "",
              loyaltyEnabled: terms?.loyaltyEnabled ?? false,
              loyaltyPointsBalance:
                terms?.loyaltyPointsBalance != null ? String(terms.loyaltyPointsBalance) : "",
              priceTier: terms?.priceTier ?? "",
              discountPolicy: terms?.discountPolicy ?? "",
              isPreferred: terms?.isPreferred ?? false,
              isActive: terms?.isActive ?? true,
              contractStart: terms?.contractStart ?? "",
              contractEnd: terms?.contractEnd ?? "",
              remarks: terms?.remarks ?? "",
            }
          : current,
      );
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Failed to load store customer terms.");
    } finally {
      setIsLoadingTerms(false);
    }
  }

  function closeEditor() {
    setSelectedCustomer(null);
    setEditor(null);
    setModalError("");
    setIsLoadingTerms(false);
    setIsSaving(false);
  }

  function updateEditor<Key extends keyof CustomerEditorState>(
    field: Key,
    value: CustomerEditorState[Key],
  ) {
    setEditor((current) => (current ? { ...current, [field]: value } : current));
    setModalError("");
  }

  async function handleSaveCustomer() {
    if (!token || !user?.organizationId || !selectedCustomer || !editor) {
      return;
    }

    setIsSaving(true);
    setModalError("");

    const masterPayload: CustomerRequestPayload = {
      fullName: editor.fullName.trim(),
      customerType: editor.customerType.trim() || undefined,
      tradeName: editor.tradeName.trim() || undefined,
      email: editor.email.trim() || undefined,
      phone: editor.phone.trim() || undefined,
      gstin: editor.gstin.trim() || undefined,
      state: editor.state.trim() || undefined,
      stateCode: editor.stateCode.trim() || undefined,
      creditLimit: editor.creditLimit.trim() ? Number(editor.creditLimit) : undefined,
      status: editor.status.trim() || undefined,
    };

    try {
      await updateCustomer(token, user.organizationId, selectedCustomer.id, masterPayload);
      await upsertCustomerTerms(token, user.organizationId, selectedCustomer.id, {
        customerSegment: editor.customerSegment.trim() || undefined,
        creditLimit: editor.creditLimit.trim() ? Number(editor.creditLimit) : undefined,
        creditDays: editor.creditDays.trim() ? Number(editor.creditDays) : undefined,
        loyaltyEnabled: editor.loyaltyEnabled,
        loyaltyPointsBalance: editor.loyaltyPointsBalance.trim()
          ? Number(editor.loyaltyPointsBalance)
          : undefined,
        priceTier: editor.priceTier.trim() || undefined,
        discountPolicy: editor.discountPolicy.trim() || undefined,
        isPreferred: editor.isPreferred,
        isActive: editor.isActive,
        contractStart: editor.contractStart || undefined,
        contractEnd: editor.contractEnd || undefined,
        remarks: editor.remarks.trim() || undefined,
      });
      await loadCustomers();
      closeEditor();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Failed to save customer changes.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              People
            </div>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">Customers</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              ERP customer master for the active organization, now enriched with store-customer
              terms like segment, credit days, loyalty, pricing tier, and contract dates.
            </p>
          </div>

          <Link
            to="/people/customers/new"
            className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            <CirclePlus className="h-4 w-4" />
            <span>New customer</span>
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Customers
          </div>
          <div className="mt-3 text-2xl font-semibold text-slate-950">{filteredCustomers.length}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Active
          </div>
          <div className="mt-3 text-2xl font-semibold text-slate-950">{activeCount}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Credit Exposure
          </div>
          <div className="mt-3 text-2xl font-semibold text-slate-950">
            {formatCurrency(totalCreditLimit)}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by code, full name, trade name, email, or phone"
            className="crm-field pl-11"
          />
        </div>

        {error && (
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {isLoading ? (
            <div className="col-span-full py-10 text-sm text-slate-500">Loading customers...</div>
          ) : filteredCustomers.length > 0 ? (
            filteredCustomers.map((customer) => (
              <article key={customer.id} className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="rounded-lg bg-slate-100 p-2.5 text-slate-700">
                    <Users className="h-4 w-4" />
                  </div>
                  <div
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      customer.status === "ACTIVE"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {customer.status || "UNKNOWN"}
                  </div>
                </div>

                <h2 className="mt-4 text-base font-semibold text-slate-950">{customer.fullName}</h2>
                <div className="mt-1 text-sm text-slate-500">
                  {customer.customerCode} · {customer.customerType || "Standard"}
                </div>

                <div className="mt-4 space-y-2 text-sm text-slate-600">
                  <div>{customer.tradeName || customer.legalName || "No trade name"}</div>
                  <div>{customer.email || "No email"}</div>
                  <div>{customer.phone || "No phone"}</div>
                  <div>
                    {customer.state || "State not set"}
                    {customer.stateCode ? ` · ${customer.stateCode}` : ""}
                  </div>
                </div>

                <div className="mt-4 border-t border-slate-200 pt-4 text-sm text-slate-600">
                  <div>GSTIN: {customer.gstin || "Not set"}</div>
                  <div className="mt-1">Credit limit: {formatCurrency(customer.creditLimit)}</div>
                </div>

                {canManageCustomers ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void openEditor(customer)}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                    >
                      <SquarePen className="h-3.5 w-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void openEditor(customer)}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                    >
                      <Settings2 className="h-3.5 w-3.5" />
                      <span>Store terms</span>
                    </button>
                  </div>
                ) : null}
              </article>
            ))
          ) : (
            <div className="col-span-full py-10 text-sm text-slate-500">No customers found.</div>
          )}
        </div>
      </section>

      {selectedCustomer && editor ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-5">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Customer Maintenance
                </div>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                  {selectedCustomer.fullName}
                </h2>
                <div className="mt-2 text-sm text-slate-600">
                  Update master data and store-specific commercial terms in one place.
                </div>
              </div>
              <button
                type="button"
                onClick={closeEditor}
                className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-2">
              <section className="space-y-4 rounded-2xl border border-slate-200 p-5">
                <div className="text-sm font-semibold text-slate-900">Customer Master</div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Full Name</div>
                    <input value={editor.fullName} onChange={(e) => updateEditor("fullName", e.target.value)} className="crm-field" />
                  </label>
                  <label>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Type</div>
                    <input value={editor.customerType} onChange={(e) => updateEditor("customerType", e.target.value)} className="crm-field" />
                  </label>
                  <label>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Trade Name</div>
                    <input value={editor.tradeName} onChange={(e) => updateEditor("tradeName", e.target.value)} className="crm-field" />
                  </label>
                  <label>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Phone</div>
                    <input value={editor.phone} onChange={(e) => updateEditor("phone", e.target.value)} className="crm-field" />
                  </label>
                  <label>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Email</div>
                    <input value={editor.email} onChange={(e) => updateEditor("email", e.target.value)} className="crm-field" />
                  </label>
                  <label>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">GSTIN</div>
                    <input value={editor.gstin} onChange={(e) => updateEditor("gstin", e.target.value)} className="crm-field" />
                  </label>
                  <label>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Credit Limit</div>
                    <input value={editor.creditLimit} onChange={(e) => updateEditor("creditLimit", e.target.value)} className="crm-field" />
                  </label>
                  <label>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">State</div>
                    <input value={editor.state} onChange={(e) => updateEditor("state", e.target.value)} className="crm-field" />
                  </label>
                  <label>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">State Code</div>
                    <input value={editor.stateCode} onChange={(e) => updateEditor("stateCode", e.target.value)} className="crm-field" />
                  </label>
                </div>
              </section>

              <section className="space-y-4 rounded-2xl border border-slate-200 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-slate-900">Store Terms</div>
                  {isLoadingTerms ? <div className="text-xs text-slate-500">Loading terms...</div> : null}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Segment</div>
                    <input value={editor.customerSegment} onChange={(e) => updateEditor("customerSegment", e.target.value)} className="crm-field" />
                  </label>
                  <label>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Credit Days</div>
                    <input value={editor.creditDays} onChange={(e) => updateEditor("creditDays", e.target.value)} className="crm-field" />
                  </label>
                  <label>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Price Tier</div>
                    <input value={editor.priceTier} onChange={(e) => updateEditor("priceTier", e.target.value)} className="crm-field" />
                  </label>
                  <label>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Discount Policy</div>
                    <input value={editor.discountPolicy} onChange={(e) => updateEditor("discountPolicy", e.target.value)} className="crm-field" />
                  </label>
                  <label>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Contract Start</div>
                    <input type="date" value={editor.contractStart} onChange={(e) => updateEditor("contractStart", e.target.value)} className="crm-field" />
                  </label>
                  <label>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Contract End</div>
                    <input type="date" value={editor.contractEnd} onChange={(e) => updateEditor("contractEnd", e.target.value)} className="crm-field" />
                  </label>
                  <label>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Loyalty Balance</div>
                    <input value={editor.loyaltyPointsBalance} onChange={(e) => updateEditor("loyaltyPointsBalance", e.target.value)} className="crm-field" />
                  </label>
                </div>
                <label className="block">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Remarks</div>
                  <textarea value={editor.remarks} onChange={(e) => updateEditor("remarks", e.target.value)} rows={3} className="crm-textarea" />
                </label>
                <div className="grid gap-3 md:grid-cols-3">
                  <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-700">
                    <input type="checkbox" checked={editor.loyaltyEnabled} onChange={(e) => updateEditor("loyaltyEnabled", e.target.checked)} />
                    <span>Loyalty enabled</span>
                  </label>
                  <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-700">
                    <input type="checkbox" checked={editor.isPreferred} onChange={(e) => updateEditor("isPreferred", e.target.checked)} />
                    <span>Preferred customer</span>
                  </label>
                  <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-700">
                    <input type="checkbox" checked={editor.isActive} onChange={(e) => updateEditor("isActive", e.target.checked)} />
                    <span>Terms active</span>
                  </label>
                </div>
              </section>
            </div>

            {modalError ? (
              <div className="mt-6 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>{modalError}</span>
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void handleSaveCustomer()}
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                <SquarePen className="h-4 w-4" />
                <span>{isSaving ? "Saving..." : "Save customer and terms"}</span>
              </button>
              <button
                type="button"
                onClick={closeEditor}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                <span>Close</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
