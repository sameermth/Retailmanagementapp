import { AlertCircle, CirclePlus, Search, Settings2, SquarePen, UserCircle2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "../../auth";
import {
  fetchSupplierTerms,
  fetchVendors,
  updateVendor,
  upsertSupplierTerms,
  type SupplierRequestPayload,
  type SupplierResponse,
} from "./api";

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value ?? 0);
}

interface SupplierEditorState {
  name: string;
  tradeName: string;
  email: string;
  phone: string;
  gstin: string;
  state: string;
  stateCode: string;
  paymentTerms: string;
  status: string;
  creditLimit: string;
  creditDays: string;
  isPreferred: boolean;
  isActive: boolean;
  contractStart: string;
  contractEnd: string;
  orderViaEmail: boolean;
  orderViaWhatsapp: boolean;
  remarks: string;
}

function createEditorState(supplier: SupplierResponse): SupplierEditorState {
  return {
    name: supplier.name ?? "",
    tradeName: supplier.tradeName ?? "",
    email: supplier.email ?? "",
    phone: supplier.phone ?? "",
    gstin: supplier.gstin ?? "",
    state: supplier.state ?? "",
    stateCode: supplier.stateCode ?? "",
    paymentTerms: supplier.paymentTerms ?? "",
    status: supplier.status ?? "ACTIVE",
    creditLimit: "",
    creditDays: "",
    isPreferred: false,
    isActive: true,
    contractStart: "",
    contractEnd: "",
    orderViaEmail: false,
    orderViaWhatsapp: false,
    remarks: "",
  };
}

