import {
  AlertCircle,
  Check,
  ChevronsUpDown,
  CirclePlus,
  Pencil,
  RefreshCcw,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import {
  createAccount,
  deleteAccount,
  fetchAccount,
  fetchAccounts,
  updateAccount,
  type AccountResponse,
} from "./api";

const ACCOUNT_TYPES = ["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE", "BANK", "CASH"];

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
  hint?: string;
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
  hint,
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
    <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
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
            className="mt-3 flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-left text-sm text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
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
      {hint ? <div className="mt-2 text-xs text-slate-500">{hint}</div> : null}
    </div>
  );
}

export function ChartOfAccounts() {
  const { token, user } = useAuth();
  const [accounts, setAccounts] = useState<AccountResponse[]>([]);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [accountType, setAccountType] = useState("EXPENSE");
  const [parentAccountId, setParentAccountId] = useState<number | null>(null);
  const [parentSearch, setParentSearch] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingAccountId, setDeletingAccountId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function loadData() {
    if (!token || !user?.organizationId) return;
    setIsLoading(true);
    setError("");
    try {
      setAccounts(await fetchAccounts(token, user.organizationId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load chart of accounts.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [token, user?.organizationId]);

  const visibleAccounts = useMemo(
    () => accounts.filter((account) => includeInactive || account.isActive),
    [accounts, includeInactive],
  );

  const parentOptions = useMemo(
    () =>
      visibleAccounts
        .filter((account) => account.id !== editingAccountId)
        .map((account) => ({
          id: String(account.id),
          label: account.name,
          meta: `${account.code} · ${account.accountType}`,
        })),
    [editingAccountId, visibleAccounts],
  );

  const selectedParentLabel =
    parentOptions.find((option) => Number(option.id) === parentAccountId)?.label ?? "";

  function resetForm() {
    setEditingAccountId(null);
    setCode("");
    setName("");
    setAccountType("EXPENSE");
    setParentAccountId(null);
    setParentSearch("");
    setIsActive(true);
  }

  async function handleEdit(accountId: number) {
    if (!token || !user?.organizationId) return;
    setError("");
    try {
      const account = await fetchAccount(token, user.organizationId, accountId);
      setEditingAccountId(account.id);
      setCode(account.code);
      setName(account.name);
      setAccountType(account.accountType);
      setParentAccountId(account.parentAccountId);
      setParentSearch("");
      setIsActive(Boolean(account.isActive));
      setSuccessMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load account details.");
    }
  }

  async function handleDelete(account: AccountResponse) {
    if (!token || !user?.organizationId || account.isSystem) return;
    setDeletingAccountId(account.id);
    setError("");
    setSuccessMessage("");
    try {
      await deleteAccount(token, user.organizationId, account.id);
      setSuccessMessage("Account deleted.");
      if (editingAccountId === account.id) {
        resetForm();
      }
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete account.");
    } finally {
      setDeletingAccountId(null);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !user?.organizationId || !code.trim() || !name.trim()) {
      setError("Code and name are required.");
      return;
    }
    setIsSubmitting(true);
    setError("");
    setSuccessMessage("");
    try {
      const payload = {
        organizationId: user.organizationId,
        code: code.trim(),
        name: name.trim(),
        accountType,
        parentAccountId: parentAccountId ?? undefined,
        isActive,
      };
      if (editingAccountId) {
        await updateAccount(token, editingAccountId, payload);
        setSuccessMessage("Account updated.");
      } else {
        await createAccount(token, payload);
        setSuccessMessage("Account created.");
      }
      resetForm();
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save account.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Accountant</div>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">Chart of Accounts</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          This screen now follows the live ERP finance account flow for listing, creating, editing,
          and retiring account structures.
        </p>
      </section>
      <section className="grid gap-6 xl:grid-cols-[520px_minmax(0,1fr)] 2xl:grid-cols-[560px_minmax(0,1fr)]">
        <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
                <CirclePlus className="h-5 w-5" />
              </div>
              <div>
                <div className="text-lg font-semibold text-slate-950">
                  {editingAccountId ? "Edit Account" : "Create Account"}
                </div>
                <div className="text-sm text-slate-500">ERP finance account maintenance</div>
              </div>
            </div>
            {editingAccountId ? (
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-sm text-slate-700"
              >
                <X className="h-4 w-4" />
                Clear
              </button>
            ) : null}
          </div>
          <div className="mt-6 space-y-4">
            <input value={code} onChange={(event) => setCode(event.target.value)} className="crm-field" placeholder="Code" />
            <input value={name} onChange={(event) => setName(event.target.value)} className="crm-field" placeholder="Name" />
            <select value={accountType} onChange={(event) => setAccountType(event.target.value)} className="crm-select">
              {ACCOUNT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <SearchablePicker
              label="Parent Account"
              placeholder="Select parent account"
              searchValue={parentSearch}
              selectedLabel={selectedParentLabel}
              options={parentOptions}
              onSearchChange={setParentSearch}
              onSelect={(option) => {
                setParentAccountId(Number(option.id));
                setParentSearch(option.label);
              }}
              hint="Optional. Leave empty for a top-level account."
            />
            {parentAccountId ? (
              <button
                type="button"
                onClick={() => {
                  setParentAccountId(null);
                  setParentSearch("");
                }}
                className="text-sm font-medium text-slate-600 underline-offset-4 hover:text-slate-900 hover:underline"
              >
                Clear parent account
              </button>
            ) : null}
            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(event) => setIsActive(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
              />
              Active account
            </label>
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
              {isSubmitting ? (editingAccountId ? "Saving..." : "Creating...") : editingAccountId ? "Save changes" : "Create account"}
            </button>
          </div>
        </form>
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Accounts</h2>
              <p className="mt-2 text-sm text-slate-600">Backend source: `/api/erp/finance/accounts`</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={includeInactive}
                  onChange={(event) => setIncludeInactive(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
                />
                Show inactive
              </label>
              <button
                type="button"
                onClick={() => void loadData()}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <RefreshCcw className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {visibleAccounts.length > 0 ? (
              visibleAccounts.map((account) => (
                <div key={account.id} className="rounded-2xl border border-slate-200 px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-medium text-slate-900">{account.name}</div>
                      <div className="mt-1 text-sm text-slate-500">
                        {account.code} · {account.accountType}
                        {account.parentAccountId ? ` · Parent #${account.parentAccountId}` : ""}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                          account.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {account.isActive ? "Active" : "Inactive"}
                      </span>
                      {account.isSystem ? (
                        <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                          System
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void handleEdit(account.id)}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    >
                      <Pencil className="h-4 w-4" />
                      Edit
                    </button>
                    {!account.isSystem ? (
                      <button
                        type="button"
                        onClick={() => void handleDelete(account)}
                        disabled={deletingAccountId === account.id}
                        className="inline-flex items-center gap-2 rounded-full border border-rose-200 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                      >
                        <Trash2 className="h-4 w-4" />
                        {deletingAccountId === account.id ? "Deleting..." : "Delete"}
                      </button>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-slate-500">No accounts returned yet.</div>
            )}
          </div>
        </section>
      </section>
    </div>
  );
}
