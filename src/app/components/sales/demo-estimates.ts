export interface DemoEstimateLine {
  productId: number;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  gstRate: number;
  lineTotal: number;
}

export interface DemoEstimate {
  id: string;
  estimateNumber: string;
  customerId: number | null;
  customerName: string;
  customerEmail: string | null;
  estimateDate: string;
  expiryDate: string;
  status: "draft" | "sent" | "accepted" | "expired";
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  notes: string;
  lines: DemoEstimateLine[];
}

const STORAGE_KEY = "sales.demo-estimates";

function nextId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function nextEstimateNumber(estimates: DemoEstimate[]) {
  return `EST-${String(estimates.length + 1).padStart(4, "0")}`;
}

function writeEstimates(estimates: DemoEstimate[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(estimates));
}

export function readEstimates() {
  const rawValue = localStorage.getItem(STORAGE_KEY);

  if (!rawValue) {
    return [];
  }

  try {
    return JSON.parse(rawValue) as DemoEstimate[];
  } catch {
    writeEstimates([]);
    return [];
  }
}

export function createEstimate(
  input: Omit<DemoEstimate, "id" | "estimateNumber" | "status"> & {
    status?: DemoEstimate["status"];
  },
) {
  const estimates = readEstimates();
  const estimate: DemoEstimate = {
    ...input,
    id: nextId("estimate"),
    estimateNumber: nextEstimateNumber(estimates),
    status: input.status ?? "draft",
  };

  const nextState = [estimate, ...estimates];
  writeEstimates(nextState);
  return estimate;
}
