import {
  Activity,
  ArrowRight,
  Boxes,
  CircleAlert,
  ClipboardList,
  IndianRupee,
  PackageSearch,
  ReceiptText,
  ShoppingCart,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from "../auth";
import {
  fetchAgingDashboard,
  fetchDashboardSummary,
  fetchDueSummary,
  fetchLowStockAlerts,
  fetchRecentActivities,
  fetchStockSummary,
  fetchTopProducts,
  type AgingDashboardDTO,
  type DashboardSummaryResponse,
  type DueSummaryDTO,
  type LowStockAlertDTO,
  type RecentActivityDTO,
  type SalesSummaryDTO,
  type StockSummaryDTO,
  type TopProductDTO,
} from "./reports/api";

function formatCurrency(value?: number | null) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value ?? 0);
}

function formatCompactCurrency(value?: number | null) {
  return new Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value ?? 0);
}

function formatCount(value?: number | null) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

function getSalesSeries(summary: DashboardSummaryResponse | null) {
  const entries: Array<{ label: string; amount: number; transactions: number }> = [];

  function pushPoint(label: string, value: SalesSummaryDTO | null | undefined) {
    entries.push({
      label,
      amount: value?.totalAmount ?? 0,
      transactions: value?.totalTransactions ?? 0,
    });
  }

  pushPoint("Today", summary?.todaySales);
  pushPoint("Week", summary?.weeklySales);
  pushPoint("Month", summary?.monthlySales);

  return entries;
}

