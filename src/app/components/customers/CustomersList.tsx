import { AlertCircle, CirclePlus, Search, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "../../auth";
import { fetchCustomers, type CustomerResponse } from "./api";

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value ?? 0);
}

export function CustomersList() {
  const { token, user } = useAuth();
  const [customers, setCustomers] = useState<CustomerResponse[]>([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
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
              ERP customer master for the active organization. This view follows the phase 1
              contract around customer code, legal identity, GST, addresses, and contact ownership.
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
                  <div>{customer.state || "State not set"}{customer.stateCode ? ` · ${customer.stateCode}` : ""}</div>
                </div>

                <div className="mt-4 border-t border-slate-200 pt-4 text-sm text-slate-600">
                  <div>GSTIN: {customer.gstin || "Not set"}</div>
                  <div className="mt-1">Credit limit: {formatCurrency(customer.creditLimit)}</div>
                </div>
              </article>
            ))
          ) : (
            <div className="col-span-full py-10 text-sm text-slate-500">No customers found.</div>
          )}
        </div>
      </section>
    </div>
  );
}
