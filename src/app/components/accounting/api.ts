import { apiRequest, createIdempotencyKey } from "../../lib/api";

interface ErpApiResponse<T> {
  success: boolean;
  data: T;
  message: string | null;
  timestamp: string;
}

export interface AccountResponse {
  id: number;
  organizationId: number;
  code: string;
  name: string;
  accountType: string;
  parentAccountId: number | null;
  isSystem: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AccountLedgerDetailsResponse {
  accountId: number;
  accountCode: string;
  accountName: string;
  accountType: string;
  entries: LedgerEntryResponse[];
  totalDebit: number | null;
  totalCredit: number | null;
  netMovement: number | null;
}

export interface PartyLedgerDetailsResponse {
  partyType: string;
  partyId: number;
  entries: LedgerEntryResponse[];
  totalDebit: number | null;
  totalCredit: number | null;
}

export interface AllocationReferenceResponse {
  allocationType: string;
  allocationId: number;
  allocationNumber: string;
  allocationDate: string;
  allocatedAmount: number | null;
}

export interface DocumentOutstandingResponse {
  partyType: string;
  partyId: number | null;
  documentId: number;
  documentNumber: string;
  documentDate: string;
  dueDate: string | null;
  totalAmount: number | null;
  allocatedAmount: number | null;
  outstandingAmount: number | null;
  agingBucket: string | null;
  allocations: AllocationReferenceResponse[];
}

export interface AgingBucketsResponse {
  current: number | null;
  bucket1To30: number | null;
  bucket31To60: number | null;
  bucket61To90: number | null;
  bucket90Plus: number | null;
}

export interface OutstandingSummaryResponse {
  partyType: string;
  partyId: number | null;
  asOfDate: string | null;
  totalOutstanding: number | null;
  documents: DocumentOutstandingResponse[];
  aging: AgingBucketsResponse;
}

export interface CashBankAccountSummaryResponse {
  accountId: number;
  accountCode: string;
  accountName: string;
  totalDebit: number | null;
  totalCredit: number | null;
  inflow: number | null;
  outflow: number | null;
  netMovement: number | null;
}

export interface CashBankSummaryResponse {
  fromDate: string | null;
  toDate: string | null;
  totalInflow: number | null;
  totalOutflow: number | null;
  netMovement: number | null;
  accounts: CashBankAccountSummaryResponse[];
}

export interface ExpenseCategorySummaryResponse {
  expenseCategoryId: number;
  expenseCategoryCode: string | null;
  expenseCategoryName: string;
  totalAmount: number | null;
  expenseCount: number | null;
}

export interface ExpenseSummaryResponse {
  fromDate: string | null;
  toDate: string | null;
  totalExpenseAmount: number | null;
  paidExpenseAmount: number | null;
  approvedUnpaidExpenseAmount: number | null;
  cancelledExpenseAmount: number | null;
  categories: ExpenseCategorySummaryResponse[];
}

export interface VoucherResponse {
  id: number;
  organizationId: number;
  branchId: number | null;
  voucherNumber: string;
  voucherDate: string;
  voucherType: string;
  referenceType: string | null;
  referenceId: number | null;
  remarks: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface LedgerEntryResponse {
  id: number;
  organizationId: number;
  branchId: number | null;
  voucherId: number;
  voucherNumber: string;
  voucherType: string;
  voucherReferenceType: string | null;
  voucherReferenceId: number | null;
  accountId: number;
  entryDate: string;
  debitAmount: number | null;
  creditAmount: number | null;
  narrative: string | null;
  customerId: number | null;
  supplierId: number | null;
  salesInvoiceId: number | null;
  purchaseReceiptId: number | null;
  expenseId: number | null;
  serviceReplacementId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface VoucherDetailsResponse {
  voucher: VoucherResponse;
  entries: LedgerEntryResponse[];
}

export interface CreateAccountPayload {
  organizationId: number;
  code: string;
  name: string;
  accountType: string;
  parentAccountId?: number;
  isSystem?: boolean;
  isActive?: boolean;
}

export interface UpdateAccountPayload {
  organizationId: number;
  code: string;
  name: string;
  accountType: string;
  parentAccountId?: number;
  isActive?: boolean;
}

export interface CreateVoucherLinePayload {
  accountId: number;
  debitAmount?: number;
  creditAmount?: number;
  narrative?: string;
  customerId?: number;
  supplierId?: number;
  salesInvoiceId?: number;
  purchaseReceiptId?: number;
}

export interface CreateVoucherPayload {
  organizationId: number;
  branchId?: number;
  voucherDate?: string;
  voucherType: string;
  referenceType?: string;
  referenceId?: number;
  remarks?: string;
  lines: CreateVoucherLinePayload[];
}

export interface PartyLedgerQueryPayload {
  partyType: string;
  partyId: number;
  fromDate: string;
  toDate: string;
}

export interface AccountLedgerQueryPayload {
  accountId: number;
  fromDate: string;
  toDate: string;
}

export interface OutstandingQueryPayload {
  partyType: string;
  partyId?: number;
  asOfDate?: string;
}

export interface DateRangePayload {
  fromDate?: string;
  toDate?: string;
}

async function erpRequest<T>(
  path: string,
  token: string,
  options?: RequestInit & { idempotencyKey?: string },
) {
  const response = await apiRequest<ErpApiResponse<T>>(path, {
    ...options,
    token,
    method: options?.method ?? "GET",
  });
  return response.data;
}

export async function fetchAccounts(token: string, organizationId: number, accountType?: string) {
  const search = new URLSearchParams({ organizationId: String(organizationId) });
  if (accountType) {
    search.set("accountType", accountType);
  }
  return erpRequest<AccountResponse[]>(`/api/erp/finance/accounts?${search.toString()}`, token);
}

export async function fetchAccount(token: string, organizationId: number, accountId: number) {
  return erpRequest<AccountResponse>(
    `/api/erp/finance/accounts/${accountId}?organizationId=${organizationId}`,
    token,
  );
}

export async function createAccount(token: string, payload: CreateAccountPayload) {
  return erpRequest<AccountResponse>("/api/erp/finance/accounts", token, {
    method: "POST",
    idempotencyKey: createIdempotencyKey("erp-account:create", payload),
    body: JSON.stringify(payload),
  });
}

export async function updateAccount(token: string, accountId: number, payload: UpdateAccountPayload) {
  return erpRequest<AccountResponse>(`/api/erp/finance/accounts/${accountId}`, token, {
    method: "PUT",
    idempotencyKey: createIdempotencyKey("erp-account:update", { accountId, ...payload }),
    body: JSON.stringify(payload),
  });
}

export async function deleteAccount(token: string, organizationId: number, accountId: number) {
  return erpRequest<void>(
    `/api/erp/finance/accounts/${accountId}?organizationId=${organizationId}`,
    token,
    { method: "DELETE" },
  );
}

export async function fetchVouchers(token: string, organizationId: number) {
  return erpRequest<VoucherResponse[]>(
    `/api/erp/finance/vouchers?organizationId=${organizationId}`,
    token,
  );
}

export async function fetchVoucher(token: string, organizationId: number, voucherId: number) {
  return erpRequest<VoucherDetailsResponse>(
    `/api/erp/finance/vouchers/${voucherId}?organizationId=${organizationId}`,
    token,
  );
}

export async function createVoucher(token: string, payload: CreateVoucherPayload) {
  return erpRequest<VoucherResponse>("/api/erp/finance/vouchers", token, {
    method: "POST",
    idempotencyKey: createIdempotencyKey("erp-voucher:create", payload),
    body: JSON.stringify(payload),
  });
}

export async function fetchDaybook(
  token: string,
  organizationId: number,
  fromDate?: string,
  toDate?: string,
) {
  const search = new URLSearchParams({ organizationId: String(organizationId) });
  if (fromDate) {
    search.set("fromDate", fromDate);
  }
  if (toDate) {
    search.set("toDate", toDate);
  }
  return erpRequest<LedgerEntryResponse[]>(`/api/erp/finance/daybook?${search.toString()}`, token);
}

export async function fetchPartyLedger(
  token: string,
  organizationId: number,
  payload: PartyLedgerQueryPayload,
) {
  return erpRequest<PartyLedgerDetailsResponse>(
    `/api/erp/finance/party-ledger?organizationId=${organizationId}`,
    token,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function fetchAccountLedger(
  token: string,
  organizationId: number,
  payload: AccountLedgerQueryPayload,
) {
  return erpRequest<AccountLedgerDetailsResponse>(
    `/api/erp/finance/account-ledger?organizationId=${organizationId}`,
    token,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function fetchOutstanding(
  token: string,
  organizationId: number,
  payload: OutstandingQueryPayload,
) {
  return erpRequest<OutstandingSummaryResponse>(
    `/api/erp/finance/outstanding?organizationId=${organizationId}`,
    token,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function fetchCashBankSummary(
  token: string,
  organizationId: number,
  payload: DateRangePayload,
) {
  return erpRequest<CashBankSummaryResponse>(
    `/api/erp/finance/cash-bank-summary?organizationId=${organizationId}`,
    token,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function fetchExpenseSummary(
  token: string,
  organizationId: number,
  payload: DateRangePayload,
) {
  return erpRequest<ExpenseSummaryResponse>(
    `/api/erp/finance/expense-summary?organizationId=${organizationId}`,
    token,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}
