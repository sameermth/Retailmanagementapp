import { AlertCircle, FileBarChart, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "../../auth";
import {
  fetchTaxRegistrations,
  fetchTaxSummary,
  fetchThresholdStatus,
  type GstThresholdStatusResponse,
  type TaxRegistrationListResponse,
  type TaxSummaryDTO,
} from "./api";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function getMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export function GstReports() {
  const { token, user } = useAuth();
  const [taxSummary, setTaxSummary] = useState<TaxSummaryDTO | null>(null);
  const [thresholdStatus, setThresholdStatus] = useState<GstThresholdStatusResponse | null>(null);
  const [registrations, setRegistrations] = useState<TaxRegistrationListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadGstReports() {
      if (!token || !user?.organizationId) {
        return;
      }

      const { start, end } = getMonthRange();
      setIsLoading(true);
      setError("");

      try {
        const [summary, threshold, registrationList] = await Promise.all([
          fetchTaxSummary(token, start, end),
          fetchThresholdStatus(token, user.organizationId, end),
          fetchTaxRegistrations(token, user.organizationId, user.defaultBranchId ?? undefined, end),
        ]);

        setTaxSummary(summary);
        setThresholdStatus(threshold);
        setRegistrations(registrationList);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load GST reports.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadGstReports();
  }, [token, user?.defaultBranchId, user?.organizationId]);

  const effectiveRegistration = registrations?.effectiveRegistration;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Reports
        </div>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">GST Reports</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          This screen now uses the backend GST flow directly: dashboard tax summary for the filing
          period, plus ERP tax threshold and registration endpoints for compliance context.
        </p>
      </section>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            <ShieldCheck className="h-4 w-4" />
            Net Tax Payable
          </div>
          <div className="mt-4 text-2xl font-semibold text-slate-950">
            {isLoading ? "..." : formatCurrency(taxSummary?.netTaxPayable ?? 0)}
          </div>
          <div className="mt-2 text-sm text-slate-500">
            Output minus input and return reversals
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            <FileBarChart className="h-4 w-4" />
            Taxable Sales
          </div>
          <div className="mt-4 text-2xl font-semibold text-slate-950">
            {isLoading ? "..." : formatCurrency(taxSummary?.taxableSales ?? 0)}
          </div>
          <div className="mt-2 text-sm text-slate-500">
            Purchases: {formatCurrency(taxSummary?.taxablePurchases ?? 0)}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            <ShieldCheck className="h-4 w-4" />
            GST Threshold
          </div>
          <div className="mt-4 text-2xl font-semibold text-slate-950">
            {isLoading ? "..." : thresholdStatus?.alertLevel || "NA"}
          </div>
          <div className="mt-2 text-sm text-slate-500">
            {((thresholdStatus?.utilizationRatio ?? 0) * 100).toFixed(1)}% utilized
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            <FileBarChart className="h-4 w-4" />
            Effective Registration
          </div>
          <div className="mt-4 text-2xl font-semibold text-slate-950">
            {isLoading ? "..." : effectiveRegistration?.gstin || "Not mapped"}
          </div>
          <div className="mt-2 text-sm text-slate-500">
            Scope: {registrations?.effectiveRegistrationScope || "Not resolved"}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Compliance Summary</h2>
          <div className="mt-5 space-y-3 text-sm text-slate-600">
            <div className="rounded-2xl border border-slate-200 px-4 py-4">
              <div className="font-medium text-slate-900">Dashboard tax message</div>
              <div className="mt-2">{taxSummary?.gstMessage || "No GST message returned for this period."}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 px-4 py-4">
              <div className="font-medium text-slate-900">Threshold status</div>
              <div className="mt-2">{thresholdStatus?.message || "No threshold message returned."}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 px-4 py-4">
              <div className="font-medium text-slate-900">Branch resolution</div>
              <div className="mt-2">
                Requested branch: {registrations?.requestedBranchId ?? user?.defaultBranchId ?? "Not supplied"}
              </div>
            </div>
          </div>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Registration Coverage</h2>
          <div className="mt-5 space-y-3">
            {registrations?.registrations.length ? (
              registrations.registrations.map((registration) => (
                <div key={registration.id} className="rounded-2xl border border-slate-200 px-4 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-medium text-slate-900">
                        {registration.registrationName}
                      </div>
                      <div className="mt-1 text-sm text-slate-500">{registration.gstin}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {registration.registrationStateCode}
                        {registration.branchId ? ` · Branch ${registration.branchId}` : " · Organization scope"}
                      </div>
                    </div>
                    <div className="text-right text-xs text-slate-500">
                      <div>{registration.isActive ? "Active" : "Inactive"}</div>
                      <div className="mt-1">{registration.effectiveFrom}</div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-slate-500">
                No GST registrations were returned for the current organization.
              </div>
            )}
          </div>
        </article>
      </section>

      {registrations?.scopeWarnings.length ? (
        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-amber-900">Scope Warnings</h2>
          <div className="mt-4 space-y-2 text-sm text-amber-800">
            {registrations.scopeWarnings.map((warning) => (
              <div key={warning}>{warning}</div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
