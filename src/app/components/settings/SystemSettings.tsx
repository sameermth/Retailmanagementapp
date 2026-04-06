import { AlertCircle, Building2, CirclePlus, GitBranch, Save, Search, ShieldCheck, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth";
import { SettingsTabs, type SettingsTab } from "./SettingsTabs";
import {
  activateEmployee,
  createBranch,
  createEmployee,
  createOrganization,
  deactivateEmployee,
  fetchBranches,
  fetchEmployees,
  fetchEmployeeRoles,
  fetchOrganizations,
  updateBranch,
  updateEmployee,
  updateOrganization,
  type BranchResponse,
  type EmployeeResponse,
  type OrganizationResponse,
  type RoleReferenceResponse,
} from "./api";

const tabCopy: Record<SettingsTab, { title: string; description: string }> = {
  organization: {
    title: "Organization",
    description: "Manage accessible organizations and update the active organization profile from the backend.",
  },
  branches: {
    title: "Branches",
    description: "Create and update branch records for the active organization.",
  },
  employees: {
    title: "Employees",
    description: "Add employees, assign branches, and manage activation without leaving the system menu.",
  },
  roles: {
    title: "Roles & Permissions",
    description: "Current session roles and permissions from login. Keep this as the live matrix until role-management APIs are exposed.",
  },
};

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

interface BranchFormState {
  id: number | null;
  code: string;
  name: string;
  phone: string;
  email: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isActive: boolean;
}

interface EmployeeFormState {
  id: number | null;
  username: string;
  password: string;
  fullName: string;
  email: string;
  phone: string;
  roleCode: string;
  defaultBranchId: string;
  branchIds: string[];
  active: boolean;
}

interface SearchablePickerProps {
  label: string;
  placeholder: string;
  value: string;
  search: string;
  options: Array<{ value: string; label: string }>;
  onSearchChange: (value: string) => void;
  onValueChange: (value: string) => void;
}

function emptyBranchForm(): BranchFormState {
  return {
    id: null,
    code: "",
    name: "",
    phone: "",
    email: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "India",
    isActive: true,
  };
}

function branchFormFromBranch(branch: BranchResponse): BranchFormState {
  return {
    id: branch.id,
    code: branch.code,
    name: branch.name,
    phone: branch.phone ?? "",
    email: branch.email ?? "",
    addressLine1: branch.addressLine1 ?? "",
    addressLine2: branch.addressLine2 ?? "",
    city: branch.city ?? "",
    state: branch.state ?? "",
    postalCode: branch.postalCode ?? "",
    country: branch.country ?? "",
    isActive: branch.isActive ?? true,
  };
}

function emptyEmployeeForm(defaultBranchId?: number | null): EmployeeFormState {
  return {
    id: null,
    username: "",
    password: "",
    fullName: "",
    email: "",
    phone: "",
    roleCode: "",
    defaultBranchId: defaultBranchId ? String(defaultBranchId) : "",
    branchIds: defaultBranchId ? [String(defaultBranchId)] : [],
    active: true,
  };
}

function employeeFormFromEmployee(employee: EmployeeResponse): EmployeeFormState {
  return {
    id: employee.id,
    username: employee.username,
    password: "",
    fullName: employee.fullName,
    email: employee.email ?? "",
    phone: employee.phone ?? "",
    roleCode: employee.roleCode ?? "",
    defaultBranchId: employee.defaultBranchId != null ? String(employee.defaultBranchId) : "",
    branchIds: employee.branchAccess.map((branch) => String(branch.branchId)),
    active: employee.active ?? true,
  };
}

function SearchablePicker({
  label,
  placeholder,
  value,
  search,
  options,
  onSearchChange,
  onValueChange,
}: SearchablePickerProps) {
  const normalizedSearch = search.trim().toLowerCase();
  const filteredOptions = options.filter((option) =>
    normalizedSearch.length === 0
      ? true
      : option.label.toLowerCase().includes(normalizedSearch) ||
        option.value.toLowerCase().includes(normalizedSearch),
  );

  return (
    <div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="relative border-b border-slate-200">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={placeholder}
            className="w-full border-0 bg-transparent py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none"
          />
        </div>
        <div className="max-h-44 overflow-y-auto p-2">
          <button
            type="button"
            onClick={() => {
              onValueChange("");
              onSearchChange("");
            }}
            className={`mb-1 w-full rounded-lg px-3 py-2 text-left text-sm transition ${
              value === "" ? "bg-slate-950 text-white" : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            Clear selection
          </button>
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onValueChange(option.value);
                  onSearchChange(option.label);
                }}
                className={`mb-1 w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                  value === option.value
                    ? "bg-slate-950 text-white"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                {option.label}
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-slate-500">No matches found.</div>
          )}
        </div>
      </div>
    </div>
  );
}

