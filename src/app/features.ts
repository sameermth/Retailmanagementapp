export type FeatureKey =
  | "dashboard.view"
  | "sales.pos"
  | "sales.quotes"
  | "sales.invoices"
  | "sales.orders"
  | "sales.receipts"
  | "sales.returns"
  | "sales.recurring-invoices"
  | "purchases.expenses"
  | "purchases.receipts"
  | "purchases.orders"
  | "purchases.payments"
  | "purchases.returns"
  | "inventory.items"
  | "inventory.categories"
  | "inventory.price-lists"
  | "inventory.warehouses"
  | "inventory.stock-adjustments"
  | "inventory.stock-transfers"
  | "inventory.scan"
  | "banking.overview"
  | "banking.accounts"
  | "banking.transactions"
  | "banking.reconciliation"
  | "reports.business"
  | "reports.gst"
  | "people.customers"
  | "people.vendors"
  | "settings.organization"
  | "settings.branches"
  | "settings.employees"
  | "settings.roles"
  | "settings.automation";

export interface SubscriptionCapabilities {
  subscriptionStatus: "ACTIVE" | "TRIAL" | "PAST_DUE" | "EXPIRED" | "UNKNOWN";
  plan: string;
  features: Partial<Record<FeatureKey, boolean>>;
  limits: Record<string, number>;
  source: "backend" | "fallback";
}

export function featureForPath(path: string): FeatureKey | null {
  if (path === "/dashboard") return "dashboard.view";
  if (path.startsWith("/sales/pos")) return "sales.pos";
  if (path.startsWith("/sales/quotes")) return "sales.quotes";
  if (path.startsWith("/sales/invoices")) return "sales.invoices";
  if (path.startsWith("/sales/orders")) return "sales.orders";
  if (path.startsWith("/sales/receipts")) return "sales.receipts";
  if (path.startsWith("/sales/returns")) return "sales.returns";
  if (path.startsWith("/sales/recurring-invoices")) return "sales.recurring-invoices";
  if (path.startsWith("/purchases/expenses")) return "purchases.expenses";
  if (path.startsWith("/purchases/receipts")) return "purchases.receipts";
  if (path.startsWith("/purchases/orders")) return "purchases.orders";
  if (path.startsWith("/purchases/supplier-payments")) return "purchases.payments";
  if (path.startsWith("/purchases/returns")) return "purchases.returns";
  if (path.startsWith("/inventory/items")) return "inventory.items";
  if (path.startsWith("/inventory/categories")) return "inventory.categories";
  if (path.startsWith("/inventory/price-lists")) return "inventory.price-lists";
  if (path.startsWith("/inventory/warehouses")) return "inventory.warehouses";
  if (path.startsWith("/inventory/stock-adjustments")) return "inventory.stock-adjustments";
  if (path.startsWith("/inventory/stock-transfers")) return "inventory.stock-transfers";
  if (path.startsWith("/inventory/scan")) return "inventory.scan";
  if (path.startsWith("/banking/overview")) return "banking.overview";
  if (path.startsWith("/banking/accounts")) return "banking.accounts";
  if (path.startsWith("/banking/transactions") || path.startsWith("/banking/import-statement")) {
    return "banking.transactions";
  }
  if (path.startsWith("/banking/reconciliation")) return "banking.reconciliation";
  if (path.startsWith("/reports/business")) return "reports.business";
  if (path.startsWith("/reports/gst")) return "reports.gst";
  if (path.startsWith("/people/customers")) return "people.customers";
  if (path.startsWith("/people/vendors")) return "people.vendors";
  if (path === "/system/settings") return "settings.organization";
  if (path.startsWith("/system/settings/branches")) return "settings.branches";
  if (path.startsWith("/system/settings/employees")) return "settings.employees";
  if (path.startsWith("/system/settings/roles")) return "settings.roles";
  if (path.startsWith("/system/automation")) return "settings.automation";
  return null;
}

export function defaultCapabilities(): SubscriptionCapabilities {
  return {
    subscriptionStatus: "UNKNOWN",
    plan: "UNSPECIFIED",
    features: {},
    limits: {},
    source: "fallback",
  };
}
