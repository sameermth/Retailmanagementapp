export interface DemoBankAccount {
  id: string;
  name: string;
  accountType: "bank" | "cash" | "credit-card" | "clearing";
  accountNumber: string;
  institution: string;
  balance: number;
  lastSyncedAt: string;
  isPrimary: boolean;
}

export interface DemoBankTransaction {
  id: string;
  accountId: string;
  date: string;
  description: string;
  category: string;
  type: "incoming" | "outgoing";
  amount: number;
  status: "matched" | "needs-review" | "reconciled";
}

interface DemoBankingState {
  accounts: DemoBankAccount[];
  transactions: DemoBankTransaction[];
}

export interface DemoBankAccountInput {
  name: string;
  accountType: DemoBankAccount["accountType"];
  accountNumber: string;
  institution: string;
  balance: number;
  isPrimary: boolean;
}

export interface DemoStatementImportInput {
  accountId: string;
  rows: Array<{
    date: string;
    description: string;
    category: string;
    type: DemoBankTransaction["type"];
    amount: number;
  }>;
}

const STORAGE_KEY = "banking.demo-state";

const defaultState: DemoBankingState = {
  accounts: [
    {
      id: "acct-1",
      name: "ICICI Current Account",
      accountType: "bank",
      accountNumber: "41899234",
      institution: "ICICI Bank",
      balance: 482340,
      lastSyncedAt: "2026-03-25T04:10:00.000Z",
      isPrimary: true,
    },
    {
      id: "acct-2",
      name: "Cash Account",
      accountType: "cash",
      accountNumber: "CASH-001",
      institution: "In Store",
      balance: 68450,
      lastSyncedAt: "2026-03-25T03:55:00.000Z",
      isPrimary: false,
    },
    {
      id: "acct-3",
      name: "HDFC Merchant Account",
      accountType: "bank",
      accountNumber: "31955028",
      institution: "HDFC Bank",
      balance: 192110,
      lastSyncedAt: "2026-03-25T03:42:00.000Z",
      isPrimary: false,
    },
    {
      id: "acct-4",
      name: "Payment Clearing Account",
      accountType: "clearing",
      accountNumber: "CLEAR-102",
      institution: "Settlement",
      balance: 24085,
      lastSyncedAt: "2026-03-25T03:37:00.000Z",
      isPrimary: false,
    },
  ],
  transactions: [
    {
      id: "txn-1",
      accountId: "acct-1",
      date: "2026-03-25",
      description: "UPI collections batch",
      category: "Sales receipt",
      type: "incoming",
      amount: 48560,
      status: "matched",
    },
    {
      id: "txn-2",
      accountId: "acct-1",
      date: "2026-03-24",
      description: "Supplier payout - Apex Foods",
      category: "Vendor payment",
      type: "outgoing",
      amount: 28100,
      status: "reconciled",
    },
    {
      id: "txn-3",
      accountId: "acct-3",
      date: "2026-03-24",
      description: "Card settlement",
      category: "POS settlement",
      type: "incoming",
      amount: 16420,
      status: "matched",
    },
    {
      id: "txn-4",
      accountId: "acct-4",
      date: "2026-03-23",
      description: "Unmapped bank charge",
      category: "Needs review",
      type: "outgoing",
      amount: 580,
      status: "needs-review",
    },
    {
      id: "txn-5",
      accountId: "acct-2",
      date: "2026-03-23",
      description: "Cash deposit",
      category: "Cash movement",
      type: "incoming",
      amount: 9200,
      status: "reconciled",
    },
  ],
};

function writeState(state: DemoBankingState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function nextId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function readBankingState(): DemoBankingState {
  const rawValue = localStorage.getItem(STORAGE_KEY);

  if (!rawValue) {
    writeState(defaultState);
    return defaultState;
  }

  try {
    return JSON.parse(rawValue) as DemoBankingState;
  } catch {
    writeState(defaultState);
    return defaultState;
  }
}

export function createBankAccount(input: DemoBankAccountInput) {
  const state = readBankingState();

  const account: DemoBankAccount = {
    id: nextId("acct"),
    name: input.name,
    accountType: input.accountType,
    accountNumber: input.accountNumber,
    institution: input.institution,
    balance: input.balance,
    lastSyncedAt: new Date().toISOString(),
    isPrimary: input.isPrimary,
  };

  const accounts = state.accounts.map((existing) => ({
    ...existing,
    isPrimary: input.isPrimary ? false : existing.isPrimary,
  }));

  const nextState = {
    ...state,
    accounts: [account, ...accounts],
  };

  writeState(nextState);
  return account;
}

export function importBankStatement(input: DemoStatementImportInput) {
  const state = readBankingState();
  const importedTransactions: DemoBankTransaction[] = input.rows.map((row) => ({
    id: nextId("txn"),
    accountId: input.accountId,
    date: row.date,
    description: row.description,
    category: row.category,
    type: row.type,
    amount: row.amount,
    status: "needs-review",
  }));

  const nextState = {
    ...state,
    accounts: state.accounts.map((account) =>
      account.id === input.accountId
        ? { ...account, lastSyncedAt: new Date().toISOString() }
        : account,
    ),
    transactions: [...importedTransactions, ...state.transactions],
  };

  writeState(nextState);
  return importedTransactions;
}

export function updateTransactionStatus(
  transactionId: string,
  status: DemoBankTransaction["status"],
) {
  const state = readBankingState();
  const nextState = {
    ...state,
    transactions: state.transactions.map((transaction) =>
      transaction.id === transactionId ? { ...transaction, status } : transaction,
    ),
  };

  writeState(nextState);
}