export function SystemSettings({ initialTab = "organization" }: { initialTab?: SettingsTab }) {
  const { user, token, capabilities, hasAnyPermission } = useAuth();
  const activeCopy = tabCopy[initialTab];

  const [organizations, setOrganizations] = useState<OrganizationResponse[]>([]);
  const [branches, setBranches] = useState<BranchResponse[]>([]);
  const [employees, setEmployees] = useState<EmployeeResponse[]>([]);
  const [isLoadingOrganizations, setIsLoadingOrganizations] = useState(false);
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [isLoadingRoles, setIsLoadingRoles] = useState(false);
  const [error, setError] = useState("");
  const [roles, setRoles] = useState<RoleReferenceResponse[]>([]);
  const [orgForm, setOrgForm] = useState({
    name: "",
    code: "",
    legalName: "",
    phone: "",
    email: "",
    gstin: "",
    gstThresholdAmount: "",
    gstThresholdAlertEnabled: true,
    isActive: true,
  });
  const [branchForm, setBranchForm] = useState<BranchFormState>(emptyBranchForm());
  const [employeeForm, setEmployeeForm] = useState<EmployeeFormState>(emptyEmployeeForm(user?.defaultBranchId));
  const [roleSearch, setRoleSearch] = useState("");
  const [defaultBranchSearch, setDefaultBranchSearch] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const canManageOrganizations = hasAnyPermission(["org.manage"]);
  const canViewOrganizations = hasAnyPermission(["org.view"]);
  const canManageBranches = hasAnyPermission(["branch.manage"]);
  const canViewBranches = hasAnyPermission(["branch.view"]);
  const canManageEmployees = hasAnyPermission(["user.manage"]);
  const canViewEmployees = hasAnyPermission(["user.view"]);

  const activeMembership = useMemo(
    () =>
      user?.memberships.find((membership) => membership.organizationId === user.organizationId) ??
      user?.memberships[0] ??
      null,
    [user],
  );

  const activeOrganization = useMemo(
    () =>
      organizations.find((organization) => organization.id === user?.organizationId) ?? null,
    [organizations, user?.organizationId],
  );

  useEffect(() => {
    if (!user) {
      return;
    }

    setEmployeeForm(emptyEmployeeForm(user.defaultBranchId));
    setRoleSearch("");
    setDefaultBranchSearch("");
  }, [user?.defaultBranchId]);

  useEffect(() => {
    async function loadOrganizations() {
      if (!token || !canViewOrganizations) {
        return;
      }

      setIsLoadingOrganizations(true);
      setError("");
      try {
        const response = await fetchOrganizations(token);
        setOrganizations(response);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load organizations.");
      } finally {
        setIsLoadingOrganizations(false);
      }
    }

    void loadOrganizations();
  }, [token, canViewOrganizations]);

  useEffect(() => {
    if (!activeOrganization) {
      return;
    }

    setOrgForm({
      name: activeOrganization.name ?? "",
      code: activeOrganization.code ?? "",
      legalName: activeOrganization.legalName ?? "",
      phone: activeOrganization.phone ?? "",
      email: activeOrganization.email ?? "",
      gstin: activeOrganization.gstin ?? "",
      gstThresholdAmount:
        activeOrganization.gstThresholdAmount != null ? String(activeOrganization.gstThresholdAmount) : "",
      gstThresholdAlertEnabled: activeOrganization.gstThresholdAlertEnabled ?? true,
      isActive: activeOrganization.isActive ?? true,
    });
  }, [activeOrganization]);

  useEffect(() => {
    async function loadBranches() {
      if (!token || !user?.organizationId || !canViewBranches) {
        return;
      }

      setIsLoadingBranches(true);
      setError("");
      try {
        const response = await fetchBranches(token, user.organizationId);
        setBranches(response);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load branches.");
      } finally {
        setIsLoadingBranches(false);
      }
    }

    if (initialTab === "branches") {
      void loadBranches();
    }
  }, [token, user?.organizationId, canViewBranches, initialTab]);

  useEffect(() => {
    async function loadRoles() {
      if (!token || !canViewEmployees) {
        return;
      }

      setIsLoadingRoles(true);
      try {
        const response = await fetchEmployeeRoles(token);
        setRoles(response);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load employee roles.");
      } finally {
        setIsLoadingRoles(false);
      }
    }

    if (initialTab === "employees" || initialTab === "roles") {
      void loadRoles();
    }
  }, [token, canViewEmployees, initialTab]);

  useEffect(() => {
    async function loadEmployees() {
      if (!token || !user?.organizationId || !canViewEmployees) {
        return;
      }

      setIsLoadingEmployees(true);
      setError("");
      try {
        const response = await fetchEmployees(token, user.organizationId);
        setEmployees(response);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load employees.");
      } finally {
        setIsLoadingEmployees(false);
      }
    }

    if (initialTab === "employees") {
      void loadEmployees();
    }
  }, [token, user?.organizationId, canViewEmployees, initialTab]);

  if (!user) {
    return null;
  }

  async function handleSaveOrganization() {
    if (!token || !canManageOrganizations) {
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      if (activeOrganization) {
        const updated = await updateOrganization(token, activeOrganization.id, {
          name: orgForm.name.trim(),
          code: orgForm.code.trim().toUpperCase(),
          legalName: orgForm.legalName.trim() || undefined,
          phone: orgForm.phone.trim() || undefined,
          email: orgForm.email.trim() || undefined,
          gstin: orgForm.gstin.trim() || undefined,
          gstThresholdAmount: orgForm.gstThresholdAmount.trim()
            ? Number(orgForm.gstThresholdAmount)
            : undefined,
          gstThresholdAlertEnabled: orgForm.gstThresholdAlertEnabled,
          isActive: orgForm.isActive,
        });
        setOrganizations((current) =>
          current.map((organization) => (organization.id === updated.id ? updated : organization)),
        );
      } else {
        const created = await createOrganization(token, {
          name: orgForm.name.trim(),
          code: orgForm.code.trim().toUpperCase(),
          legalName: orgForm.legalName.trim() || undefined,
          phone: orgForm.phone.trim() || undefined,
          email: orgForm.email.trim() || undefined,
          gstin: orgForm.gstin.trim() || undefined,
          gstThresholdAmount: orgForm.gstThresholdAmount.trim()
            ? Number(orgForm.gstThresholdAmount)
            : undefined,
          gstThresholdAlertEnabled: orgForm.gstThresholdAlertEnabled,
          isActive: orgForm.isActive,
        });
        setOrganizations((current) => [...current, created]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save organization.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveBranch() {
    if (!token || !user.organizationId || !canManageBranches) {
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      if (branchForm.id) {
        const updated = await updateBranch(token, user.organizationId, branchForm.id, {
          code: branchForm.code.trim().toUpperCase(),
          name: branchForm.name.trim(),
          phone: branchForm.phone.trim() || undefined,
          email: branchForm.email.trim() || undefined,
          addressLine1: branchForm.addressLine1.trim() || undefined,
          addressLine2: branchForm.addressLine2.trim() || undefined,
          city: branchForm.city.trim() || undefined,
          state: branchForm.state.trim() || undefined,
          postalCode: branchForm.postalCode.trim() || undefined,
          country: branchForm.country.trim() || undefined,
          isActive: branchForm.isActive,
        });
        setBranches((current) => current.map((branch) => (branch.id === updated.id ? updated : branch)));
      } else {
        const created = await createBranch(token, {
          organizationId: user.organizationId,
          code: branchForm.code.trim().toUpperCase(),
          name: branchForm.name.trim(),
          phone: branchForm.phone.trim() || undefined,
          email: branchForm.email.trim() || undefined,
          addressLine1: branchForm.addressLine1.trim() || undefined,
          addressLine2: branchForm.addressLine2.trim() || undefined,
          city: branchForm.city.trim() || undefined,
          state: branchForm.state.trim() || undefined,
          postalCode: branchForm.postalCode.trim() || undefined,
          country: branchForm.country.trim() || undefined,
          isActive: branchForm.isActive,
        });
        setBranches((current) => [...current, created]);
      }

      setBranchForm(emptyBranchForm());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save branch.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveEmployee() {
    if (!token || !user.organizationId || !canManageEmployees) {
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      if (employeeForm.id) {
        const updated = await updateEmployee(token, user.organizationId, employeeForm.id, {
          fullName: employeeForm.fullName.trim() || undefined,
          email: employeeForm.email.trim() || undefined,
          phone: employeeForm.phone.trim() || undefined,
          roleCode: employeeForm.roleCode.trim() || undefined,
          defaultBranchId: employeeForm.defaultBranchId ? Number(employeeForm.defaultBranchId) : undefined,
          branchIds: employeeForm.branchIds.map(Number),
          active: employeeForm.active,
        });
        setEmployees((current) => current.map((employee) => (employee.id === updated.id ? updated : employee)));
      } else {
        const created = await createEmployee(token, {
          organizationId: user.organizationId,
          username: employeeForm.username.trim(),
          password: employeeForm.password,
          fullName: employeeForm.fullName.trim(),
          email: employeeForm.email.trim() || undefined,
          phone: employeeForm.phone.trim() || undefined,
          roleCode: employeeForm.roleCode.trim(),
          defaultBranchId: employeeForm.defaultBranchId ? Number(employeeForm.defaultBranchId) : undefined,
          branchIds: employeeForm.branchIds.map(Number),
          active: employeeForm.active,
        });
        setEmployees((current) => [...current, created]);
      }

      setEmployeeForm(emptyEmployeeForm(user.defaultBranchId));
      setRoleSearch("");
      setDefaultBranchSearch("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save employee.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleEmployee(employee: EmployeeResponse) {
    if (!token || !user.organizationId || !canManageEmployees) {
      return;
    }

    setError("");
    try {
      if (employee.active) {
        await deactivateEmployee(token, user.organizationId, employee.id);
      } else {
        await activateEmployee(token, user.organizationId, employee.id);
      }

      setEmployees((current) =>
        current.map((entry) =>
          entry.id === employee.id ? { ...entry, active: !employee.active } : entry,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change employee status.");
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">System</div>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">{activeCopy.title}</h1>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-600">{activeCopy.description}</p>
      </section>

      <SettingsTabs activeTab={initialTab} />

      {error ? (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {initialTab === "organization" && (
        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Building2 className="h-4 w-4" />
              <span>Active Organization</span>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label><div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Name</div><input value={orgForm.name} onChange={(e) => setOrgForm((c) => ({ ...c, name: e.target.value }))} className="crm-field" /></label>
              <label><div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Code</div><input value={orgForm.code} onChange={(e) => setOrgForm((c) => ({ ...c, code: e.target.value }))} className="crm-field uppercase" /></label>
              <label><div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Legal Name</div><input value={orgForm.legalName} onChange={(e) => setOrgForm((c) => ({ ...c, legalName: e.target.value }))} className="crm-field" /></label>
              <label><div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">GSTIN</div><input value={orgForm.gstin} onChange={(e) => setOrgForm((c) => ({ ...c, gstin: e.target.value }))} className="crm-field" /></label>
              <label><div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Phone</div><input value={orgForm.phone} onChange={(e) => setOrgForm((c) => ({ ...c, phone: e.target.value }))} className="crm-field" /></label>
              <label><div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Email</div><input value={orgForm.email} onChange={(e) => setOrgForm((c) => ({ ...c, email: e.target.value }))} className="crm-field" /></label>
              <label><div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">GST Threshold</div><input value={orgForm.gstThresholdAmount} onChange={(e) => setOrgForm((c) => ({ ...c, gstThresholdAmount: e.target.value }))} className="crm-field" /></label>
              <div className="grid gap-3">
                <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-700"><input type="checkbox" checked={orgForm.gstThresholdAlertEnabled} onChange={(e) => setOrgForm((c) => ({ ...c, gstThresholdAlertEnabled: e.target.checked }))} /><span>Threshold alerts enabled</span></label>
                <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-700"><input type="checkbox" checked={orgForm.isActive} onChange={(e) => setOrgForm((c) => ({ ...c, isActive: e.target.checked }))} /><span>Organization active</span></label>
              </div>
            </div>
            {canManageOrganizations ? (
              <div className="mt-5">
                <button type="button" onClick={() => void handleSaveOrganization()} disabled={isSaving} className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60">
                  <Save className="h-4 w-4" />
                  <span>{isSaving ? "Saving..." : activeOrganization ? "Save organization" : "Create organization"}</span>
                </button>
              </div>
            ) : null}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="text-sm font-semibold text-slate-900">Access Snapshot</div>
            <dl className="mt-4 space-y-3 text-sm text-slate-600">
              <div className="flex justify-between gap-4"><dt>Current org ID</dt><dd className="text-right font-medium text-slate-900">{user.organizationId}</dd></div>
              <div className="flex justify-between gap-4"><dt>Current org code</dt><dd className="text-right font-medium text-slate-900">{user.organizationCode || "Not returned"}</dd></div>
              <div className="flex justify-between gap-4"><dt>Role snapshot</dt><dd className="text-right font-medium text-slate-900">{activeMembership?.roleName || activeMembership?.roleCode || "Not returned"}</dd></div>
              <div className="flex justify-between gap-4"><dt>Subscription version</dt><dd className="text-right font-medium text-slate-900">{activeOrganization?.subscriptionVersion ?? "Not returned"}</dd></div>
              <div className="flex justify-between gap-4"><dt>Plan</dt><dd className="text-right font-medium text-slate-900">{capabilities.plan}</dd></div>
              <div className="flex justify-between gap-4"><dt>Status</dt><dd className="text-right font-medium text-slate-900">{capabilities.subscriptionStatus}</dd></div>
            </dl>
            <div className="mt-5 border-t border-slate-200 pt-4">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Accessible Organizations</div>
              <div className="mt-3 space-y-2">
                {isLoadingOrganizations ? (
                  <div className="text-sm text-slate-500">Loading organizations...</div>
                ) : organizations.length > 0 ? (
                  organizations.map((organization) => (
                    <div key={organization.id} className="rounded-xl border border-slate-200 px-3 py-3 text-sm">
                      <div className="font-medium text-slate-900">{organization.name}</div>
                      <div className="mt-1 text-slate-500">{organization.code} · Updated {formatDateTime(organization.updatedAt)}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-slate-500">No organizations returned from backend.</div>
                )}
              </div>
            </div>
          </section>
        </div>
      )}

      {initialTab === "branches" && (
        <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <GitBranch className="h-4 w-4" />
              <span>{branchForm.id ? "Edit Branch" : "New Branch"}</span>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label><div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Code</div><input value={branchForm.code} onChange={(e) => setBranchForm((c) => ({ ...c, code: e.target.value }))} className="crm-field uppercase" /></label>
              <label><div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Name</div><input value={branchForm.name} onChange={(e) => setBranchForm((c) => ({ ...c, name: e.target.value }))} className="crm-field" /></label>
              <label><div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Phone</div><input value={branchForm.phone} onChange={(e) => setBranchForm((c) => ({ ...c, phone: e.target.value }))} className="crm-field" /></label>
              <label><div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Email</div><input value={branchForm.email} onChange={(e) => setBranchForm((c) => ({ ...c, email: e.target.value }))} className="crm-field" /></label>
              <label className="md:col-span-2"><div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Address Line 1</div><input value={branchForm.addressLine1} onChange={(e) => setBranchForm((c) => ({ ...c, addressLine1: e.target.value }))} className="crm-field" /></label>
              <label className="md:col-span-2"><div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Address Line 2</div><input value={branchForm.addressLine2} onChange={(e) => setBranchForm((c) => ({ ...c, addressLine2: e.target.value }))} className="crm-field" /></label>
              <label><div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">City</div><input value={branchForm.city} onChange={(e) => setBranchForm((c) => ({ ...c, city: e.target.value }))} className="crm-field" /></label>
              <label><div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">State</div><input value={branchForm.state} onChange={(e) => setBranchForm((c) => ({ ...c, state: e.target.value }))} className="crm-field" /></label>
              <label><div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Postal Code</div><input value={branchForm.postalCode} onChange={(e) => setBranchForm((c) => ({ ...c, postalCode: e.target.value }))} className="crm-field" /></label>
              <label><div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Country</div><input value={branchForm.country} onChange={(e) => setBranchForm((c) => ({ ...c, country: e.target.value }))} className="crm-field" /></label>
            </div>
            <label className="mt-4 flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-700">
              <input type="checkbox" checked={branchForm.isActive} onChange={(e) => setBranchForm((c) => ({ ...c, isActive: e.target.checked }))} />
              <span>Branch active</span>
            </label>
            {canManageBranches ? (
              <div className="mt-5 flex flex-wrap gap-3">
                <button type="button" onClick={() => void handleSaveBranch()} disabled={isSaving} className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"><Save className="h-4 w-4" /><span>{isSaving ? "Saving..." : branchForm.id ? "Save branch" : "Create branch"}</span></button>
                {branchForm.id ? <button type="button" onClick={() => setBranchForm(emptyBranchForm())} className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100">Reset</button> : null}
              </div>
            ) : null}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="text-sm font-semibold text-slate-900">Branch Directory</div>
            <div className="mt-4 space-y-3">
              {isLoadingBranches ? (
                <div className="text-sm text-slate-500">Loading branches...</div>
              ) : branches.length > 0 ? (
                branches.map((branch) => (
                  <div key={branch.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-medium text-slate-900">{branch.name}</div>
                        <div className="mt-1 text-sm text-slate-500">{branch.code} · {branch.city || "No city"} · {branch.state || "No state"}</div>
                        <div className="mt-2 text-sm text-slate-600">{branch.phone || "No phone"} · {branch.email || "No email"}</div>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${branch.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{branch.isActive ? "Active" : "Inactive"}</span>
                    </div>
                    {canManageBranches ? (
                      <div className="mt-3">
                        <button type="button" onClick={() => setBranchForm(branchFormFromBranch(branch))} className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100">
                          <Save className="h-3.5 w-3.5" />
                          <span>Edit branch</span>
                        </button>
                      </div>
                    ) : null}
                  </div>
                ))
              ) : (
                <div className="text-sm text-slate-500">No branches returned from backend.</div>
              )}
            </div>
          </section>
        </div>
      )}

      {initialTab === "employees" && (
        <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Users className="h-4 w-4" />
              <span>{employeeForm.id ? "Edit Employee" : "Add Employee"}</span>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label><div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Username</div><input value={employeeForm.username} onChange={(e) => setEmployeeForm((c) => ({ ...c, username: e.target.value }))} className="crm-field" disabled={Boolean(employeeForm.id)} /></label>
              <label><div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Full Name</div><input value={employeeForm.fullName} onChange={(e) => setEmployeeForm((c) => ({ ...c, fullName: e.target.value }))} className="crm-field" /></label>
              <SearchablePicker
                label="Role"
                placeholder={isLoadingRoles ? "Loading roles..." : "Search role by name or code"}
                value={employeeForm.roleCode}
                search={roleSearch}
                options={roles.map((role) => ({
                  value: role.code,
                  label: `${role.name} (${role.code})`,
                }))}
                onSearchChange={setRoleSearch}
                onValueChange={(value) => setEmployeeForm((c) => ({ ...c, roleCode: value }))}
              />
              <label><div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Email</div><input value={employeeForm.email} onChange={(e) => setEmployeeForm((c) => ({ ...c, email: e.target.value }))} className="crm-field" /></label>
              <label><div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Phone</div><input value={employeeForm.phone} onChange={(e) => setEmployeeForm((c) => ({ ...c, phone: e.target.value }))} className="crm-field" /></label>
              {!employeeForm.id ? (
                <label className="md:col-span-2"><div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Temporary Password</div><input type="password" value={employeeForm.password} onChange={(e) => setEmployeeForm((c) => ({ ...c, password: e.target.value }))} className="crm-field" /></label>
              ) : null}
              <SearchablePicker
                label="Default Branch"
                placeholder="Search branch by name or code"
                value={employeeForm.defaultBranchId}
                search={defaultBranchSearch}
                options={branches.map((branch) => ({
                  value: String(branch.id),
                  label: `${branch.name} (${branch.code})`,
                }))}
                onSearchChange={setDefaultBranchSearch}
                onValueChange={(value) => setEmployeeForm((c) => ({ ...c, defaultBranchId: value }))}
              />
            </div>
            <div className="mt-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Branch Access</div>
              <div className="grid gap-2 md:grid-cols-2">
                {branches.map((branch) => {
                  const checked = employeeForm.branchIds.includes(String(branch.id));
                  return (
                    <label key={branch.id} className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) =>
                          setEmployeeForm((current) => ({
                            ...current,
                            branchIds: e.target.checked
                              ? [...current.branchIds, String(branch.id)]
                              : current.branchIds.filter((branchId) => branchId !== String(branch.id)),
                          }))
                        }
                      />
                      <span>{branch.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            <label className="mt-4 flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-700">
              <input type="checkbox" checked={employeeForm.active} onChange={(e) => setEmployeeForm((c) => ({ ...c, active: e.target.checked }))} />
              <span>Employee active</span>
            </label>
            {canManageEmployees ? (
              <div className="mt-5 flex flex-wrap gap-3">
                <button type="button" onClick={() => void handleSaveEmployee()} disabled={isSaving} className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60">
                  {employeeForm.id ? <Save className="h-4 w-4" /> : <CirclePlus className="h-4 w-4" />}
                  <span>{isSaving ? "Saving..." : employeeForm.id ? "Save employee" : "Add employee"}</span>
                </button>
                {employeeForm.id ? <button type="button" onClick={() => setEmployeeForm(emptyEmployeeForm(user.defaultBranchId))} className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100">Reset</button> : null}
              </div>
            ) : null}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="text-sm font-semibold text-slate-900">Employee Directory</div>
            <div className="mt-4 space-y-3">
              {isLoadingEmployees ? (
                <div className="text-sm text-slate-500">Loading employees...</div>
              ) : employees.length > 0 ? (
                employees.map((employee) => (
                  <div key={employee.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-medium text-slate-900">{employee.fullName}</div>
                        <div className="mt-1 text-sm text-slate-500">{employee.username} · {employee.roleName || employee.roleCode || "No role"} · {employee.employeeCode || "No code"}</div>
                        <div className="mt-2 text-sm text-slate-600">{employee.email || "No email"} · {employee.phone || "No phone"}</div>
                        <div className="mt-2 text-xs text-slate-500">
                          Branches: {employee.branchAccess.map((branch) => `${branch.branchId}${branch.isDefault ? " (default)" : ""}`).join(", ") || "None"}
                        </div>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${employee.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{employee.active ? "Active" : "Inactive"}</span>
                    </div>
                    {canManageEmployees ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button type="button" onClick={() => setEmployeeForm(employeeFormFromEmployee(employee))} className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100">
                          <Save className="h-3.5 w-3.5" />
                          <span>Edit employee</span>
                        </button>
                        <button type="button" onClick={() => void handleToggleEmployee(employee)} className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100">
                          <span>{employee.active ? "Deactivate" : "Activate"}</span>
                        </button>
                      </div>
                    ) : null}
                  </div>
                ))
              ) : (
                <div className="text-sm text-slate-500">No employees returned from backend.</div>
              )}
            </div>
          </section>
        </div>
      )}

      {initialTab === "roles" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <ShieldCheck className="h-4 w-4" />
              <span>Available Roles</span>
            </div>
            <div className="mt-4 space-y-3">
              {isLoadingRoles ? (
                <div className="text-sm text-slate-500">Loading roles...</div>
              ) : roles.length > 0 ? (
                roles.map((role) => (
                  <div key={role.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-medium text-slate-900">{role.name}</div>
                        <div className="mt-1 text-sm text-slate-500">{role.code}</div>
                      </div>
                      <div className="flex gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${role.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{role.active ? "Active" : "Inactive"}</span>
                        {role.system ? <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">System</span> : null}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-slate-500">No roles returned from backend.</div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <ShieldCheck className="h-4 w-4" />
              <span>Current Permissions</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {user.permissions.length > 0 ? (
                user.permissions.map((permission) => (
                  <span key={permission} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                    {permission}
                  </span>
                ))
              ) : (
                <div className="text-sm text-slate-500">No explicit permissions were returned in this session.</div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="text-sm font-semibold text-slate-900">Session Snapshot</div>
            <dl className="mt-4 space-y-3 text-sm text-slate-600">
              <div className="flex justify-between gap-4"><dt>Organization</dt><dd className="text-right font-medium text-slate-900">{user.organizationName || "Not returned"}</dd></div>
              <div className="flex justify-between gap-4"><dt>Default Branch ID</dt><dd className="text-right font-medium text-slate-900">{user.defaultBranchId ?? "Not returned"}</dd></div>
              <div className="flex justify-between gap-4"><dt>Role Snapshot</dt><dd className="text-right font-medium text-slate-900">{activeMembership?.roleName || activeMembership?.roleCode || user.roles.join(", ") || "Not returned"}</dd></div>
              <div className="flex justify-between gap-4"><dt>Memberships</dt><dd className="text-right font-medium text-slate-900">{user.memberships.length}</dd></div>
              <div className="flex justify-between gap-4"><dt>Backend Features</dt><dd className="text-right font-medium text-slate-900">{Object.keys(capabilities.features).length}</dd></div>
            </dl>
          </section>
        </div>
      )}
    </div>
  );
}
