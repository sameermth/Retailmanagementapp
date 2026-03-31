import { AlertCircle, CirclePlus, Search, UserCircle2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "../../auth";
import { fetchVendors, type SupplierResponse } from "./api";

export function VendorsList() {
  const { token, user } = useAuth();
  const [vendors, setVendors] = useState<SupplierResponse[]>([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
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

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              People
            </div>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">Suppliers</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              ERP supplier master for the active organization. This view reflects phase 1 fields:
              supplier code, legal and trade identity, GST, contact ownership, and payment terms.
            </p>
          </div>

          <Link
            to="/people/vendors/new"
            className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            <CirclePlus className="h-4 w-4" />
            <span>New supplier</span>
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Suppliers
          </div>
          <div className="mt-3 text-2xl font-semibold text-slate-950">{filteredVendors.length}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Active
          </div>
          <div className="mt-3 text-2xl font-semibold text-slate-950">{activeCount}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Platform Linked
          </div>
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
                  <div>{vendor.state || "State not set"}{vendor.stateCode ? ` · ${vendor.stateCode}` : ""}</div>
                </div>

                <div className="mt-4 border-t border-slate-200 pt-4 text-sm text-slate-600">
                  <div>GSTIN: {vendor.gstin || "Not set"}</div>
                  <div className="mt-1">Payment terms: {vendor.paymentTerms || "Not set"}</div>
                </div>
              </article>
            ))
          ) : (
            <div className="col-span-full py-10 text-sm text-slate-500">No suppliers found.</div>
          )}
        </div>
      </section>
    </div>
  );
}