export function AppShellHome() {
  const { token, user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);
  const [dueSummary, setDueSummary] = useState<DueSummaryDTO | null>(null);
  const [aging, setAging] = useState<AgingDashboardDTO | null>(null);
  const [stockSummary, setStockSummary] = useState<StockSummaryDTO | null>(null);
  const [recentActivities, setRecentActivities] = useState<RecentActivityDTO[]>([]);
  const [topProducts, setTopProducts] = useState<TopProductDTO[]>([]);
  const [lowStockAlerts, setLowStockAlerts] = useState<LowStockAlertDTO[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadSummary() {
      if (!token) {
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const [dashboardSummary, dues, topSellingProducts, lowStock, agingSnapshot, stockSnapshot, activities] = await Promise.all([
          fetchDashboardSummary(token),
          fetchDueSummary(token),
          fetchTopProducts(token, 5),
          fetchLowStockAlerts(token),
          fetchAgingDashboard(token),
          fetchStockSummary(token, 5),
          fetchRecentActivities(token, 5),
        ]);

        setSummary(dashboardSummary);
        setDueSummary(dues);
        setTopProducts(topSellingProducts);
        setLowStockAlerts(lowStock.slice(0, 5));
        setAging(agingSnapshot);
        setStockSummary(stockSnapshot);
        setRecentActivities(activities);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard summary.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadSummary();
  }, [token]);

  const quickLinks = [
    {
      title: "Create Invoice",
      description: "Sales invoice flow for the current branch",
      path: "/sales/invoices/new",
      icon: ReceiptText,
    },
    {
      title: "New Store Product",
      description: "Create a store item and optionally seed stock",
      path: "/inventory/items/new",
      icon: Boxes,
    },
    {
      title: "New Customer",
      description: "Add an ERP customer profile with terms later",
      path: "/people/customers/new",
      icon: Users,
    },
  ];

  const salesTrend = useMemo(() => getSalesSeries(summary), [summary]);

  const paymentMix = useMemo(() => {
    const current = summary?.monthlySales;
    return [
      { name: "Cash", value: current?.cashAmount ?? 0, fill: "#0f172a" },
      { name: "Card", value: current?.cardAmount ?? 0, fill: "#475569" },
      { name: "UPI", value: current?.upiAmount ?? 0, fill: "#94a3b8" },
      { name: "Credit", value: current?.creditAmount ?? 0, fill: "#cbd5e1" },
    ].filter((entry) => entry.value > 0);
  }, [summary]);

  const topProductChart = useMemo(
    () =>
      topProducts.slice(0, 5).map((product) => ({
        name: product.productName.length > 16 ? `${product.productName.slice(0, 16)}…` : product.productName,
        revenue: product.totalRevenue,
      })),
    [topProducts],
  );

  const agingChart = useMemo(
    () => [
      {
        bucket: "Current",
        customers: aging?.customers.current ?? 0,
        suppliers: aging?.suppliers.current ?? 0,
      },
      {
        bucket: "1-30",
        customers: aging?.customers.bucket1To30 ?? 0,
        suppliers: aging?.suppliers.bucket1To30 ?? 0,
      },
      {
        bucket: "31-60",
        customers: aging?.customers.bucket31To60 ?? 0,
        suppliers: aging?.suppliers.bucket31To60 ?? 0,
      },
      {
        bucket: "61-90",
        customers: aging?.customers.bucket61To90 ?? 0,
        suppliers: aging?.suppliers.bucket61To90 ?? 0,
      },
      {
        bucket: "90+",
        customers: aging?.customers.bucket90Plus ?? 0,
        suppliers: aging?.suppliers.bucket90Plus ?? 0,
      },
    ],
    [aging],
  );

  const stockMix = useMemo(
    () => [
      { name: "Available", value: stockSummary?.availableQuantity ?? 0, fill: "#0f172a" },
      { name: "Reserved", value: stockSummary?.reservedQuantity ?? 0, fill: "#64748b" },
      { name: "Out of Stock", value: summary?.outOfStockCount ?? 0, fill: "#cbd5e1" },
    ].filter((entry) => entry.value > 0),
    [stockSummary, summary],
  );

  const activitySeries = useMemo(
    () =>
      recentActivities.map((activity, index) => ({
        slot: activity.reference || `A${index + 1}`,
        amount: activity.amount ?? 0,
      })),
    [recentActivities],
  );

  const dashboardCards = [
    {
      title: "Today Sales",
      value: isLoading ? "..." : formatCurrency(summary?.todaySales?.totalAmount),
      hint: `${summary?.todaySales?.totalTransactions ?? 0} transactions`,
      path: "/sales/invoices",
      icon: IndianRupee,
    },
    {
      title: "Monthly Sales",
      value: isLoading ? "..." : formatCurrency(summary?.monthlySales?.totalAmount),
      hint: `${summary?.monthlySales?.totalTransactions ?? 0} transactions`,
      path: "/sales/invoices",
      icon: ReceiptText,
    },
    {
      title: "Catalog",
      value: formatCount(summary?.totalProducts),
      hint: `${summary?.lowStockCount ?? 0} low stock, ${summary?.outOfStockCount ?? 0} out of stock`,
      path: "/inventory/items",
      icon: PackageSearch,
    },
    {
      title: "Receivables",
      value: formatCurrency(dueSummary?.totalDueAmount ?? summary?.totalDueAmount),
      hint: `${dueSummary?.overdueCount ?? summary?.overdueCount ?? 0} overdue accounts`,
      path: "/sales/receipts",
      icon: ClipboardList,
    },
    {
      title: "Customers",
      value: formatCount(summary?.totalCustomers),
      hint: `${summary?.newCustomersToday ?? 0} added today`,
      path: "/people/customers",
      icon: Users,
    },
    {
      title: "Pending Orders",
      value: formatCount(summary?.pendingOrders),
      hint: `${summary?.completedOrdersToday ?? 0} completed today`,
      path: "/sales/orders",
      icon: ShoppingCart,
    },
  ];

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white px-6 py-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Dashboard
            </div>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">
              {user?.organizationName || "ERP Overview"}
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Live operations overview with direct drill-down into invoices, receipts, catalog, customers, and order flow.
            </p>
          </div>
          <div className="text-sm text-slate-500">
            Signed in as <span className="font-medium text-slate-800">{user?.username}</span>
          </div>
        </div>
      </section>

      {error && (
        <section className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <CircleAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </section>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {dashboardCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.title}
              to={card.path}
              className="group rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:bg-slate-50"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {card.title}
                  </div>
                  <div className="mt-3 text-2xl font-semibold text-slate-950">{card.value}</div>
                  <div className="mt-1 text-sm text-slate-500">{card.hint}</div>
                </div>
                <div className="rounded-xl bg-slate-100 p-2 text-slate-700 transition group-hover:bg-slate-900 group-hover:text-white">
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                <span>Open</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </Link>
          );
        })}
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.75fr)]">
        <div className="grid gap-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Activity className="h-4 w-4" />
              <span>Sales Trend</span>
            </div>
            <div className="mt-1 text-sm text-slate-500">
              Today, week, and month sales from the dashboard summary.
            </div>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={salesTrend}>
                  <defs>
                    <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0f172a" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#0f172a" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => formatCompactCurrency(value)} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Area type="monotone" dataKey="amount" stroke="#0f172a" strokeWidth={2.5} fill="url(#salesFill)" />
                    <Line type="monotone" dataKey="transactions" stroke="#64748b" strokeWidth={2} dot={{ r: 3 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <ReceiptText className="h-4 w-4" />
                <span>Monthly Payment Mix</span>
              </div>
              <div className="mt-1 text-sm text-slate-500">
                Cash, card, UPI, and credit split for this month.
              </div>
              <div className="mt-4 h-64">
                {paymentMix.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentMix}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={55}
                        outerRadius={82}
                        paddingAngle={3}
                      >
                        {paymentMix.map((entry) => (
                          <Cell key={entry.name} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Legend />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-slate-500">
                    No payment mix data yet.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Boxes className="h-4 w-4" />
                <span>Top Products</span>
              </div>
              <div className="mt-1 text-sm text-slate-500">
                Best selling products by revenue.
              </div>
              <div className="mt-4 h-64">
                {topProductChart.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topProductChart} layout="vertical" margin={{ left: 8, right: 8 }}>
                      <CartesianGrid stroke="#e2e8f0" horizontal={false} />
                      <XAxis type="number" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => formatCompactCurrency(value)} />
                      <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} width={90} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Bar dataKey="revenue" fill="#0f172a" radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-slate-500">
                    No top product data yet.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <ClipboardList className="h-4 w-4" />
                <span>Receivables Aging</span>
              </div>
              <div className="mt-1 text-sm text-slate-500">
                Compare customer and supplier outstanding buckets.
              </div>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={agingChart}>
                    <CartesianGrid stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="bucket" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => formatCompactCurrency(value)} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="customers" fill="#0f172a" radius={[6, 6, 0, 0]} />
                    <Line type="monotone" dataKey="suppliers" stroke="#94a3b8" strokeWidth={2.5} dot={{ r: 3 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <PackageSearch className="h-4 w-4" />
                <span>Inventory Position</span>
              </div>
              <div className="mt-1 text-sm text-slate-500">
                Available vs reserved stock plus out-of-stock pressure.
              </div>
              <div className="mt-4 h-64">
                {stockMix.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stockMix}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={52}
                        outerRadius={84}
                        paddingAngle={3}
                      >
                        {stockMix.map((entry) => (
                          <Cell key={entry.name} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Legend />
                      <Tooltip formatter={(value: number) => formatCount(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-slate-500">
                    No stock distribution data yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="text-sm font-semibold text-slate-900">Quick Actions</div>
            <div className="mt-4 space-y-3">
              {quickLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-4 transition hover:bg-slate-50"
                  >
                    <div className="rounded-lg bg-slate-100 p-2 text-slate-700">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-slate-900">{item.title}</div>
                      <div className="mt-1 text-sm text-slate-500">{item.description}</div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-400" />
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="text-sm font-semibold text-slate-900">Low Stock Alerts</div>
            <div className="mt-4 space-y-3">
              {lowStockAlerts.length > 0 ? (
                lowStockAlerts.map((item) => (
                  <Link
                    key={item.productId}
                    to="/inventory/items"
                    className="block rounded-xl border border-slate-200 px-4 py-4 transition hover:bg-slate-50"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm font-medium text-slate-900">{item.productName}</div>
                        <div className="mt-1 text-sm text-slate-500">
                          {item.sku || "No SKU"}
                          {item.category ? ` · ${item.category}` : ""}
                        </div>
                      </div>
                      <div className="text-right text-xs text-slate-500">
                        <div>{item.status}</div>
                        <div className="mt-1 font-medium text-slate-900">{formatCount(item.currentStock)}</div>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="text-sm text-slate-500">No low stock alerts right now.</div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="text-sm font-semibold text-slate-900">Recent Activity Value</div>
            <div className="mt-1 text-sm text-slate-500">
              Quick value view of the latest financial or document activity.
            </div>
            <div className="mt-4 h-52">
              {activitySeries.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={activitySeries}>
                    <CartesianGrid stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="slot" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(value) => formatCompactCurrency(value)} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="amount" fill="#334155" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-500">
                  No recent activity values yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
