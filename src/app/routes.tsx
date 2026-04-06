import { lazy, type ReactNode } from "react";
import { Navigate, createBrowserRouter } from "react-router";
import { useAuth } from "./auth";
import { AccessDeniedPage } from "./components/AccessDeniedPage";
import { Root } from "./components/Root";
import { LockedFeaturePage } from "./components/LockedFeaturePage";
import { SectionPlaceholder } from "./components/SectionPlaceholder";
import { featureForPath } from "./features";
import { findNavItem, navItems } from "./navigation";

const AppShellHome = lazy(() => import("./components/AppShellHome").then((module) => ({ default: module.AppShellHome })));
const BankAccounts = lazy(() => import("./components/banking/BankAccounts").then((module) => ({ default: module.BankAccounts })));
const BankingOverview = lazy(() => import("./components/banking/BankingOverview").then((module) => ({ default: module.BankingOverview })));
const BankReconciliation = lazy(() => import("./components/banking/BankReconciliation").then((module) => ({ default: module.BankReconciliation })));
const ChartOfAccounts = lazy(() => import("./components/accounting/ChartOfAccounts").then((module) => ({ default: module.ChartOfAccounts })));
const ImportStatement = lazy(() => import("./components/banking/ImportStatement").then((module) => ({ default: module.ImportStatement })));
const CustomersList = lazy(() => import("./components/customers/CustomersList").then((module) => ({ default: module.CustomersList })));
const DocumentsFiles = lazy(() => import("./components/documents/DocumentsFiles").then((module) => ({ default: module.DocumentsFiles })));
const NewCustomer = lazy(() => import("./components/customers/NewCustomer").then((module) => ({ default: module.NewCustomer })));
const ItemsList = lazy(() => import("./components/inventory/ItemsList").then((module) => ({ default: module.ItemsList })));
const NewItem = lazy(() => import("./components/inventory/NewItem").then((module) => ({ default: module.NewItem })));
const StockAdjustments = lazy(() => import("./components/inventory/StockAdjustments").then((module) => ({ default: module.StockAdjustments })));
const ScanAndTrack = lazy(() => import("./components/inventory/ScanAndTrack").then((module) => ({ default: module.ScanAndTrack })));
const StockTransfers = lazy(() => import("./components/inventory/StockTransfers").then((module) => ({ default: module.StockTransfers })));
const Warehouses = lazy(() => import("./components/inventory/Warehouses").then((module) => ({ default: module.Warehouses })));
const PurchaseOrders = lazy(() => import("./components/purchases/PurchaseOrders").then((module) => ({ default: module.PurchaseOrders })));
const Expenses = lazy(() => import("./components/purchases/Expenses").then((module) => ({ default: module.Expenses })));
const PurchaseReceipts = lazy(() => import("./components/purchases/PurchaseReceipts").then((module) => ({ default: module.PurchaseReceipts })));
const PurchaseReturns = lazy(() => import("./components/purchases/PurchaseReturns").then((module) => ({ default: module.PurchaseReturns })));
const SupplierPayments = lazy(() => import("./components/purchases/SupplierPayments").then((module) => ({ default: module.SupplierPayments })));
const BusinessReports = lazy(() => import("./components/reports/BusinessReports").then((module) => ({ default: module.BusinessReports })));
const GstReports = lazy(() => import("./components/reports/GstReports").then((module) => ({ default: module.GstReports })));
const EstimatesList = lazy(() => import("./components/sales/EstimatesList").then((module) => ({ default: module.EstimatesList })));
const InvoicesList = lazy(() => import("./components/sales/InvoicesList").then((module) => ({ default: module.InvoicesList })));
const NewEstimate = lazy(() => import("./components/sales/NewEstimate").then((module) => ({ default: module.NewEstimate })));
const NewInvoice = lazy(() => import("./components/sales/NewInvoice").then((module) => ({ default: module.NewInvoice })));
const PaymentsReceived = lazy(() => import("./components/sales/PaymentsReceived").then((module) => ({ default: module.PaymentsReceived })));
const PlatformAdminConsole = lazy(() => import("./components/platform-admin/PlatformAdminConsole").then((module) => ({ default: module.PlatformAdminConsole })));
const RecurringInvoices = lazy(() => import("./components/sales/RecurringInvoices").then((module) => ({ default: module.RecurringInvoices })));
const SalesOrders = lazy(() => import("./components/sales/SalesOrders").then((module) => ({ default: module.SalesOrders })));
const SalesReturns = lazy(() => import("./components/sales/SalesReturns").then((module) => ({ default: module.SalesReturns })));
const AutomationCenter = lazy(() => import("./components/system/AutomationCenter").then((module) => ({ default: module.AutomationCenter })));
const SystemSettings = lazy(() => import("./components/settings/SystemSettings").then((module) => ({ default: module.SystemSettings })));
const Vouchers = lazy(() => import("./components/accounting/Vouchers").then((module) => ({ default: module.Vouchers })));
const NewVendor = lazy(() => import("./components/vendors/NewVendor").then((module) => ({ default: module.NewVendor })));
const VendorsList = lazy(() => import("./components/vendors/VendorsList").then((module) => ({ default: module.VendorsList })));

