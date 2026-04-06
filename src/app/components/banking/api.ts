import { apiRequest, createIdempotencyKey } from "../../lib/api";
import type { AccountResponse } from "../accounting/api";

interface ErpApiResponse<T> {
  success: boolean;
  data: T;
  message: string | null;
  timestamp: string;
}

export interface CashBankAccountSummaryResponse {
  accountId: number;
  accountCode: string;
  accountName: string;
  totalDebit: number;
  totalCredit: number;
  inflow: number;
  outflow: number;
  netMovement: number;
}

export interface CashBankSummaryResponse {
  fromDate: string | null;
  toDate: string | null;
  totalInflow: number;
  totalOutflow: number;
  netMovement: number;
  accounts: CashBankAccountSummaryResponse[];
}

export interface BankStatementEntryResponse {
  id: number;
  organizationId: number;
  branchId: number | null;
  accountId: number;
  entryDate: string;
  valueDate: string | null;
  referenceNumber: string | null;
  description: string | null;
  debitAmount: number | null;
  creditAmount: number | null;
  signedAmount: number | null;
  status: string;
  matchedLedgerEntryId: number | null;
  matchedOn: string | null;
  matchedBy: number | null;
  remarks: string | null;
}

export interface BankReconciliationCandidateResponse {
  ledgerEntryId: number;
  voucherId: number;
  voucherNumber: string;
  voucherType: string;
  entryDate: string;
  debitAmount: number | null;
  creditAmount: number | null;
  signedAmount: number | null;
  narrative: string | null;
  exactAmountMatch: boolean;
  dayDifference: number | null;
}

export interface BankReconciliationSummaryResponse {
  accountId: number;
  fromDate: string;
  toDate: string;
  statementBalance: number;
  reconciledStatementBalance: number;
  bookBalance: number;
  reconciledBookBalance: number;
  unmatchedCount: number;
  reconciledCount: number;
  entries: BankStatementEntryResponse[];
}

export interface ImportBankStatementLinePayload {
  entryDate: string;
  valueDate?: string;
  referenceNumber?: string;
  description?: string;
  debitAmount?: number;
  creditAmount?: number;
  remarks?: string;
}

export interface ImportBankStatementPayload {
  organizationId?: number;
  branchId?: number;
  accountId: number;
  lines: ImportBankStatementLinePayload[];
}

export interface BankReconciliationQueryPayload {
  accountId: number;
  fromDate: string;
  toDate: string;
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

export async function fetchBankingAccounts(token: string, organizationId: number) {
  const response = await erpRequest<AccountResponse[]>(
    `/api/erp/finance/accounts?organizationId=${organizationId}`,
    token,
  );

  return response.filter((account) =>
    /bank|cash|card|wallet|upi|clearing/i.test(account.accountType || account.name || account.code),
  );
}

export async function fetchCashBankSummary(
  token: string,
  organizationId: number,
  payload?: { fromDate?: string; toDate?: string },
) {
  return erpRequest<CashBankSummaryResponse>(
    `/api/erp/finance/cash-bank-summary?organizationId=${organizationId}`,
    token,
    {
      method: "POST",
      body: JSON.stringify(payload ?? {}),
    },
  );
}

export async function fetchBankReconciliationSummary(
  token: string,
  organizationId: number,
  payload: BankReconciliationQueryPayload,
) {
  return erpRequest<BankReconciliationSummaryResponse>(
    `/api/erp/finance/bank-reconciliation/summary?organizationId=${organizationId}`,
    token,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function importBankStatement(token: string, payload: ImportBankStatementPayload) {
  return erpRequest<BankStatementEntryResponse[]>(
    "/api/erp/finance/bank-reconciliation/statements",
    token,
    {
      method: "POST",
      idempotencyKey: createIdempotencyKey("erp-bank-statement:import", payload),
      body: JSON.stringify(payload),
    },
  );
}

export async function fetchReconciliationCandidates(
  token: string,
  organizationId: number,
  statementEntryId: number,
) {
  return erpRequest<BankReconciliationCandidateResponse[]>(
    `/api/erp/finance/bank-reconciliation/statements/${statementEntryId}/candidates?organizationId=${organizationId}`,
    token,
  );
}

export async function reconcileBankStatement(
  token: string,
  organizationId: number,
  statementEntryId: number,
  ledgerEntryId: number,
  remarks?: string,
) {
  return erpRequest<BankStatementEntryResponse>(
    `/api/erp/finance/bank-reconciliation/statements/${statementEntryId}/reconcile?organizationId=${organizationId}`,
    token,
    {
      method: "POST",
      idempotencyKey: createIdempotencyKey("erp-bank-statement:reconcile", {
        organizationId,
        statementEntryId,
        ledgerEntryId,
        remarks,
      }),
      body: JSON.stringify({ ledgerEntryId, remarks }),
    },
  );
}

export async function unreconcileBankStatement(
  token: string,
  organizationId: number,
  statementEntryId: number,
) {
  return erpRequest<BankStatementEntryResponse>(
    `/api/erp/finance/bank-reconciliation/statements/${statementEntryId}/unreconcile?organizationId=${organizationId}`,
    token,
    {
      method: "POST",
      idempotencyKey: createIdempotencyKey("erp-bank-statement:unreconcile", {
        organizationId,
        statementEntryId,
      }),
    },
  );
}
