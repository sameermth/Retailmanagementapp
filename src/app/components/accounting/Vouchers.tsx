import {
  AlertCircle,
  Check,
  ChevronRight,
  ChevronsUpDown,
  CirclePlus,
  RefreshCcw,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth";
import { fetchCustomers, type CustomerResponse } from "../customers/api";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { fetchVendors, type SupplierResponse } from "../vendors/api";
import {
  createVoucher,
  fetchAccountLedger,
  fetchAccounts,
  fetchCashBankSummary,
  fetchDaybook,
  fetchExpenseSummary,
  fetchOutstanding,
  fetchPartyLedger,
  fetchVoucher,
  fetchVouchers,
  type AccountLedgerDetailsResponse,
  type AccountResponse,
  type CashBankSummaryResponse,
  type ExpenseSummaryResponse,
  type LedgerEntryResponse,
  type OutstandingSummaryResponse,
  type PartyLedgerDetailsResponse,
  type VoucherDetailsResponse,
  type VoucherResponse,
} from "./api";

interface VoucherLineDraft {
  accountId: string;
  debitAmount: string;
  creditAmount: string;
  narrative: string;
}

interface PickerOption {
  id: string;
  label: string;
  meta?: string;
}

interface SearchablePickerProps {
  label: string;
  placeholder: string;
  searchValue: string;
  selectedLabel: string;
  options: PickerOption[];
  onSearchChange: (value: string) => void;
  onSelect: (option: PickerOption) => void;
  disabled?: boolean;
}

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value ?? 0);
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Not available";
  }
  return new Date(value).toLocaleDateString("en-IN");
}

function SearchablePicker({
  label,
  placeholder,
  searchValue,
  selectedLabel,
  options,
  onSearchChange,
  onSelect,
  disabled = false,
}: SearchablePickerProps) {
  const [open, setOpen] = useState(false);
  const [internalQuery, setInternalQuery] = useState("");
  const effectiveQuery = open ? internalQuery : searchValue;
  const filteredOptions = useMemo(() => {
    const query = effectiveQuery.trim().toLowerCase();
    if (!query) {
      return options;
    }
    return options.filter((option) =>
      `${option.label} ${option.meta ?? ""}`.toLowerCase().includes(query),
    );
  }, [effectiveQuery, options]);

  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <Popover
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) {
            setInternalQuery("");
          }
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setInternalQuery(searchValue)}
            className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-left text-sm text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
          >
            <span className="truncate">{selectedLabel || placeholder}</span>
            <ChevronsUpDown className="ml-3 h-4 w-4 shrink-0 text-slate-400" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <div className="border-b border-slate-200 p-3">
            <input
              value={effectiveQuery}
              onChange={(event) => {
                setInternalQuery(event.target.value);
                onSearchChange(event.target.value);
              }}
              placeholder={placeholder}
              className="crm-field"
              autoFocus
            />
          </div>
          <div className="max-h-72 overflow-y-auto p-2">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-6 text-sm text-slate-500">No results found.</div>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    onSelect(option);
                    setInternalQuery("");
                    setOpen(false);
                  }}
                  className="flex w-full items-start gap-3 rounded-2xl px-3 py-2 text-left transition hover:bg-slate-100"
                >
                  <Check
                    className={`mt-0.5 h-4 w-4 shrink-0 ${
                      option.label === selectedLabel ? "text-slate-900" : "text-transparent"
                    }`}
                  />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-slate-900">{option.label}</div>
                    {option.meta ? <div className="mt-0.5 text-xs text-slate-500">{option.meta}</div> : null}
                  </div>
                </button>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function getDefaultDateRange() {
  const toDate = new Date();
  const fromDate = new Date();
  fromDate.setDate(toDate.getDate() - 30);
  return {
    fromDate: fromDate.toISOString().slice(0, 10),
    toDate: toDate.toISOString().slice(0, 10),
  };
}