function RouteGate({ path, children }: { path: string; children: ReactNode }) {
  const { capabilities, canAccess, hasAnyPermission } = useAuth();
  const navItem = findNavItem(path);
  const requiredFeature = navItem?.requiredFeature ?? featureForPath(path);
  const requiredPermissions = navItem?.requiredPermissions;

  if (!canAccess(requiredFeature ?? null)) {
    return <LockedFeaturePage feature={requiredFeature ?? null} capabilities={capabilities} />;
  }

  if (!hasAnyPermission(requiredPermissions)) {
    return <AccessDeniedPage title={navItem?.title} requiredPermissions={requiredPermissions} />;
  }

  return <>{children}</>;
}

function HomeIndexRedirect() {
  const { isPlatformAdmin } = useAuth();
  return <Navigate to={isPlatformAdmin ? "/platform-admin/overview" : "/dashboard"} replace />;
}

const implementedPaths = new Set([
  "/inventory/items",
  "/inventory/items/new",
  "/inventory/stock-adjustments",
  "/inventory/stock-transfers",
  "/inventory/warehouses",
  "/inventory/scan",
  "/reports/business",
  "/reports/gst",
  "/documents/files",
  "/system/automation",
  "/people/customers",
  "/people/customers/new",
  "/people/vendors",
  "/people/vendors/new",
  "/banking/overview",
  "/banking/accounts",
  "/banking/import-statement",
  "/banking/reconciliation",
  "/accountant/chart-of-accounts",
  "/accountant/manual-journals",
  "/system/settings",
  "/system/settings/branches",
  "/system/settings/employees",
  "/system/settings/roles",
  "/sales/quotes",
  "/sales/quotes/new",
  "/sales/orders",
  "/sales/invoices",
  "/sales/invoices/new",
  "/sales/receipts",
  "/sales/returns",
  "/sales/recurring-invoices",
  "/purchases/orders",
  "/purchases/suppliers",
  "/purchases/suppliers/new",
  "/purchases/receipts",
  "/purchases/expenses",
  "/purchases/supplier-payments",
  "/purchases/returns",
  "/platform-admin/overview",
  "/platform-admin/stores",
  "/platform-admin/subscriptions",
  "/platform-admin/plans",
  "/platform-admin/teams",
  "/platform-admin/support",
  "/platform-admin/feedback",
  "/platform-admin/operations",
]);