export function VendorsList() {
  const { token, user, hasAnyPermission } = useAuth();
  const [vendors, setVendors] = useState<SupplierResponse[]>([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedVendor, setSelectedVendor] = useState<SupplierResponse | null>(null);
  const [editor, setEditor] = useState<SupplierEditorState | null>(null);
  const [isLoadingTerms, setIsLoadingTerms] = useState(false);
  const [modalError, setModalError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const canManageSuppliers = hasAnyPermission(["purchase.create", "purchase.manage"]);

  async function loadVendors() {
    if (!token || !user?.organizationId) {
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetchVendors(token, user.organizationId);
      setVendors(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load suppliers.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadVendors();
  }, [token, user?.organizationId]);

  const filteredVendors = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return vendors.filter((vendor) => {
      if (!normalizedQuery) {
        return true;
      }

      return (
        vendor.name.toLowerCase().includes(normalizedQuery) ||
        vendor.supplierCode.toLowerCase().includes(normalizedQuery) ||
        vendor.tradeName?.toLowerCase().includes(normalizedQuery) ||
        vendor.email?.toLowerCase().includes(normalizedQuery) ||
        vendor.phone?.includes(normalizedQuery)
      );
    });
  }, [vendors, query]);

  const activeCount = filteredVendors.filter((vendor) => vendor.status === "ACTIVE").length;
  const platformLinkedCount = filteredVendors.filter((vendor) => vendor.isPlatformLinked).length;

  async function openEditor(vendor: SupplierResponse) {
    if (!token || !user?.organizationId) {
      return;
    }

    setSelectedVendor(vendor);
    setEditor(createEditorState(vendor));
    setModalError("");
    setIsLoadingTerms(true);

    try {
      const terms = await fetchSupplierTerms(token, user.organizationId, vendor.id).catch(() => null);
      setEditor((current) =>
        current
          ? {
              ...current,
              paymentTerms: terms?.paymentTerms ?? current.paymentTerms,
              creditLimit: terms?.creditLimit != null ? String(terms.creditLimit) : "",
              creditDays: terms?.creditDays != null ? String(terms.creditDays) : "",
              isPreferred: terms?.isPreferred ?? false,
              isActive: terms?.isActive ?? true,
              contractStart: terms?.contractStart ?? "",
              contractEnd: terms?.contractEnd ?? "",
              orderViaEmail: terms?.orderViaEmail ?? false,
              orderViaWhatsapp: terms?.orderViaWhatsapp ?? false,
              remarks: terms?.remarks ?? "",
            }
          : current,
      );
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Failed to load store supplier terms.");
    } finally {
      setIsLoadingTerms(false);
    }
  }

  function closeEditor() {
    setSelectedVendor(null);
    setEditor(null);
    setModalError("");
    setIsLoadingTerms(false);
    setIsSaving(false);
  }

  function updateEditor<Key extends keyof SupplierEditorState>(
    field: Key,
    value: SupplierEditorState[Key],
  ) {
    setEditor((current) => (current ? { ...current, [field]: value } : current));
    setModalError("");
  }

  async function handleSaveSupplier() {
    if (!token || !user?.organizationId || !selectedVendor || !editor) {
      return;
    }

    setIsSaving(true);
    setModalError("");

    const masterPayload: SupplierRequestPayload = {
      name: editor.name.trim(),
      tradeName: editor.tradeName.trim() || undefined,
      email: editor.email.trim() || undefined,
      phone: editor.phone.trim() || undefined,
      gstin: editor.gstin.trim() || undefined,
      state: editor.state.trim() || undefined,
      stateCode: editor.stateCode.trim() || undefined,
      paymentTerms: editor.paymentTerms.trim() || undefined,
      status: editor.status.trim() || undefined,
    };

    try {
      await updateVendor(token, user.organizationId, selectedVendor.id, masterPayload);
      await upsertSupplierTerms(token, user.organizationId, selectedVendor.id, {
        paymentTerms: editor.paymentTerms.trim() || undefined,
        creditLimit: editor.creditLimit.trim() ? Number(editor.creditLimit) : undefined,
        creditDays: editor.creditDays.trim() ? Number(editor.creditDays) : undefined,
        isPreferred: editor.isPreferred,
        isActive: editor.isActive,
        contractStart: editor.contractStart || undefined,
        contractEnd: editor.contractEnd || undefined,
        orderViaEmail: editor.orderViaEmail,
        orderViaWhatsapp: editor.orderViaWhatsapp,
        remarks: editor.remarks.trim() || undefined,
      });
      await loadVendors();
      closeEditor();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Failed to save supplier changes.");
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
              Purchases
            </div>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">Suppliers</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              ERP supplier master enriched with store-supplier terms like credit days, channel
              preferences, contract dates, and preferred supplier status.
            </p>
          </div>

          <Link
            to="/purchases/suppliers/new"
            className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            <CirclePlus className="h-4 w-4" />
            <span>New supplier</span>
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Suppliers</div>
          <div className="mt-3 text-2xl font-semibold text-slate-950">{filteredVendors.length}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Active</div>
          <div className="mt-3 text-2xl font-semibold text-slate-950">{activeCount}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Platform Linked</div>
          <div className="mt-3 text-2xl font-semibold text-slate-950">{platformLinkedCount}</div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by code, name, trade name, email, or phone"
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
            <div className="col-span-full py-10 text-sm text-slate-500">Loading suppliers...</div>
          ) : filteredVendors.length > 0 ? (
            filteredVendors.map((vendor) => (
              <article key={vendor.id} className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="rounded-lg bg-slate-100 p-2.5 text-slate-700">
                    <UserCircle2 className="h-4 w-4" />
                  </div>
                  <div
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      vendor.status === "ACTIVE"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {vendor.status || "UNKNOWN"}
                  </div>
                </div>

                <h2 className="mt-4 text-base font-semibold text-slate-950">{vendor.name}</h2>
                <div className="mt-1 text-sm text-slate-500">
                  {vendor.supplierCode} · {vendor.tradeName || vendor.legalName || "No trade name"}
                </div>

                <div className="mt-4 space-y-2 text-sm text-slate-600">
                  <div>{vendor.email || "No email"}</div>
                  <div>{vendor.phone || "No phone"}</div>
                  <div>
                    {vendor.state || "State not set"}
                    {vendor.stateCode ? ` · ${vendor.stateCode}` : ""}
                  </div>
                </div>

                <div className="mt-4 border-t border-slate-200 pt-4 text-sm text-slate-600">
                  <div>GSTIN: {vendor.gstin || "Not set"}</div>
                  <div className="mt-1">Payment terms: {vendor.paymentTerms || "Not set"}</div>
                </div>

                {canManageSuppliers ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void openEditor(vendor)}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                    >
                      <SquarePen className="h-3.5 w-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void openEditor(vendor)}
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
            <div className="col-span-full py-10 text-sm text-slate-500">No suppliers found.</div>
          )}
        </div>
      </section>

      {selectedVendor && editor ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-5">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Supplier Maintenance</div>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">{selectedVendor.name}</h2>
                <div className="mt-2 text-sm text-slate-600">
                  Update supplier master data and store-level commercial terms in one place.
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
                <div className="text-sm font-semibold text-slate-900">Supplier Master</div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label><div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Name</div><input value={editor.name} onChange={(e) => updateEditor("name", e.target.value)} className="crm-field" /></label>
                  <label><div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Trade Name</div><input value={editor.tradeName} onChange={(e) => updateEditor("tradeName", e.target.value)} className="crm-field" /></label>
                  <label><div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Payment Terms</div><input value={editor.paymentTerms} onChange={(e) => updateEditor("paymentTerms", e.target.value)} className="crm-field" /></label>
                  <label><div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Phone</div><input value={editor.phone} onChange={(e) => updateEditor("phone", e.target.value)} className="crm-field" /></label>
                  <label><div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Email</div><input value={editor.email} onChange={(e) => updateEditor("email", e.target.value)} className="crm-field" /></label>
                  <label><div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">GSTIN</div><input value={editor.gstin} onChange={(e) => updateEditor("gstin", e.target.value)} className="crm-field" /></label>
                  <label><div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">State Code</div><input value={editor.stateCode} onChange={(e) => updateEditor("stateCode", e.target.value)} className="crm-field" /></label>
                </div>
              </section>

              <section className="space-y-4 rounded-2xl border border-slate-200 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-slate-900">Store Terms</div>
                  {isLoadingTerms ? <div className="text-xs text-slate-500">Loading terms...</div> : null}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label><div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Credit Limit</div><input value={editor.creditLimit} onChange={(e) => updateEditor("creditLimit", e.target.value)} className="crm-field" /></label>
                  <label><div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Credit Days</div><input value={editor.creditDays} onChange={(e) => updateEditor("creditDays", e.target.value)} className="crm-field" /></label>
                  <label><div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Contract Start</div><input type="date" value={editor.contractStart} onChange={(e) => updateEditor("contractStart", e.target.value)} className="crm-field" /></label>
                  <label><div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Contract End</div><input type="date" value={editor.contractEnd} onChange={(e) => updateEditor("contractEnd", e.target.value)} className="crm-field" /></label>
                </div>
                <label className="block">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Remarks</div>
                  <textarea value={editor.remarks} onChange={(e) => updateEditor("remarks", e.target.value)} rows={3} className="crm-textarea" />
                </label>
                <div className="grid gap-3 md:grid-cols-4">
                  <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-700"><input type="checkbox" checked={editor.isPreferred} onChange={(e) => updateEditor("isPreferred", e.target.checked)} /><span>Preferred</span></label>
                  <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-700"><input type="checkbox" checked={editor.isActive} onChange={(e) => updateEditor("isActive", e.target.checked)} /><span>Terms active</span></label>
                  <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-700"><input type="checkbox" checked={editor.orderViaEmail} onChange={(e) => updateEditor("orderViaEmail", e.target.checked)} /><span>Order via email</span></label>
                  <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-700"><input type="checkbox" checked={editor.orderViaWhatsapp} onChange={(e) => updateEditor("orderViaWhatsapp", e.target.checked)} /><span>Order via WhatsApp</span></label>
                </div>
                <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  Store supplier credit: {formatCurrency(editor.creditLimit.trim() ? Number(editor.creditLimit) : 0)}
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
                onClick={() => void handleSaveSupplier()}
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                <SquarePen className="h-4 w-4" />
                <span>{isSaving ? "Saving..." : "Save supplier and terms"}</span>
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