export function Vouchers() {
  const { token, user } = useAuth();
  const [accounts, setAccounts] = useState<AccountResponse[]>([]);
  const [customers, setCustomers] = useState<CustomerResponse[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierResponse[]>([]);
  const [vouchers, setVouchers] = useState<VoucherResponse[]>([]);
  const [selectedVoucher, setSelectedVoucher] = useState<VoucherDetailsResponse | null>(null);
  const [voucherType, setVoucherType] = useState("JOURNAL");
  const [voucherDate, setVoucherDate] = useState(new Date().toISOString().slice(0, 10));
  const [remarks, setRemarks] = useState("");
  const [lines, setLines] = useState<VoucherLineDraft[]>([
    { accountId: "", debitAmount: "", creditAmount: "", narrative: "" },
  ]);
  const [accountSearches, setAccountSearches] = useState<Record<number, string>>({});
  const [ledgerAccountId, setLedgerAccountId] = useState<number | null>(null);
  const [ledgerAccountSearch, setLedgerAccountSearch] = useState("");
  const [partyType, setPartyType] = useState<"CUSTOMER" | "SUPPLIER">("CUSTOMER");
  const [partyId, setPartyId] = useState<number | null>(null);
  const [partySearch, setPartySearch] = useState("");
  const [dateRange, setDateRange] = useState(getDefaultDateRange());
  const [daybookEntries, setDaybookEntries] = useState<LedgerEntryResponse[]>([]);
  const [accountLedger, setAccountLedger] = useState<AccountLedgerDetailsResponse | null>(null);
  const [partyLedger, setPartyLedger] = useState<PartyLedgerDetailsResponse | null>(null);
  const [outstanding, setOutstanding] = useState<OutstandingSummaryResponse | null>(null);
  const [cashBankSummary, setCashBankSummary] = useState<CashBankSummaryResponse | null>(null);
  const [expenseSummary, setExpenseSummary] = useState<ExpenseSummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [insightError, setInsightError] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function loadBaseData() {
    if (!token || !user?.organizationId) return;
    setIsLoading(true);
    setError("");
    try {
      const [accountResponse, voucherResponse, customerResponse, supplierResponse] = await Promise.all([
        fetchAccounts(token, user.organizationId),
        fetchVouchers(token, user.organizationId),
        fetchCustomers(token, user.organizationId),
        fetchVendors(token, user.organizationId),
      ]);
      setAccounts(accountResponse);
      setVouchers(voucherResponse);
      setCustomers(customerResponse);
      setSuppliers(supplierResponse);
      if (voucherResponse[0]) {
        setSelectedVoucher(await fetchVoucher(token, user.organizationId, voucherResponse[0].id));
      } else {
        setSelectedVoucher(null);
      }
      if (!ledgerAccountId && accountResponse[0]) {
        setLedgerAccountId(accountResponse[0].id);
      }
      if (!partyId && customerResponse[0]) {
        setPartyType("CUSTOMER");
        setPartyId(customerResponse[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load finance data.");
    } finally {
      setIsLoading(false);
    }
  }

  async function loadInsights() {
    if (!token || !user?.organizationId) return;
    setInsightError("");
    try {
      const requests: Promise<unknown>[] = [
        fetchDaybook(token, user.organizationId, dateRange.fromDate, dateRange.toDate).then(setDaybookEntries),
        fetchCashBankSummary(token, user.organizationId, dateRange).then(setCashBankSummary),
        fetchExpenseSummary(token, user.organizationId, dateRange).then(setExpenseSummary),
      ];
      if (ledgerAccountId) {
        requests.push(
          fetchAccountLedger(token, user.organizationId, {
            accountId: ledgerAccountId,
            fromDate: dateRange.fromDate,
            toDate: dateRange.toDate,
          }).then(setAccountLedger),
        );
      } else {
        setAccountLedger(null);
      }
      if (partyId) {
        requests.push(
          fetchPartyLedger(token, user.organizationId, {
            partyType,
            partyId,
            fromDate: dateRange.fromDate,
            toDate: dateRange.toDate,
          }).then(setPartyLedger),
          fetchOutstanding(token, user.organizationId, {
            partyType,
            partyId,
            asOfDate: dateRange.toDate,
          }).then(setOutstanding),
        );
      } else {
        setPartyLedger(null);
        setOutstanding(null);
      }
      await Promise.all(requests);
    } catch (err) {
      setInsightError(err instanceof Error ? err.message : "Failed to load finance insights.");
    }
  }

  useEffect(() => {
    void loadBaseData();
  }, [token, user?.organizationId]);

  useEffect(() => {
    if (!token || !user?.organizationId) return;
    void loadInsights();
  }, [token, user?.organizationId, dateRange.fromDate, dateRange.toDate, ledgerAccountId, partyId, partyType]);

  const totals = useMemo(() => {
    const debit = lines.reduce((sum, line) => sum + (Number(line.debitAmount) || 0), 0);
    const credit = lines.reduce((sum, line) => sum + (Number(line.creditAmount) || 0), 0);
    return { debit, credit };
  }, [lines]);

  const accountOptions = useMemo(
    () =>
      accounts.map((account) => ({
        id: String(account.id),
        label: account.name,
        meta: `${account.code} · ${account.accountType}`,
      })),
    [accounts],
  );

  const partyOptions = useMemo(() => {
    if (partyType === "CUSTOMER") {
      return customers.map((customer) => ({
        id: String(customer.id),
        label: customer.fullName,
        meta: `${customer.customerCode}${customer.phone ? ` · ${customer.phone}` : ""}`,
      }));
    }
    return suppliers.map((supplier) => ({
      id: String(supplier.id),
      label: supplier.name,
      meta: `${supplier.supplierCode}${supplier.phone ? ` · ${supplier.phone}` : ""}`,
    }));
  }, [customers, partyType, suppliers]);

  const selectedLedgerAccountLabel =
    accountOptions.find((option) => Number(option.id) === ledgerAccountId)?.label ?? "";
  const selectedPartyLabel =
    partyOptions.find((option) => Number(option.id) === partyId)?.label ?? "";

  function updateLine(index: number, field: keyof VoucherLineDraft, value: string) {
    setLines((current) =>
      current.map((line, lineIndex) => (lineIndex === index ? { ...line, [field]: value } : line)),
    );
  }

  function updateAccountSearch(index: number, value: string) {
    setAccountSearches((current) => ({ ...current, [index]: value }));
  }

  async function handleCreateVoucher(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !user?.organizationId || !user.defaultBranchId) {
      setError("Organization and branch context are required.");
      return;
    }
    const normalizedLines = lines
      .map((line) =>
        line.accountId
          ? {
              accountId: Number(line.accountId),
              debitAmount: line.debitAmount ? Number(line.debitAmount) : undefined,
              creditAmount: line.creditAmount ? Number(line.creditAmount) : undefined,
              narrative: line.narrative.trim() || undefined,
            }
          : null,
      )
      .filter((line): line is NonNullable<typeof line> => Boolean(line));
    if (normalizedLines.length === 0) {
      setError("At least one voucher line is required.");
      return;
    }
    if (totals.debit !== totals.credit) {
      setError("Debit and credit must be balanced before posting.");
      return;
    }
    setIsSubmitting(true);
    setError("");
    setSuccessMessage("");
    try {
      await createVoucher(token, {
        organizationId: user.organizationId,
        branchId: user.defaultBranchId,
        voucherDate,
        voucherType,
        remarks: remarks.trim() || undefined,
        lines: normalizedLines,
      });
      setSuccessMessage("Voucher posted.");
      setLines([{ accountId: "", debitAmount: "", creditAmount: "", narrative: "" }]);
      setAccountSearches({});
      setRemarks("");
      await loadBaseData();
      await loadInsights();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create voucher.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSelectVoucher(voucherId: number) {
    if (!token || !user?.organizationId) return;
    try {
      setSelectedVoucher(await fetchVoucher(token, user.organizationId, voucherId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load voucher details.");
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Accountant</div>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">Vouchers And Finance Review</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Manual voucher posting now sits alongside daybook, ledgers, outstanding, cash and bank,
          and expense analytics from the live ERP finance APIs.
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-[520px_minmax(0,0.8fr)_minmax(0,1fr)] 2xl:grid-cols-[560px_minmax(0,0.8fr)_minmax(0,1fr)]">
        <form onSubmit={handleCreateVoucher} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
              <CirclePlus className="h-5 w-5" />
            </div>
            <div>
              <div className="text-lg font-semibold text-slate-950">Post Voucher</div>
              <div className="text-sm text-slate-500">ERP voucher flow</div>
            </div>
          </div>
          <div className="mt-6 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <select value={voucherType} onChange={(event) => setVoucherType(event.target.value)} className="crm-select">
                {["JOURNAL", "PAYMENT", "RECEIPT", "CONTRA"].map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <input type="date" value={voucherDate} onChange={(event) => setVoucherDate(event.target.value)} className="crm-field" />
            </div>
            <div className="space-y-3">
              {lines.map((line, index) => {
                const selectedLabel =
                  accountOptions.find((option) => Number(option.id) === Number(line.accountId))?.label ?? "";
                return (
                  <div key={index} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="grid gap-3 md:grid-cols-[minmax(0,1.5fr)_0.7fr_0.7fr]">
                      <SearchablePicker
                        label={`Account ${index + 1}`}
                        placeholder="Search account"
                        searchValue={accountSearches[index] ?? ""}
                        selectedLabel={selectedLabel}
                        options={accountOptions}
                        onSearchChange={(value) => updateAccountSearch(index, value)}
                        onSelect={(option) => {
                          updateLine(index, "accountId", option.id);
                          updateAccountSearch(index, option.label);
                        }}
                      />
                      <div className="space-y-2">
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Debit</div>
                        <input
                          value={line.debitAmount}
                          onChange={(event) => updateLine(index, "debitAmount", event.target.value)}
                          type="number"
                          min="0"
                          step="0.01"
                          className="crm-field"
                          placeholder="0.00"
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Credit</div>
                        <input
                          value={line.creditAmount}
                          onChange={(event) => updateLine(index, "creditAmount", event.target.value)}
                          type="number"
                          min="0"
                          step="0.01"
                          className="crm-field"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    <div className="mt-3">
                      <input
                        value={line.narrative}
                        onChange={(event) => updateLine(index, "narrative", event.target.value)}
                        className="crm-field"
                        placeholder="Narrative"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() =>
                setLines((current) => [
                  ...current,
                  { accountId: "", debitAmount: "", creditAmount: "", narrative: "" },
                ])
              }
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-700"
            >
              <CirclePlus className="h-4 w-4" />
              Add line
            </button>
            <input value={remarks} onChange={(event) => setRemarks(event.target.value)} className="crm-field" placeholder="Remarks" />
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Debit: <span className="font-medium text-slate-950">{formatCurrency(totals.debit)}</span>
              {" · "}
              Credit: <span className="font-medium text-slate-950">{formatCurrency(totals.credit)}</span>
            </div>
            {(error || successMessage) && (
              <div className="space-y-3">
                {error ? (
                  <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                ) : null}
                {successMessage ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {successMessage}
                  </div>
                ) : null}
              </div>
            )}
            <button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="w-full rounded-full bg-slate-950 px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
            >
              {isSubmitting ? "Posting..." : "Post voucher"}
            </button>
          </div>
        </form>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Vouchers</h2>
              <p className="mt-2 text-sm text-slate-600">Backend source: `/api/erp/finance/vouchers`</p>
            </div>
            <button
              type="button"
              onClick={() => void loadBaseData()}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </button>
          </div>
          <div className="mt-5 max-h-[34rem] space-y-3 overflow-y-auto pr-1">
            {vouchers.length > 0 ? (
              vouchers.map((voucher) => (
                <button
                  key={voucher.id}
                  type="button"
                  onClick={() => void handleSelectVoucher(voucher.id)}
                  className="block w-full rounded-2xl border border-slate-200 px-4 py-4 text-left transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-medium text-slate-900">{voucher.voucherNumber}</div>
                      <div className="mt-1 text-sm text-slate-500">
                        {voucher.voucherType} · {formatDate(voucher.voucherDate)}
                      </div>
                    </div>
                    <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                      {voucher.status}
                    </span>
                  </div>
                </button>
              ))
            ) : (
              <div className="text-sm text-slate-500">No vouchers returned yet.</div>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Voucher Detail</h2>
          <div className="mt-5 space-y-3">
            {selectedVoucher ? (
              <>
                <div className="rounded-2xl border border-slate-200 px-4 py-4">
                  <div className="text-sm font-medium text-slate-900">{selectedVoucher.voucher.voucherNumber}</div>
                  <div className="mt-1 text-sm text-slate-500">
                    {selectedVoucher.voucher.voucherType} · {selectedVoucher.voucher.status}
                  </div>
                  {selectedVoucher.voucher.remarks ? (
                    <div className="mt-2 text-sm text-slate-600">{selectedVoucher.voucher.remarks}</div>
                  ) : null}
                </div>
                {selectedVoucher.entries.map((entry) => {
                  const account = accounts.find((item) => item.id === entry.accountId);
                  return (
                    <div key={entry.id} className="rounded-2xl border border-slate-200 px-4 py-4">
                      <div className="text-sm font-medium text-slate-900">
                        {account ? `${account.name} (${account.code})` : `Account #${entry.accountId}`}
                      </div>
                      <div className="mt-1 text-sm text-slate-500">{entry.narrative || "No narrative"}</div>
                      <div className="mt-2 text-sm text-slate-600">
                        Debit {formatCurrency(entry.debitAmount)} · Credit {formatCurrency(entry.creditAmount)}
                      </div>
                    </div>
                  );
                })}
              </>
            ) : (
              <div className="text-sm text-slate-500">Select a voucher to see its ledger lines.</div>
            )}
          </div>
        </section>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Finance Review</h2>
            <p className="mt-2 text-sm text-slate-600">
              Daybook, ledgers, outstanding, cash and bank, and expense summaries from the current ERP finance APIs.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="date"
              value={dateRange.fromDate}
              onChange={(event) => setDateRange((current) => ({ ...current, fromDate: event.target.value }))}
              className="crm-field w-auto"
            />
            <input
              type="date"
              value={dateRange.toDate}
              onChange={(event) => setDateRange((current) => ({ ...current, toDate: event.target.value }))}
              className="crm-field w-auto"
            />
            <button
              type="button"
              onClick={() => void loadInsights()}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>

        {insightError ? (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{insightError}</span>
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Cash Inflow</div>
            <div className="mt-3 text-2xl font-semibold text-slate-950">
              {formatCurrency(cashBankSummary?.totalInflow)}
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Cash Outflow</div>
            <div className="mt-3 text-2xl font-semibold text-slate-950">
              {formatCurrency(cashBankSummary?.totalOutflow)}
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Net Movement</div>
            <div className="mt-3 text-2xl font-semibold text-slate-950">
              {formatCurrency(cashBankSummary?.netMovement)}
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Expense Total</div>
            <div className="mt-3 text-2xl font-semibold text-slate-950">
              {formatCurrency(expenseSummary?.totalExpenseAmount)}
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <section className="space-y-4 rounded-3xl border border-slate-200 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-950">Account Ledger</h3>
                <p className="mt-1 text-sm text-slate-500">Search an account and review postings for the selected period.</p>
              </div>
            </div>
            <SearchablePicker
              label="Account"
              placeholder="Search account"
              searchValue={ledgerAccountSearch}
              selectedLabel={selectedLedgerAccountLabel}
              options={accountOptions}
              onSearchChange={setLedgerAccountSearch}
              onSelect={(option) => {
                setLedgerAccountId(Number(option.id));
                setLedgerAccountSearch(option.label);
              }}
            />
            {accountLedger ? (
              <div className="space-y-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="text-sm font-medium text-slate-900">
                    {accountLedger.accountName} ({accountLedger.accountCode})
                  </div>
                  <div className="mt-2 text-sm text-slate-600">
                    Debit {formatCurrency(accountLedger.totalDebit)} · Credit {formatCurrency(accountLedger.totalCredit)} · Net {formatCurrency(accountLedger.netMovement)}
                  </div>
                </div>
                <div className="space-y-2">
                  {accountLedger.entries.slice(0, 8).map((entry) => (
                    <div key={entry.id} className="rounded-2xl border border-slate-200 px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-medium text-slate-900">{entry.voucherNumber}</div>
                        <div className="text-sm text-slate-500">{formatDate(entry.entryDate)}</div>
                      </div>
                      <div className="mt-1 text-sm text-slate-500">{entry.narrative || "No narrative"}</div>
                      <div className="mt-2 text-sm text-slate-600">
                        Debit {formatCurrency(entry.debitAmount)} · Credit {formatCurrency(entry.creditAmount)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-500">Choose an account to load its ledger.</div>
            )}
          </section>

          <section className="space-y-4 rounded-3xl border border-slate-200 p-5">
            <div>
              <h3 className="text-base font-semibold text-slate-950">Party Ledger And Outstanding</h3>
              <p className="mt-1 text-sm text-slate-500">Switch between customers and suppliers, then review ledger and aged dues.</p>
            </div>
            <div className="grid gap-3 md:grid-cols-[0.65fr_minmax(0,1fr)]">
              <select
                value={partyType}
                onChange={(event) => {
                  const nextType = event.target.value as "CUSTOMER" | "SUPPLIER";
                  setPartyType(nextType);
                  setPartyId(null);
                  setPartySearch("");
                }}
                className="crm-select"
              >
                <option value="CUSTOMER">Customer</option>
                <option value="SUPPLIER">Supplier</option>
              </select>
              <SearchablePicker
                label="Party"
                placeholder={`Search ${partyType.toLowerCase()}`}
                searchValue={partySearch}
                selectedLabel={selectedPartyLabel}
                options={partyOptions}
                onSearchChange={setPartySearch}
                onSelect={(option) => {
                  setPartyId(Number(option.id));
                  setPartySearch(option.label);
                }}
              />
            </div>
            {partyLedger ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                Debit {formatCurrency(partyLedger.totalDebit)} · Credit {formatCurrency(partyLedger.totalCredit)}
              </div>
            ) : null}
            {outstanding ? (
              <div className="space-y-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Outstanding</div>
                  <div className="mt-2 text-2xl font-semibold text-slate-950">
                    {formatCurrency(outstanding.totalOutstanding)}
                  </div>
                </div>
                <div className="grid gap-2 md:grid-cols-5">
                  {[
                    ["Current", outstanding.aging.current],
                    ["1-30", outstanding.aging.bucket1To30],
                    ["31-60", outstanding.aging.bucket31To60],
                    ["61-90", outstanding.aging.bucket61To90],
                    ["90+", outstanding.aging.bucket90Plus],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl border border-slate-200 px-3 py-3 text-center">
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</div>
                      <div className="mt-2 text-sm font-medium text-slate-900">{formatCurrency(Number(value))}</div>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  {outstanding.documents.slice(0, 6).map((document) => (
                    <div key={`${document.documentNumber}-${document.documentId}`} className="rounded-2xl border border-slate-200 px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-medium text-slate-900">{document.documentNumber}</div>
                        <div className="text-sm text-slate-500">{document.agingBucket || "Current"}</div>
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        {formatDate(document.documentDate)} · Due {formatDate(document.dueDate)}
                      </div>
                      <div className="mt-2 text-sm text-slate-600">
                        Outstanding {formatCurrency(document.outstandingAmount)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-500">Choose a customer or supplier to review outstanding documents.</div>
            )}
          </section>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <section className="rounded-3xl border border-slate-200 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-950">Daybook</h3>
                <p className="mt-1 text-sm text-slate-500">Live daybook entries for the selected date window.</p>
              </div>
              <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                {daybookEntries.length} entries
              </span>
            </div>
            <div className="mt-4 space-y-2">
              {daybookEntries.slice(0, 10).map((entry) => {
                const account = accounts.find((item) => item.id === entry.accountId);
                return (
                  <div key={entry.id} className="rounded-2xl border border-slate-200 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-medium text-slate-900">{entry.voucherNumber}</div>
                      <div className="text-sm text-slate-500">{formatDate(entry.entryDate)}</div>
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      {account ? `${account.name} (${account.code})` : `Account #${entry.accountId}`}
                    </div>
                    <div className="mt-2 text-sm text-slate-600">
                      Debit {formatCurrency(entry.debitAmount)} · Credit {formatCurrency(entry.creditAmount)}
                    </div>
                  </div>
                );
              })}
              {daybookEntries.length === 0 ? (
                <div className="text-sm text-slate-500">No daybook entries for the selected dates.</div>
              ) : null}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 p-5">
            <div>
              <h3 className="text-base font-semibold text-slate-950">Expense Breakdown</h3>
              <p className="mt-1 text-sm text-slate-500">Category totals from the ERP expense summary.</p>
            </div>
            <div className="mt-4 space-y-2">
              {expenseSummary?.categories.slice(0, 8).map((category) => (
                <div key={category.expenseCategoryId} className="rounded-2xl border border-slate-200 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-slate-900">{category.expenseCategoryName}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {category.expenseCategoryCode || "Uncoded"} · {category.expenseCount ?? 0} entries
                      </div>
                    </div>
                    <div className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                      {formatCurrency(category.totalAmount)}
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </div>
                  </div>
                </div>
              ))}
              {!expenseSummary || expenseSummary.categories.length === 0 ? (
                <div className="text-sm text-slate-500">No expense categories available for the selected dates.</div>
              ) : null}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