const placeholderChildren = navItems
  .filter((item) => item.path !== "/dashboard" && !implementedPaths.has(item.path))
  .map((item) => ({
    path: item.path.replace(/^\//, ""),
    element: (
      <RouteGate path={item.path}>
        <SectionPlaceholder
          eyebrow={item.eyebrow}
          title={item.title}
          description={item.description}
          nextSteps={[
            "Match the exact request and response contract from the backend module.",
            "Use session organization, branch, permission, and subscription context from login.",
            "Replace placeholder interactions with the live ERP flow for this module.",
          ]}
        />
      </RouteGate>
    ),
  }));

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, element: <HomeIndexRedirect /> },
      { path: "dashboard", element: <RouteGate path="/dashboard"><AppShellHome /></RouteGate> },
      { path: "banking/overview", element: <RouteGate path="/banking/overview"><BankingOverview /></RouteGate> },
      { path: "banking/accounts", element: <RouteGate path="/banking/accounts"><BankAccounts /></RouteGate> },
      { path: "banking/import-statement", element: <RouteGate path="/banking/import-statement"><ImportStatement /></RouteGate> },
      { path: "banking/reconciliation", element: <RouteGate path="/banking/reconciliation"><BankReconciliation /></RouteGate> },
      { path: "accountant/chart-of-accounts", element: <RouteGate path="/accountant/chart-of-accounts"><ChartOfAccounts /></RouteGate> },
      { path: "accountant/manual-journals", element: <RouteGate path="/accountant/manual-journals"><Vouchers /></RouteGate> },
      { path: "documents/files", element: <RouteGate path="/documents/files"><DocumentsFiles /></RouteGate> },
      { path: "people/customers", element: <RouteGate path="/people/customers"><CustomersList /></RouteGate> },
      { path: "people/customers/new", element: <RouteGate path="/people/customers/new"><NewCustomer /></RouteGate> },
      { path: "people/vendors", element: <Navigate to="/purchases/suppliers" replace /> },
      { path: "people/vendors/new", element: <Navigate to="/purchases/suppliers/new" replace /> },
      { path: "inventory/items", element: <RouteGate path="/inventory/items"><ItemsList /></RouteGate> },
      { path: "inventory/items/new", element: <RouteGate path="/inventory/items/new"><NewItem /></RouteGate> },
      { path: "inventory/stock-adjustments", element: <RouteGate path="/inventory/stock-adjustments"><StockAdjustments /></RouteGate> },
      { path: "inventory/stock-transfers", element: <RouteGate path="/inventory/stock-transfers"><StockTransfers /></RouteGate> },
      { path: "inventory/warehouses", element: <RouteGate path="/inventory/warehouses"><Warehouses /></RouteGate> },
      { path: "inventory/scan", element: <RouteGate path="/inventory/scan"><ScanAndTrack /></RouteGate> },
      { path: "purchases/suppliers", element: <RouteGate path="/purchases/suppliers"><VendorsList /></RouteGate> },
      { path: "purchases/suppliers/new", element: <RouteGate path="/purchases/suppliers/new"><NewVendor /></RouteGate> },
      { path: "purchases/orders", element: <RouteGate path="/purchases/orders"><PurchaseOrders /></RouteGate> },
      { path: "purchases/receipts", element: <RouteGate path="/purchases/receipts"><PurchaseReceipts /></RouteGate> },
      { path: "purchases/expenses", element: <RouteGate path="/purchases/expenses"><Expenses /></RouteGate> },
      { path: "purchases/supplier-payments", element: <RouteGate path="/purchases/supplier-payments"><SupplierPayments /></RouteGate> },
      { path: "purchases/returns", element: <RouteGate path="/purchases/returns"><PurchaseReturns /></RouteGate> },
      { path: "platform-admin/overview", element: <RouteGate path="/platform-admin/overview"><PlatformAdminConsole initialTab="overview" /></RouteGate> },
      { path: "platform-admin/stores", element: <RouteGate path="/platform-admin/stores"><PlatformAdminConsole initialTab="stores" /></RouteGate> },
      { path: "platform-admin/subscriptions", element: <RouteGate path="/platform-admin/subscriptions"><PlatformAdminConsole initialTab="subscriptions" /></RouteGate> },
      { path: "platform-admin/plans", element: <RouteGate path="/platform-admin/plans"><PlatformAdminConsole initialTab="plans" /></RouteGate> },
      { path: "platform-admin/teams", element: <RouteGate path="/platform-admin/teams"><PlatformAdminConsole initialTab="teams" /></RouteGate> },
      { path: "platform-admin/support", element: <RouteGate path="/platform-admin/support"><PlatformAdminConsole initialTab="support" /></RouteGate> },
      { path: "platform-admin/feedback", element: <RouteGate path="/platform-admin/feedback"><PlatformAdminConsole initialTab="feedback" /></RouteGate> },
      { path: "platform-admin/operations", element: <RouteGate path="/platform-admin/operations"><PlatformAdminConsole initialTab="operations" /></RouteGate> },
      { path: "reports/business", element: <RouteGate path="/reports/business"><BusinessReports /></RouteGate> },
      { path: "reports/gst", element: <RouteGate path="/reports/gst"><GstReports /></RouteGate> },
      { path: "system/automation", element: <RouteGate path="/system/automation"><AutomationCenter /></RouteGate> },
      { path: "system/settings", element: <RouteGate path="/system/settings"><SystemSettings initialTab="organization" /></RouteGate> },
      { path: "system/settings/branches", element: <RouteGate path="/system/settings/branches"><SystemSettings initialTab="branches" /></RouteGate> },
      { path: "system/settings/employees", element: <RouteGate path="/system/settings/employees"><SystemSettings initialTab="employees" /></RouteGate> },
      { path: "system/settings/roles", element: <RouteGate path="/system/settings/roles"><SystemSettings initialTab="roles" /></RouteGate> },
      { path: "sales/quotes", element: <RouteGate path="/sales/quotes"><EstimatesList /></RouteGate> },
      { path: "sales/quotes/new", element: <RouteGate path="/sales/quotes/new"><NewEstimate /></RouteGate> },
      { path: "sales/orders", element: <RouteGate path="/sales/orders"><SalesOrders /></RouteGate> },
      { path: "sales/invoices", element: <RouteGate path="/sales/invoices"><InvoicesList /></RouteGate> },
      { path: "sales/invoices/new", element: <RouteGate path="/sales/invoices/new"><NewInvoice /></RouteGate> },
      { path: "sales/receipts", element: <RouteGate path="/sales/receipts"><PaymentsReceived /></RouteGate> },
      { path: "sales/returns", element: <RouteGate path="/sales/returns"><SalesReturns /></RouteGate> },
      { path: "sales/recurring-invoices", element: <RouteGate path="/sales/recurring-invoices"><RecurringInvoices /></RouteGate> },
      { path: "sales/estimates", element: <Navigate to="/sales/quotes" replace /> },
      { path: "sales/estimates/new", element: <Navigate to="/sales/quotes/new" replace /> },
      { path: "sales/payments-received", element: <Navigate to="/sales/receipts" replace /> },
      { path: "sales/invoice-payments", element: <Navigate to="/sales/receipts" replace /> },
      { path: "purchases/bills", element: <Navigate to="/purchases/receipts" replace /> },
      { path: "purchases/bills/new", element: <Navigate to="/purchases/receipts" replace /> },
      ...placeholderChildren,
    ],
  },
]);
