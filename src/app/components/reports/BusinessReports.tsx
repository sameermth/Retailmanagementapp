import {
  Activity,
  BarChart3,
  ClipboardList,
  IndianRupee,
  PackageSearch,
  TrendingUp,
  TriangleAlert,
  Users,
  Warehouse,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth";
import {
  fetchAgingDashboard,
  fetchDashboardSummary,
  fetchDueSummary,
  fetchLowStockAlerts,
  fetchProfitabilitySummary,
  fetchRecentActivities,
  fetchStockSummary,
  fetchTopProducts,
  fetchUpcomingDues,
  type AgingDashboardDTO,
  type DashboardSummaryResponse,
  type DueSummaryDTO,
  type LowStockAlertDTO,
  type ProfitabilitySummaryDTO,
  type RecentActivityDTO,
  type StockSummaryDTO,
  type TopProductDTO,
  type UpcomingDueDTO,
} from "./api";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDateLabel(value: string) {
  return new Date(value).toLocaleDateString("en-IN");
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

export function BusinessReports() {
  const { token } = useAuth();
  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);
  const [profitability, setProfitability] = useState<ProfitabilitySummaryDTO | null>(null);
  const [stockSummary, setStockSummary] = useState<StockSummaryDTO | null>(null);
  const [recentActivities, setRecentActivities] = useState<RecentActivityDTO[]>([]);
  const [topProducts, setTopProducts] = useState<TopProductDTO[]>([]);
  const [lowStockAlerts, setLowStockAlerts] = useState<LowStockAlertDTO[]>([]);
  const [dueSummary, setDueSummary] = useState<DueSummaryDTO | null>(null);
  const [upcomingDues, setUpcomingDues] = useState<UpcomingDueDTO[]>([]);
  const [aging, setAging] = useState<AgingDashboardDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadReports() {
      if (!token) {
        return;
      }

      const { start, end } = getMonthRange();
      setIsLoading(true);
      setError("");

      try {
        const [
          dashboardSummary,
          profitabilitySummary,
          stockSnapshot,
          activities,
          topSellingProducts,
          lowStockList,
          dueSnapshot,
          dueSoon,
          agingSnapshot,
        ] =
          await Promise.all([
            fetchDashboardSummary(token),
            fetchProfitabilitySummary(token, start, end, 5),
            fetchStockSummary(token, 5),
            fetchRecentActivities(token, 6),
            fetchTopProducts(token, 5),
            fetchLowStockAlerts(token),
            fetchDueSummary(token),
            fetchUpcomingDues(token, 7),
            fetchAgingDashboard(token),
          ]);

        setSummary(dashboardSummary);
        setProfitability(profitabilitySummary);
        setStockSummary(stockSnapshot);
        setRecentActivities(activities);
        setTopProducts(topSellingProducts);
        setLowStockAlerts(lowStockList);
        setDueSummary(dueSnapshot);
        setUpcomingDues(dueSoon);
        setAging(agingSnapshot);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load business reports.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadReports();
  }, [token]);

  const monthlySales = summary?.monthlySales;
  const marginHint = useMemo(() => {
    if (!profitability || profitability.revenue <= 0) {
      return "No profitability data yet";
    }

    return `${profitability.marginPercent.toFixed(1)}% gross margin`;
  }, [profitability]);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Reports
        </div>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">Business Reports</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          This screen now follows the backend dashboard analytics flow, so the numbers come from
          the current summary, profitability, stock snapshot, and activity endpoints instead of the
          removed legacy reporting stats APIs.
        </p>
      </section>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            <IndianRupee className="h-4 w-4" />
            Monthly Sales
          </div>
          <div className="mt-4 text-3xl font-semibold text-slate-950">
            {isLoading ? "..." : formatCurrency(monthlySales?.totalAmount ?? 0)}
          </div>
          <div className="mt-2 text-sm text-slate-500">
            {monthlySales?.totalTransactions ?? 0} transactions this month
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            <BarChart3 className="h-4 w-4" />
            Profitability
          </div>
          <div className="mt-4 text-3xl font-semibold text-slate-950">
            {isLoading ? "..." : formatCurrency(profitability?.grossProfit ?? 0)}
          </div>
          <div className="mt-2 text-sm text-slate-500">{marginHint}</div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            <ClipboardList className="h-4 w-4" />
            Customer Dues
          </div>
          <div className="mt-4 text-3xl font-semibold text-slate-950">
            {isLoading ? "..." : formatCurrency(dueSummary?.totalDueAmount ?? summary?.totalDueAmount ?? 0)}
          </div>
          <div className="mt-2 text-sm text-slate-500">
            {dueSummary?.overdueCount ?? summary?.overdueCount ?? 0} overdue accounts
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            <Warehouse className="h-4 w-4" />
            Inventory Snapshot
          </div>
          <div className="mt-4 text-3xl font-semibold text-slate-950">
            {isLoading ? "..." : stockSummary?.lowStockCount ?? 0}
          </div>
          <div className="mt-2 text-sm text-slate-500">
            {stockSummary?.outOfStockCount ?? 0} out of stock
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            <PackageSearch className="h-4 w-4" />
            Top Profitability Products
          </div>
          <div className="mt-5 space-y-3">
            {profitability?.topProducts.length ? (
              profitability.topProducts.map((product) => (
                <div key={product.productId} className="rounded-2xl border border-slate-200 px-4 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-medium text-slate-900">{product.productName}</div>
                      <div className="mt-1 text-sm text-slate-500">{product.sku || "No SKU"}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-slate-900">
                        {formatCurrency(product.grossProfit)}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {product.marginPercent.toFixed(1)}% margin
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-slate-500">No profitability products found for this period.</div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            <TrendingUp className="h-4 w-4" />
            Top Selling Products
          </div>
          <div className="mt-5 space-y-3">
            {topProducts.length > 0 ? (
              topProducts.map((product) => (
                <div key={product.productId} className="rounded-2xl border border-slate-200 px-4 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-medium text-slate-900">{product.productName}</div>
                      <div className="mt-1 text-sm text-slate-500">
                        {product.sku || "No SKU"}
                        {product.category ? ` · ${product.category}` : ""}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-slate-900">
                        {formatCurrency(product.totalRevenue)}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {formatNumber(product.quantitySold)} sold · Avg {formatCurrency(product.averagePrice)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-slate-500">No top products returned by the dashboard yet.</div>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            <Activity className="h-4 w-4" />
            Recent Activities
          </div>
          <div className="mt-5 space-y-3">
            {recentActivities.length > 0 ? (
              recentActivities.map((activity) => (
                <div key={activity.id} className="rounded-2xl border border-slate-200 px-4 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-medium text-slate-900">{activity.description}</div>
                      <div className="mt-1 text-sm text-slate-500">
                        {activity.reference || activity.type} · {formatDateLabel(activity.timestamp)}
                      </div>
                    </div>
                    <div className="text-right text-xs text-slate-500">
                      <div>{activity.user || "System"}</div>
                      {typeof activity.amount === "number" ? (
                        <div className="mt-1 text-sm font-semibold text-slate-900">
                          {formatCurrency(activity.amount)}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-slate-500">No recent activity returned by the dashboard yet.</div>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            <TriangleAlert className="h-4 w-4" />
            Low Stock Alerts
          </div>
          <div className="mt-5 space-y-3">
            {lowStockAlerts.length > 0 ? (
              lowStockAlerts.map((product) => (
                <div key={product.productId} className="rounded-2xl border border-slate-200 px-4 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-medium text-slate-900">{product.productName}</div>
                      <div className="mt-1 text-sm text-slate-500">
                        {product.sku || "No SKU"}
                        {product.category ? ` · ${product.category}` : ""}
                      </div>
                    </div>
                    <div className="text-right text-xs text-slate-500">
                      <div>{product.status}</div>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-3">
                    <div>Current: <span className="font-medium text-slate-900">{formatNumber(product.currentStock)}</span></div>
                    <div>Reorder: <span className="font-medium text-slate-900">{formatNumber(product.reorderLevel)}</span></div>
                    <div>Recommend: <span className="font-medium text-slate-900">{formatNumber(product.recommendedOrder)}</span></div>
                  </div>
                </div>
              ))
            ) : stockSummary?.lowStockProducts.length ? (
              stockSummary.lowStockProducts.map((product) => (
                <div key={product.productId} className="rounded-2xl border border-slate-200 px-4 py-4">
                  <div className="text-sm font-medium text-slate-900">{product.productName}</div>
                  <div className="mt-1 text-sm text-slate-500">{product.sku || "No SKU"}</div>
                  <div className="mt-3 text-sm text-slate-600">
                    Available: <span className="font-medium text-slate-900">{formatNumber(product.availableQuantity)}</span>
                  </div>
                  <div className="mt-1 text-sm text-slate-600">
                    Inventory value: <span className="font-medium text-slate-900">{formatCurrency(product.inventoryValue)}</span>
                  </div>
                  <div className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                    {product.stockStatus}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-slate-500">No low-stock products returned in the current snapshot.</div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            <Users className="h-4 w-4" />
            Dues And Aging
          </div>
          <div className="mt-5 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Due This Week</div>
                <div className="mt-2 text-lg font-semibold text-slate-950">
                  {formatCurrency(dueSummary?.dueThisWeek ?? 0)}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Due Next Week</div>
                <div className="mt-2 text-lg font-semibold text-slate-950">
                  {formatCurrency(dueSummary?.dueNextWeek ?? 0)}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 px-4 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Upcoming Dues</div>
              <div className="mt-3 space-y-3">
                {upcomingDues.length > 0 ? (
                  upcomingDues.map((due) => (
                    <div key={`${due.customerId}-${due.dueDate}`} className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm font-medium text-slate-900">{due.customerName}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          Due {formatDateLabel(due.dueDate)} · {due.status}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-slate-900">{formatCurrency(due.dueAmount)}</div>
                        <div className="mt-1 text-xs text-slate-500">{due.daysRemaining} days</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-slate-500">No upcoming dues returned for this window.</div>
                )}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Customer Aging</div>
                <div className="mt-3 space-y-1 text-sm text-slate-600">
                  <div>Current: <span className="font-medium text-slate-900">{formatCurrency(aging?.customers.current ?? 0)}</span></div>
                  <div>1-30: <span className="font-medium text-slate-900">{formatCurrency(aging?.customers.bucket1To30 ?? 0)}</span></div>
                  <div>31-60: <span className="font-medium text-slate-900">{formatCurrency(aging?.customers.bucket31To60 ?? 0)}</span></div>
                  <div>61-90: <span className="font-medium text-slate-900">{formatCurrency(aging?.customers.bucket61To90 ?? 0)}</span></div>
                  <div>90+: <span className="font-medium text-slate-900">{formatCurrency(aging?.customers.bucket90Plus ?? 0)}</span></div>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Supplier Aging</div>
                <div className="mt-3 space-y-1 text-sm text-slate-600">
                  <div>Current: <span className="font-medium text-slate-900">{formatCurrency(aging?.suppliers.current ?? 0)}</span></div>
                  <div>1-30: <span className="font-medium text-slate-900">{formatCurrency(aging?.suppliers.bucket1To30 ?? 0)}</span></div>
                  <div>31-60: <span className="font-medium text-slate-900">{formatCurrency(aging?.suppliers.bucket31To60 ?? 0)}</span></div>
                  <div>61-90: <span className="font-medium text-slate-900">{formatCurrency(aging?.suppliers.bucket61To90 ?? 0)}</span></div>
                  <div>90+: <span className="font-medium text-slate-900">{formatCurrency(aging?.suppliers.bucket90Plus ?? 0)}</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
