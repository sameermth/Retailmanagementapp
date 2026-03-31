import {
  Activity,
  ArrowRight,
  Boxes,
  CircleAlert,
  ReceiptText,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "../auth";
import { apiRequest } from "../lib/api";

interface DashboardSummary {
  todaySales?: { totalAmount?: number | null; totalTransactions?: number | null } | null;
  weeklySales?: { totalAmount?: number | null; totalTransactions?: number | null } | null;
  monthlySales?: { totalAmount?: number | null; totalTransactions?: number | null } | null;
  totalProducts?: number | null;
  lowStockCount?: number | null;
  outOfStockCount?: number | null;
  totalCustomers?: number | null;
  newCustomersToday?: number | null;
  totalDueAmount?: number | null;
  overdueCount?: number | null;
  pendingOrders?: number | null;
  completedOrdersToday?: number | null;
}

function formatCurrency(value?: number | null) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value ?? 0);
}

export function AppShellHome() {
  const { token, user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
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
        const response = await apiRequest<DashboardSummary>("/api/dashboard/summary", {
          method: "GET",
          token,
        });
        setSummary(response);
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
              Phase 1 workspace aligned to the backend summary, sales, catalog, and party flows.
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

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Today Sales
          </div>
          <div className="mt-3 text-2xl font-semibold text-slate-950">
            {isLoading ? "..." : formatCurrency(summary?.todaySales?.totalAmount)}
          </div>
          <div className="mt-1 text-sm text-slate-500">
            {summary?.todaySales?.totalTransactions ?? 0} transactions
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Monthly Sales
          </div>
          <div className="mt-3 text-2xl font-semibold text-slate-950">
            {isLoading ? "..." : formatCurrency(summary?.monthlySales?.totalAmount)}
          </div>
          <div className="mt-1 text-sm text-slate-500">
            {summary?.monthlySales?.totalTransactions ?? 0} transactions
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Catalog
          </div>
          <div className="mt-3 text-2xl font-semibold text-slate-950">
            {summary?.totalProducts ?? 0}
          </div>
          <div className="mt-1 text-sm text-slate-500">
            {summary?.lowStockCount ?? 0} low stock, {summary?.outOfStockCount ?? 0} out of stock
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Receivables
          </div>
          <div className="mt-3 text-2xl font-semibold text-slate-950">
            {formatCurrency(summary?.totalDueAmount)}
          </div>
          <div className="mt-1 text-sm text-slate-500">
            {summary?.overdueCount ?? 0} overdue entries
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Activity className="h-4 w-4" />
            <span>Operational Snapshot</span>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Customers</div>
              <div className="mt-2 text-xl font-semibold text-slate-950">
                {summary?.totalCustomers ?? 0}
              </div>
              <div className="mt-1 text-sm text-slate-500">
                {summary?.newCustomersToday ?? 0} added today
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Orders</div>
              <div className="mt-2 text-xl font-semibold text-slate-950">
                {summary?.pendingOrders ?? 0}
              </div>
              <div className="mt-1 text-sm text-slate-500">
                {summary?.completedOrdersToday ?? 0} completed today
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 sm:col-span-2">
              <div className="text-xs uppercase tracking-[0.16em] text-slate-500">
                Phase 1 Notes
              </div>
              <div className="mt-2 text-sm leading-6 text-slate-600">
                The UI is now biased toward what phase 1 exposes cleanly in the backend:
                ERP customers, suppliers, store products, inventory balances, invoices,
                purchase documents, and payment capture.
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6">
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
      </section>
    </div>
  );
}
