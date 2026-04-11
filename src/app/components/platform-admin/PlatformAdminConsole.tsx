import { AlertCircle, BellRing, Building2, CirclePlus, FileBarChart, LifeBuoy, Save, Search, ShieldCheck, Users, Wrench } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "../../auth";
import { DataTable, type DataTableColumn } from "../ui/data-table";
import { fetchBranches, fetchEmployeeRoles, type BranchResponse, type RoleReferenceResponse } from "../settings/api";
import {
  assignPlatformSupportTicket,
  cancelPlatformSubscription,
  changePlatformSubscriptionPlan,
  closePlatformSupportTicket,
  createPlatformPlan,
  createPlatformStore,
  fetchPlatformOwnerAccounts,
  fetchPlatformAuditActivity,
  fetchPlatformFeedback,
  fetchPlatformNotifications,
  fetchPlatformOverview,
  fetchPlatformPlans,
  fetchPlatformReports,
  fetchPlatformStore,
  fetchPlatformStoreTeamMember,
  fetchPlatformStoreTeams,
  fetchPlatformStores,
  fetchPlatformSubscriptions,
  fetchPlatformSupportItems,
  fetchPlatformSystemHealth,
  updatePlatformPlan,
  updatePlatformPlanFeatures,
  updatePlatformStore,
  updatePlatformStoreStatus,
  updatePlatformStoreTeamMember,
  updatePlatformStoreTeamMemberStatus,
  updatePlatformWarrantyClaimStatus,
  type CountByLabel,
  type PlatformAuditActivityResponse,
  type PlatformFeedbackResponse,
  type PlatformNotificationResponse,
  type PlatformOwnerAccountReferenceResponse,
  type PlatformOverviewResponse,
  type PlatformReportsResponse,
  type PlatformStoreResponse,
  type PlatformStoreUpsertPayload,
  type PlatformSubscriptionResponse,
  type PlatformSupportItemResponse,
  type PlatformSystemHealthResponse,
  type PlatformTeamMemberResponse,
  type PlatformTeamMemberSummaryResponse,
  type SubscriptionCountByPlan,
  type SubscriptionPlanResponse,
} from "./api";

export type PlatformAdminTab =
  | "overview"
  | "stores"
  | "subscriptions"
  | "plans"
  | "teams"
  | "support"
  | "feedback"
  | "operations";

const tabMeta: Record<PlatformAdminTab, { title: string; description: string; path: string; icon: typeof Building2 }> = {
  overview: {
    title: "Platform Overview",
    description: "Cross-store KPIs, active stores, subscription mix, and team distribution.",
    path: "/platform-admin/overview",
    icon: Building2,
  },
  stores: {
    title: "Stores",
    description: "Create, update, and activate or deactivate onboarded stores from the platform side.",
    path: "/platform-admin/stores",
    icon: Building2,
  },
  subscriptions: {
    title: "Subscriptions",
    description: "Change plans, cancel subscriptions, and review plan usage across onboarded stores.",
    path: "/platform-admin/subscriptions",
    icon: ShieldCheck,
  },
  plans: {
    title: "Plans & Features",
    description: "Manage subscription plans and the feature matrix offered to stores.",
    path: "/platform-admin/plans",
    icon: FileBarChart,
  },
  teams: {
    title: "Store Teams",
    description: "Update team members, roles, and branch access across stores.",
    path: "/platform-admin/teams",
    icon: Users,
  },
  support: {
    title: "Support & Grievances",
    description: "Assign and close service tickets, and update warranty claim statuses from a central queue.",
    path: "/platform-admin/support",
    icon: LifeBuoy,
  },
  feedback: {
    title: "Feedback",
    description: "Review feedback collected across service visits and store support flows.",
    path: "/platform-admin/feedback",
    icon: BellRing,
  },
  operations: {
    title: "Operations",
    description: "Notifications, audit activity, health signals, and platform-level reporting.",
    path: "/platform-admin/operations",
    icon: Wrench,
  },
};

interface SearchablePickerProps {
  label: string;
  placeholder: string;
  value: string;
  search: string;
  options: Array<{ value: string; label: string }>;
  disabled?: boolean;
  onSearchChange: (value: string) => void;
  onValueChange: (value: string) => void;
}

interface StoreFormState {
  organizationId: number | null;
  name: string;
  code: string;
  legalName: string;
  phone: string;
  email: string;
  gstin: string;
  ownerAccountId: string;
  gstThresholdAmount: string;
  gstThresholdAlertEnabled: boolean;
  isActive: boolean;
}

interface SubscriptionFormState {
  organizationId: number | null;
  planCode: string;
  status: string;
  startsOn: string;
  endsOn: string;
  autoRenew: boolean;
  notes: string;
}

interface CancelSubscriptionFormState {
  organizationId: number | null;
  endsOn: string;
  notes: string;
}

interface PlanFeatureEditorState {
  featureCode: string;
  name: string;
  moduleCode: string;
  description: string;
  enabled: boolean;
  featureLimit: string;
  configJson: string;
}

interface PlanFormState {
  planId: number | null;
  code: string;
  name: string;
  description: string;
  billingPeriod: string;
  maxOrganizations: string;
  unlimitedOrganizations: boolean;
  active: boolean;
  features: PlanFeatureEditorState[];
}

interface TeamFormState {
  organizationId: number | null;
  userId: number | null;
  fullName: string;
  email: string;
  phone: string;
  roleCode: string;
  employeeCode: string;
  defaultBranchId: string;
  branchIds: string[];
  active: boolean;
}

interface SupportActionState {
  itemType: string;
  referenceId: number | null;
  organizationId: number | null;
  branchId: number | null;
  assignedToUserId: string;
  remarks: string;
  resolutionStatus: string;
  diagnosisNotes: string;
  status: string;
  approvedOn: string;
  upstreamRouteType: string;
  upstreamCompanyName: string;
  upstreamReferenceNumber: string;
  upstreamStatus: string;
  routedOn: string;
  claimNotes: string;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value));
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function SearchablePicker({
  label,
  placeholder,
  value,
  search,
  options,
  disabled = false,
  onSearchChange,
  onValueChange,
}: SearchablePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const normalizedSearch = search.trim().toLowerCase();
  const filteredOptions = options.filter((option) =>
    normalizedSearch.length === 0
      ? true
      : option.label.toLowerCase().includes(normalizedSearch) ||
        option.value.toLowerCase().includes(normalizedSearch),
  );

  return (
    <div
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsOpen(false);
        }
      }}
    >
      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className={`overflow-hidden rounded-xl border bg-white ${disabled ? "border-slate-100 opacity-60" : "border-slate-200"}`}>
        <div className={`relative ${isOpen ? "border-b border-slate-200" : ""}`}>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full border-0 bg-transparent py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none disabled:cursor-not-allowed"
          />
        </div>
        {isOpen ? (
          <div className="max-h-44 overflow-y-auto p-2">
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                onValueChange("");
                onSearchChange("");
                setIsOpen(false);
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
                  disabled={disabled}
                  onClick={() => {
                    onValueChange(option.value);
                    onSearchChange(option.label);
                    setIsOpen(false);
                  }}
                  className={`mb-1 w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                    value === option.value ? "bg-slate-950 text-white" : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {option.label}
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-sm text-slate-500">No matches found.</div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function emptyStoreForm(): StoreFormState {
  return {
    organizationId: null,
    name: "",
    code: "",
    legalName: "",
    phone: "",
    email: "",
    gstin: "",
    ownerAccountId: "",
    gstThresholdAmount: "",
    gstThresholdAlertEnabled: true,
    isActive: true,
  };
}

function storeFormFromResponse(store: PlatformStoreResponse): StoreFormState {
  return {
    organizationId: store.organizationId,
    name: store.organizationName ?? "",
    code: store.organizationCode ?? "",
    legalName: "",
    phone: "",
    email: "",
    gstin: "",
    ownerAccountId: store.ownerAccountId != null ? String(store.ownerAccountId) : "",
    gstThresholdAmount: "",
    gstThresholdAlertEnabled: true,
    isActive: store.active ?? true,
  };
}

function emptySubscriptionForm(): SubscriptionFormState {
  return {
    organizationId: null,
    planCode: "",
    status: "ACTIVE",
    startsOn: "",
    endsOn: "",
    autoRenew: true,
    notes: "",
  };
}

function subscriptionFormFromResponse(subscription: PlatformSubscriptionResponse): SubscriptionFormState {
  return {
    organizationId: subscription.organizationId,
    planCode: subscription.planCode ?? "",
    status: subscription.status ?? "ACTIVE",
    startsOn: subscription.startsOn ?? "",
    endsOn: subscription.endsOn ?? "",
    autoRenew: subscription.autoRenew ?? true,
    notes: "",
  };
}

function subscriptionStoreLabel(subscription: PlatformSubscriptionResponse) {
  return `${subscription.organizationName} (${subscription.organizationCode})`;
}

function teamMemberLabel(member: PlatformTeamMemberSummaryResponse) {
  return `${member.fullName} (${member.username})`;
}

function supportItemLabel(item: PlatformSupportItemResponse) {
  return `${item.referenceNumber ?? `#${item.referenceId}`} · ${item.organizationName}`;
}

function emptyCancelSubscriptionForm(): CancelSubscriptionFormState {
  return {
    organizationId: null,
    endsOn: "",
    notes: "",
  };
}

function emptyPlanForm(): PlanFormState {
  return {
    planId: null,
    code: "",
    name: "",
    description: "",
    billingPeriod: "MONTHLY",
    maxOrganizations: "",
    unlimitedOrganizations: false,
    active: true,
    features: [],
  };
}

function emptyTeamForm(): TeamFormState {
  return {
    organizationId: null,
    userId: null,
    fullName: "",
    email: "",
    phone: "",
    roleCode: "",
    employeeCode: "",
    defaultBranchId: "",
    branchIds: [],
    active: true,
  };
}

function teamFormFromResponse(member: PlatformTeamMemberResponse): TeamFormState {
  return {
    organizationId: member.organizationId,
    userId: member.id,
    fullName: member.fullName ?? "",
    email: member.email ?? "",
    phone: member.phone ?? "",
    roleCode: member.roleCode ?? "",
    employeeCode: member.employeeCode ?? "",
    defaultBranchId: member.defaultBranchId != null ? String(member.defaultBranchId) : "",
    branchIds: member.branchAccess.map((branch) => String(branch.branchId)),
    active: member.active ?? true,
  };
}

function emptySupportActionState(): SupportActionState {
  return {
    itemType: "",
    referenceId: null,
    organizationId: null,
    branchId: null,
    assignedToUserId: "",
    remarks: "",
    resolutionStatus: "RESOLVED",
    diagnosisNotes: "",
    status: "APPROVED",
    approvedOn: "",
    upstreamRouteType: "",
    upstreamCompanyName: "",
    upstreamReferenceNumber: "",
    upstreamStatus: "",
    routedOn: "",
    claimNotes: "",
  };
}

function statCard(title: string, value: string | number, helper?: string) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{title}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
      {helper ? <div className="mt-1 text-sm text-slate-500">{helper}</div> : null}
    </div>
  );
}

function countList(items: CountByLabel[] | SubscriptionCountByPlan[], emptyLabel: string) {
  if (items.length === 0) {
    return <div className="text-sm text-slate-500">{emptyLabel}</div>;
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={"planCode" in item ? item.planCode : item.label} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
          <span className="text-slate-700">{"planName" in item ? `${item.planName} (${item.planCode})` : item.label}</span>
          <span className="font-semibold text-slate-900">{item.count}</span>
        </div>
      ))}
    </div>
  );
}

export function PlatformAdminConsole({ initialTab = "overview" }: { initialTab?: PlatformAdminTab }) {
  const { token, hasAnyPermission } = useAuth();
  const activeMeta = tabMeta[initialTab];
  const canManage = hasAnyPermission(["platform.manage"]);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const [overview, setOverview] = useState<PlatformOverviewResponse | null>(null);
  const [stores, setStores] = useState<PlatformStoreResponse[]>([]);
  const [subscriptions, setSubscriptions] = useState<PlatformSubscriptionResponse[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlanResponse[]>([]);
  const [teams, setTeams] = useState<PlatformTeamMemberSummaryResponse[]>([]);
  const [supportItems, setSupportItems] = useState<PlatformSupportItemResponse[]>([]);
  const [feedback, setFeedback] = useState<PlatformFeedbackResponse[]>([]);
  const [notifications, setNotifications] = useState<PlatformNotificationResponse[]>([]);
  const [auditItems, setAuditItems] = useState<PlatformAuditActivityResponse[]>([]);
  const [systemHealth, setSystemHealth] = useState<PlatformSystemHealthResponse | null>(null);
  const [reports, setReports] = useState<PlatformReportsResponse | null>(null);

  const [storeForm, setStoreForm] = useState<StoreFormState>(emptyStoreForm());
  const [subscriptionForm, setSubscriptionForm] = useState<SubscriptionFormState>(emptySubscriptionForm());
  const [cancelSubscriptionForm, setCancelSubscriptionForm] = useState<CancelSubscriptionFormState>(emptyCancelSubscriptionForm());
  const [planForm, setPlanForm] = useState<PlanFormState>(emptyPlanForm());
  const [teamForm, setTeamForm] = useState<TeamFormState>(emptyTeamForm());
  const [supportAction, setSupportAction] = useState<SupportActionState>(emptySupportActionState());

  const [roleOptions, setRoleOptions] = useState<RoleReferenceResponse[]>([]);
  const [branchOptions, setBranchOptions] = useState<BranchResponse[]>([]);
  const [ownerAccounts, setOwnerAccounts] = useState<PlatformOwnerAccountReferenceResponse[]>([]);
  const [roleSearch, setRoleSearch] = useState("");
  const [defaultBranchSearch, setDefaultBranchSearch] = useState("");
  const [planSearch, setPlanSearch] = useState("");
  const [supportAssigneeSearch, setSupportAssigneeSearch] = useState("");
  const [ownerAccountSearch, setOwnerAccountSearch] = useState("");
  const [subscriptionStoreSearch, setSubscriptionStoreSearch] = useState("");
  const [cancelSubscriptionStoreSearch, setCancelSubscriptionStoreSearch] = useState("");
  const [teamMemberSearch, setTeamMemberSearch] = useState("");
  const [supportItemSearch, setSupportItemSearch] = useState("");

  const planPickerOptions = useMemo(
    () => plans.map((plan) => ({ value: plan.code, label: `${plan.name} (${plan.code})` })),
    [plans],
  );

  const assigneeOptions = useMemo(() => {
    if (!supportAction.organizationId) {
      return [];
    }
    return teams
      .filter((member) => member.organizationId === supportAction.organizationId && member.active !== false)
      .map((member) => ({
        value: String(member.userId),
        label: `${member.fullName} · ${member.roleName ?? member.roleCode ?? "No role"}`,
      }));
  }, [supportAction.organizationId, teams]);

  const rolePickerOptions = useMemo(
    () => roleOptions
      .filter((role) => role.active !== false)
      .map((role) => ({ value: role.code, label: `${role.name} (${role.code})` })),
    [roleOptions],
  );

  const branchPickerOptions = useMemo(
    () => branchOptions.map((branch) => ({ value: String(branch.id), label: `${branch.name} (${branch.code})` })),
    [branchOptions],
  );

  const ownerAccountPickerOptions = useMemo(
    () =>
      ownerAccounts
        .filter((account) => account.active !== false)
        .map((account) => ({
          value: String(account.accountId),
          label: account.fullName?.trim()
            ? `${account.fullName} (${account.loginIdentifier})`
            : account.loginIdentifier,
        })),
    [ownerAccounts],
  );

  const storeColumns = useMemo<DataTableColumn<PlatformStoreResponse>[]>(
    () => [
      {
        key: "store",
        header: "Store",
        value: (store) => `${store.organizationName ?? ""} ${store.organizationCode ?? ""}`,
        render: (store) => (
          <div>
            <div className="font-medium text-slate-900">{store.organizationName}</div>
            <div className="text-xs text-slate-500">{store.organizationCode}</div>
          </div>
        ),
      },
      {
        key: "plan",
        header: "Plan",
        value: (store) => store.currentPlanName ?? "No plan",
        render: (store) => <span className="text-slate-700">{store.currentPlanName ?? "No plan"}</span>,
      },
      {
        key: "team",
        header: "Team",
        value: (store) => store.teamCount,
        render: (store) => <span className="text-slate-700">{store.teamCount} users</span>,
      },
      {
        key: "status",
        header: "Status",
        value: (store) => (store.active ? "Active" : "Inactive"),
        render: (store) => (
          <span
            className={`rounded-full px-2 py-1 text-xs font-semibold ${
              store.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
            }`}
          >
            {store.active ? "Active" : "Inactive"}
          </span>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        sortable: false,
        filterable: false,
        render: (store) => (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleEditStore(store)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => void handleStoreStatusToggle(store)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              {store.active ? "Deactivate" : "Activate"}
            </button>
          </div>
        ),
      },
    ],
    [handleEditStore, handleStoreStatusToggle],
  );

  const subscriptionColumns = useMemo<DataTableColumn<PlatformSubscriptionResponse>[]>(
    () => [
      {
        key: "store",
        header: "Store",
        value: (subscription) =>
          `${subscription.organizationName ?? ""} ${subscription.organizationCode ?? ""}`,
        render: (subscription) => (
          <div>
            <div className="font-medium text-slate-900">{subscription.organizationName}</div>
            <div className="text-xs text-slate-500">{subscription.organizationCode}</div>
          </div>
        ),
      },
      {
        key: "plan",
        header: "Plan",
        value: (subscription) => subscription.planName ?? "No plan",
        render: (subscription) => <span className="text-slate-700">{subscription.planName ?? "No plan"}</span>,
      },
      {
        key: "dates",
        header: "Dates",
        value: (subscription) =>
          `${subscription.startsOn ?? ""} ${subscription.endsOn ?? ""}`,
        render: (subscription) => (
          <span className="text-slate-700">
            {formatDate(subscription.startsOn)} to {formatDate(subscription.endsOn)}
          </span>
        ),
      },
      {
        key: "status",
        header: "Status",
        value: (subscription) => subscription.status ?? "Unknown",
        render: (subscription) => <span className="text-slate-700">{subscription.status ?? "Unknown"}</span>,
      },
      {
        key: "actions",
        header: "Actions",
        sortable: false,
        filterable: false,
        render: (subscription) => (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setSubscriptionForm(subscriptionFormFromResponse(subscription));
                setSubscriptionStoreSearch(subscriptionStoreLabel(subscription));
              }}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Change plan
            </button>
            <button
              type="button"
              onClick={() => {
                setCancelSubscriptionForm({
                  organizationId: subscription.organizationId,
                  endsOn: subscription.endsOn ?? "",
                  notes: "",
                });
                setCancelSubscriptionStoreSearch(subscriptionStoreLabel(subscription));
              }}
              className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
            >
              Cancel
            </button>
          </div>
        ),
      },
    ],
    [],
  );

  const planColumns = useMemo<DataTableColumn<SubscriptionPlanResponse>[]>(
    () => [
      {
        key: "plan",
        header: "Plan",
        value: (plan) => `${plan.name ?? ""} ${plan.code ?? ""}`,
        render: (plan) => (
          <div>
            <div className="font-medium text-slate-900">{plan.name}</div>
            <div className="text-xs text-slate-500">{plan.code}</div>
          </div>
        ),
      },
      {
        key: "billing",
        header: "Billing",
        value: (plan) => plan.billingPeriod ?? "",
        render: (plan) => <span className="text-slate-700">{plan.billingPeriod}</span>,
      },
      {
        key: "organizations",
        header: "Organizations",
        value: (plan) => (plan.unlimitedOrganizations ? "Unlimited" : plan.maxOrganizations ?? "Not set"),
        render: (plan) => (
          <span className="text-slate-700">
            {plan.unlimitedOrganizations ? "Unlimited" : plan.maxOrganizations ?? "Not set"}
          </span>
        ),
      },
      {
        key: "features",
        header: "Features",
        value: (plan) => plan.features.filter((feature) => feature.enabled).length,
        render: (plan) => (
          <span className="text-slate-700">{plan.features.filter((feature) => feature.enabled).length} enabled</span>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        sortable: false,
        filterable: false,
        render: (plan) => (
          <button
            type="button"
            onClick={() => beginEditPlan(plan)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Edit
          </button>
        ),
      },
    ],
    [beginEditPlan],
  );

  const teamColumns = useMemo<DataTableColumn<PlatformTeamMemberSummaryResponse>[]>(
    () => [
      {
        key: "member",
        header: "Member",
        value: (member) => `${member.fullName ?? ""} ${member.username ?? ""}`,
        render: (member) => (
          <div>
            <div className="font-medium text-slate-900">{member.fullName}</div>
            <div className="text-xs text-slate-500">{member.username}</div>
          </div>
        ),
      },
      {
        key: "store",
        header: "Store",
        value: (member) => member.organizationName ?? "",
        render: (member) => <span className="text-slate-700">{member.organizationName}</span>,
      },
      {
        key: "role",
        header: "Role",
        value: (member) => member.roleName ?? member.roleCode ?? "No role",
        render: (member) => (
          <span className="text-slate-700">{member.roleName ?? member.roleCode ?? "No role"}</span>
        ),
      },
      {
        key: "status",
        header: "Status",
        value: (member) => (member.active ? "Active" : "Inactive"),
        render: (member) => (
          <span
            className={`rounded-full px-2 py-1 text-xs font-semibold ${
              member.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
            }`}
          >
            {member.active ? "Active" : "Inactive"}
          </span>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        sortable: false,
        filterable: false,
        render: (member) => (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleEditTeam(member)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => void handleTeamStatusToggle(member)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              {member.active ? "Deactivate" : "Activate"}
            </button>
          </div>
        ),
      },
    ],
    [handleEditTeam, handleTeamStatusToggle],
  );

  const supportColumns = useMemo<DataTableColumn<PlatformSupportItemResponse>[]>(
    () => [
      {
        key: "type",
        header: "Type",
        value: (item) => item.itemType,
        render: (item) => <span className="text-slate-700">{item.itemType}</span>,
      },
      {
        key: "store",
        header: "Store",
        value: (item) => item.organizationName,
        render: (item) => <span className="text-slate-700">{item.organizationName}</span>,
      },
      {
        key: "reference",
        header: "Reference",
        value: (item) => `${item.referenceNumber ?? `#${item.referenceId}`} ${item.summary ?? ""}`,
        render: (item) => (
          <div>
            <div className="font-medium text-slate-900">{item.referenceNumber ?? `#${item.referenceId}`}</div>
            <div className="text-xs text-slate-500">{item.summary ?? "No summary"}</div>
          </div>
        ),
      },
      {
        key: "status",
        header: "Status",
        value: (item) => item.status ?? "Unknown",
        render: (item) => <span className="text-slate-700">{item.status ?? "Unknown"}</span>,
      },
      {
        key: "actions",
        header: "Action",
        sortable: false,
        filterable: false,
        render: (item) => (
          <button
            type="button"
            onClick={() => beginSupportAction(item)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            {item.itemType.toLowerCase().includes("warranty") ? "Update claim" : "Manage ticket"}
          </button>
        ),
      },
    ],
    [beginSupportAction],
  );

  const feedbackColumns = useMemo<DataTableColumn<PlatformFeedbackResponse>[]>(
    () => [
      {
        key: "store",
        header: "Store",
        value: (item) => item.organizationName,
        render: (item) => <span className="text-slate-700">{item.organizationName}</span>,
      },
      {
        key: "ticket",
        header: "Ticket",
        value: (item) => item.serviceTicketId,
        render: (item) => <span className="text-slate-700">Ticket #{item.serviceTicketId}</span>,
      },
      {
        key: "visitStatus",
        header: "Visit Status",
        value: (item) => item.visitStatus ?? "Unknown",
        render: (item) => <span className="text-slate-700">{item.visitStatus ?? "Unknown"}</span>,
      },
      {
        key: "completed",
        header: "Completed",
        value: (item) => item.completedAt ?? "",
        render: (item) => <span className="text-slate-700">{formatDateTime(item.completedAt)}</span>,
      },
      {
        key: "feedback",
        header: "Feedback",
        value: (item) => item.customerFeedback ?? "No feedback submitted",
        render: (item) => <span className="text-slate-700">{item.customerFeedback ?? "No feedback submitted"}</span>,
      },
    ],
    [],
  );

  const subscriptionStorePickerOptions = useMemo(
    () =>
      subscriptions.map((subscription) => ({
        value: String(subscription.organizationId),
        label: subscriptionStoreLabel(subscription),
      })),
    [subscriptions],
  );

  const teamMemberPickerOptions = useMemo(
    () =>
      teams.map((member) => ({
        value: `${member.organizationId}:${member.userId}`,
        label: `${teamMemberLabel(member)} · ${member.organizationName}`,
      })),
    [teams],
  );

  const supportItemPickerOptions = useMemo(
    () =>
      supportItems.map((item) => ({
        value: `${item.itemType}:${item.referenceId}`,
        label: `${supportItemLabel(item)} · ${item.itemType}`,
      })),
    [supportItems],
  );

  const allKnownFeatureTemplates = useMemo(() => {
    const featureMap = new Map<string, PlanFeatureEditorState>();

    for (const plan of plans) {
      for (const feature of plan.features ?? []) {
        if (!featureMap.has(feature.code)) {
          featureMap.set(feature.code, {
            featureCode: feature.code,
            name: feature.name ?? feature.code,
            moduleCode: feature.moduleCode ?? "",
            description: feature.description ?? "",
            enabled: feature.enabled ?? false,
            featureLimit: feature.featureLimit != null ? String(feature.featureLimit) : "",
            configJson: "",
          });
        }
      }
    }

    return Array.from(featureMap.values()).sort((left, right) => left.name.localeCompare(right.name));
  }, [plans]);

  async function loadActiveTab() {
    if (!token || !canManage) {
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      if (initialTab === "overview") {
        setOverview(await fetchPlatformOverview(token));
        return;
      }

      if (initialTab === "stores") {
        const [nextStores, nextOwnerAccounts] = await Promise.all([
          fetchPlatformStores(token),
          fetchPlatformOwnerAccounts(token),
        ]);
        setStores(nextStores);
        setOwnerAccounts(nextOwnerAccounts);
        return;
      }

      if (initialTab === "subscriptions") {
        const [nextSubscriptions, nextPlans] = await Promise.all([
          fetchPlatformSubscriptions(token),
          fetchPlatformPlans(token),
        ]);
        setSubscriptions(nextSubscriptions);
        setPlans(nextPlans);
        return;
      }

      if (initialTab === "plans") {
        setPlans(await fetchPlatformPlans(token));
        return;
      }

      if (initialTab === "teams") {
        const [nextTeams, nextRoles] = await Promise.all([
          fetchPlatformStoreTeams(token),
          fetchEmployeeRoles(token),
        ]);
        setTeams(nextTeams);
        setRoleOptions(nextRoles);
        return;
      }

      if (initialTab === "support") {
        const [nextSupport, nextTeams] = await Promise.all([
          fetchPlatformSupportItems(token),
          fetchPlatformStoreTeams(token),
        ]);
        setSupportItems(nextSupport);
        setTeams(nextTeams);
        return;
      }

      if (initialTab === "feedback") {
        setFeedback(await fetchPlatformFeedback(token));
        return;
      }

      if (initialTab === "operations") {
        const [nextNotifications, nextAudit, nextHealth, nextReports] = await Promise.all([
          fetchPlatformNotifications(token),
          fetchPlatformAuditActivity(token),
          fetchPlatformSystemHealth(token),
          fetchPlatformReports(token),
        ]);
        setNotifications(nextNotifications);
        setAuditItems(nextAudit);
        setSystemHealth(nextHealth);
        setReports(nextReports);
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to load platform admin data.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadActiveTab();
  }, [initialTab, token]);

  useEffect(() => {
    if (!token || initialTab !== "stores") {
      return;
    }

    const timeout = window.setTimeout(() => {
      void fetchPlatformOwnerAccounts(token, ownerAccountSearch)
        .then((response) => setOwnerAccounts(response))
        .catch(() => undefined);
    }, 180);

    return () => window.clearTimeout(timeout);
  }, [initialTab, ownerAccountSearch, token]);

  async function handleEditStore(store: PlatformStoreResponse) {
    if (!token) return;
    setError("");
    try {
      const detailed = await fetchPlatformStore(token, store.organizationId);
      setStoreForm(storeFormFromResponse(detailed));
      const matchedOwner = ownerAccounts.find((account) => account.accountId === detailed.ownerAccountId);
      setOwnerAccountSearch(
        matchedOwner
          ? matchedOwner.fullName?.trim()
            ? `${matchedOwner.fullName} (${matchedOwner.loginIdentifier})`
            : matchedOwner.loginIdentifier
          : detailed.ownerAccountId != null
            ? String(detailed.ownerAccountId)
            : "",
      );
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to load store.");
    }
  }

  async function handleSaveStore() {
    if (!token) return;
    setIsSaving(true);
    setError("");
    try {
      const payload: PlatformStoreUpsertPayload = {
        name: storeForm.name.trim(),
        code: storeForm.code.trim(),
        legalName: storeForm.legalName.trim() || undefined,
        phone: storeForm.phone.trim() || undefined,
        email: storeForm.email.trim() || undefined,
        gstin: storeForm.gstin.trim() || undefined,
        ownerAccountId: Number(storeForm.ownerAccountId),
        gstThresholdAmount: storeForm.gstThresholdAmount ? Number(storeForm.gstThresholdAmount) : undefined,
        gstThresholdAlertEnabled: storeForm.gstThresholdAlertEnabled,
        isActive: storeForm.isActive,
      };

      if (storeForm.organizationId) {
        await updatePlatformStore(token, storeForm.organizationId, payload);
      } else {
        await createPlatformStore(token, payload);
      }

      setStoreForm(emptyStoreForm());
      setOwnerAccountSearch("");
      setStores(await fetchPlatformStores(token));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to save store.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleStoreStatusToggle(store: PlatformStoreResponse) {
    if (!token) return;
    setIsSaving(true);
    setError("");
    try {
      await updatePlatformStoreStatus(token, store.organizationId, !(store.active ?? true));
      setStores(await fetchPlatformStores(token));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to update store status.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveSubscriptionChange() {
    if (!token || !subscriptionForm.organizationId) return;
    setIsSaving(true);
    setError("");
    try {
      await changePlatformSubscriptionPlan(token, subscriptionForm.organizationId, {
        planCode: subscriptionForm.planCode,
        status: subscriptionForm.status.trim() || undefined,
        startsOn: subscriptionForm.startsOn || undefined,
        endsOn: subscriptionForm.endsOn || undefined,
        autoRenew: subscriptionForm.autoRenew,
        notes: subscriptionForm.notes.trim() || undefined,
      });
      setSubscriptionForm(emptySubscriptionForm());
      setSubscriptionStoreSearch("");
      setSubscriptions(await fetchPlatformSubscriptions(token));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to update subscription.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCancelSubscription() {
    if (!token || !cancelSubscriptionForm.organizationId) return;
    setIsSaving(true);
    setError("");
    try {
      await cancelPlatformSubscription(token, cancelSubscriptionForm.organizationId, {
        endsOn: cancelSubscriptionForm.endsOn || undefined,
        notes: cancelSubscriptionForm.notes.trim() || undefined,
      });
      setCancelSubscriptionForm(emptyCancelSubscriptionForm());
      setCancelSubscriptionStoreSearch("");
      setSubscriptions(await fetchPlatformSubscriptions(token));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to cancel subscription.");
    } finally {
      setIsSaving(false);
    }
  }

  function buildPlanFeatures(plan: SubscriptionPlanResponse | null) {
    const existing = new Map(
      (plan?.features ?? []).map((feature) => [
        feature.code,
        {
          featureCode: feature.code,
          name: feature.name ?? feature.code,
          moduleCode: feature.moduleCode ?? "",
          description: feature.description ?? "",
          enabled: feature.enabled ?? false,
          featureLimit: feature.featureLimit != null ? String(feature.featureLimit) : "",
          configJson: "",
        },
      ]),
    );

    return allKnownFeatureTemplates.map((template) => existing.get(template.featureCode) ?? template);
  }

  function beginEditPlan(plan: SubscriptionPlanResponse | null) {
    if (!plan) {
      setPlanForm({
        ...emptyPlanForm(),
        features: buildPlanFeatures(null),
      });
      return;
    }

    setPlanForm({
      planId: plan.id,
      code: plan.code,
      name: plan.name,
      description: plan.description ?? "",
      billingPeriod: plan.billingPeriod,
      maxOrganizations: plan.maxOrganizations != null ? String(plan.maxOrganizations) : "",
      unlimitedOrganizations: plan.unlimitedOrganizations ?? false,
      active: plan.active ?? true,
      features: buildPlanFeatures(plan),
    });
  }

  async function handleSavePlan() {
    if (!token) return;
    setIsSaving(true);
    setError("");
    try {
      const payload = {
        code: planForm.code.trim(),
        name: planForm.name.trim(),
        description: planForm.description.trim() || undefined,
        billingPeriod: planForm.billingPeriod.trim(),
        maxOrganizations:
          planForm.maxOrganizations.trim().length > 0 ? Number(planForm.maxOrganizations) : undefined,
        unlimitedOrganizations: planForm.unlimitedOrganizations,
        active: planForm.active,
      };

      const savedPlan = planForm.planId
        ? await updatePlatformPlan(token, planForm.planId, payload)
        : await createPlatformPlan(token, payload);

      await updatePlatformPlanFeatures(
        token,
        savedPlan.id,
        planForm.features.map((feature) => ({
          featureCode: feature.featureCode,
          enabled: feature.enabled,
          featureLimit: feature.featureLimit.trim().length > 0 ? Number(feature.featureLimit) : undefined,
          configJson: feature.configJson.trim() || undefined,
        })),
      );

      setPlans(await fetchPlatformPlans(token));
      beginEditPlan(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to save plan.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleEditTeam(member: PlatformTeamMemberSummaryResponse) {
    if (!token) return;
    setError("");
    try {
      const [detailed, nextBranches, nextRoles] = await Promise.all([
        fetchPlatformStoreTeamMember(token, member.organizationId, member.userId),
        fetchBranches(token, member.organizationId),
        roleOptions.length === 0 ? fetchEmployeeRoles(token) : Promise.resolve(roleOptions),
      ]);

      setTeamForm(teamFormFromResponse(detailed));
      setBranchOptions(nextBranches);
      setRoleOptions(nextRoles);
      setDefaultBranchSearch(
        detailed.defaultBranchId != null
          ? nextBranches.find((branch) => branch.id === detailed.defaultBranchId)?.name ?? ""
          : "",
      );
      setRoleSearch(detailed.roleName ?? detailed.roleCode ?? "");
      setTeamMemberSearch(teamMemberLabel(member));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to load team member.");
    }
  }

  async function handleSaveTeam() {
    if (!token || !teamForm.organizationId || !teamForm.userId) return;
    setIsSaving(true);
    setError("");
    try {
      await updatePlatformStoreTeamMember(token, teamForm.organizationId, teamForm.userId, {
        fullName: teamForm.fullName.trim() || undefined,
        email: teamForm.email.trim() || undefined,
        phone: teamForm.phone.trim() || undefined,
        roleCode: teamForm.roleCode || undefined,
        employeeCode: teamForm.employeeCode.trim() || undefined,
        defaultBranchId: teamForm.defaultBranchId ? Number(teamForm.defaultBranchId) : undefined,
        branchIds: teamForm.branchIds.map((id) => Number(id)),
        active: teamForm.active,
      });
      setTeamForm(emptyTeamForm());
      setTeams(await fetchPlatformStoreTeams(token));
      setBranchOptions([]);
      setRoleSearch("");
      setDefaultBranchSearch("");
      setTeamMemberSearch("");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to save team member.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleTeamStatusToggle(member: PlatformTeamMemberSummaryResponse) {
    if (!token) return;
    setIsSaving(true);
    setError("");
    try {
      await updatePlatformStoreTeamMemberStatus(token, member.organizationId, member.userId, !(member.active ?? true));
      setTeams(await fetchPlatformStoreTeams(token));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to update team member status.");
    } finally {
      setIsSaving(false);
    }
  }

  function beginSupportAction(item: PlatformSupportItemResponse) {
    setSupportAction({
      ...emptySupportActionState(),
      itemType: item.itemType,
      referenceId: item.referenceId,
      organizationId: item.organizationId,
      branchId: item.branchId,
      status: item.status ?? "APPROVED",
    });
    setSupportAssigneeSearch("");
    setSupportItemSearch(supportItemLabel(item));
  }

  async function handleAssignTicket() {
    if (!token || !supportAction.referenceId || !supportAction.assignedToUserId) return;
    setIsSaving(true);
    setError("");
    try {
      await assignPlatformSupportTicket(token, supportAction.referenceId, {
        organizationId: supportAction.organizationId ?? undefined,
        branchId: supportAction.branchId ?? undefined,
        assignedToUserId: Number(supportAction.assignedToUserId),
        remarks: supportAction.remarks.trim() || undefined,
      });
      setSupportAction(emptySupportActionState());
      setSupportItemSearch("");
      setSupportItems(await fetchPlatformSupportItems(token));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to assign support ticket.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCloseTicket() {
    if (!token || !supportAction.referenceId) return;
    setIsSaving(true);
    setError("");
    try {
      await closePlatformSupportTicket(token, supportAction.referenceId, {
        organizationId: supportAction.organizationId ?? undefined,
        branchId: supportAction.branchId ?? undefined,
        resolutionStatus: supportAction.resolutionStatus.trim(),
        diagnosisNotes: supportAction.diagnosisNotes.trim() || undefined,
        remarks: supportAction.remarks.trim() || undefined,
      });
      setSupportAction(emptySupportActionState());
      setSupportItemSearch("");
      setSupportItems(await fetchPlatformSupportItems(token));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to close support ticket.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUpdateWarrantyClaim() {
    if (!token || !supportAction.referenceId) return;
    setIsSaving(true);
    setError("");
    try {
      await updatePlatformWarrantyClaimStatus(token, supportAction.referenceId, {
        organizationId: supportAction.organizationId ?? undefined,
        branchId: supportAction.branchId ?? undefined,
        status: supportAction.status.trim(),
        approvedOn: supportAction.approvedOn || undefined,
        upstreamRouteType: supportAction.upstreamRouteType.trim() || undefined,
        upstreamCompanyName: supportAction.upstreamCompanyName.trim() || undefined,
        upstreamReferenceNumber: supportAction.upstreamReferenceNumber.trim() || undefined,
        upstreamStatus: supportAction.upstreamStatus.trim() || undefined,
        routedOn: supportAction.routedOn || undefined,
        claimNotes: supportAction.claimNotes.trim() || undefined,
      });
      setSupportAction(emptySupportActionState());
      setSupportItemSearch("");
      setSupportItems(await fetchPlatformSupportItems(token));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to update warranty claim.");
    } finally {
      setIsSaving(false);
    }
  }

  if (!canManage) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
        Your account does not have platform admin access.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Platform Admin</div>
            <h1 className="mt-1 text-2xl font-semibold text-slate-950">{activeMeta.title}</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">{activeMeta.description}</p>
          </div>
          <div className="rounded-full bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white">
            Company Admin Workspace
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {(Object.entries(tabMeta) as Array<[PlatformAdminTab, typeof activeMeta]>).map(([tab, meta]) => (
            <Link
              key={tab}
              to={meta.path}
              className={`rounded-full px-3 py-2 text-sm font-medium transition ${
                tab === initialTab ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {meta.title}
            </Link>
          ))}
        </div>
      </div>

      {error ? (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-7 text-sm text-slate-500 shadow-sm">
          Loading platform admin data...
        </div>
      ) : null}

      {!isLoading && initialTab === "overview" && overview ? (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {statCard("Stores", overview.totalStores, `${overview.activeStores} active`)}
            {statCard("Users", overview.totalUsers, `${overview.activeUsers} active`)}
            {statCard("Support", overview.openSupportItems, "Open items")}
            {statCard("Feedback", overview.feedbackItems, "Captured feedback items")}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-sm font-semibold text-slate-900">Subscriptions By Plan</div>
              <div className="mt-3">{countList(overview.subscriptionsByPlan, "No subscription data available.")}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-sm font-semibold text-slate-900">Users By Role</div>
              <div className="mt-3">{countList(overview.usersByRole, "No user role data available.")}</div>
            </div>
          </div>
        </div>
      ) : null}

      {!isLoading && initialTab === "stores" ? (
        <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-900">{storeForm.organizationId ? "Edit Store" : "Create Store"}</div>
              <button
                type="button"
                onClick={() => setStoreForm(emptyStoreForm())}
                className="text-sm text-slate-500 hover:text-slate-900"
              >
                Reset
              </button>
            </div>
            <div className="mt-4 grid gap-3">
              <label className="text-sm text-slate-700">
                Store name
                <input value={storeForm.name} onChange={(e) => setStoreForm((current) => ({ ...current, name: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" />
              </label>
              <label className="text-sm text-slate-700">
                Store code
                <input value={storeForm.code} onChange={(e) => setStoreForm((current) => ({ ...current, code: e.target.value.toUpperCase() }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" />
              </label>
              <label className="text-sm text-slate-700">
                Legal name
                <input value={storeForm.legalName} onChange={(e) => setStoreForm((current) => ({ ...current, legalName: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" />
              </label>
              <SearchablePicker
                label="Owner account"
                placeholder="Search owner accounts"
                value={storeForm.ownerAccountId}
                search={ownerAccountSearch}
                options={ownerAccountPickerOptions}
                onSearchChange={setOwnerAccountSearch}
                onValueChange={(value) => setStoreForm((current) => ({ ...current, ownerAccountId: value }))}
              />
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-sm text-slate-700">
                  Phone
                  <input value={storeForm.phone} onChange={(e) => setStoreForm((current) => ({ ...current, phone: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" />
                </label>
                <label className="text-sm text-slate-700">
                  Email
                  <input value={storeForm.email} onChange={(e) => setStoreForm((current) => ({ ...current, email: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" />
                </label>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-sm text-slate-700">
                  GSTIN
                  <input value={storeForm.gstin} onChange={(e) => setStoreForm((current) => ({ ...current, gstin: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" />
                </label>
                <label className="text-sm text-slate-700">
                  GST threshold
                  <input type="number" value={storeForm.gstThresholdAmount} onChange={(e) => setStoreForm((current) => ({ ...current, gstThresholdAmount: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" />
                </label>
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={storeForm.gstThresholdAlertEnabled} onChange={(e) => setStoreForm((current) => ({ ...current, gstThresholdAlertEnabled: e.target.checked }))} />
                GST threshold alerts enabled
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={storeForm.isActive} onChange={(e) => setStoreForm((current) => ({ ...current, isActive: e.target.checked }))} />
                Store active
              </label>
              <button type="button" onClick={() => void handleSaveStore()} disabled={isSaving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                {storeForm.organizationId ? <Save className="h-4 w-4" /> : <CirclePlus className="h-4 w-4" />}
                {storeForm.organizationId ? "Save Store" : "Create Store"}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold text-slate-900">Onboarded Stores</div>
            <DataTable className="mt-4 overflow-x-auto" columns={storeColumns} rows={stores} rowKey={(store) => store.organizationId} emptyMessage="No stores onboarded yet." />
          </div>
        </div>
      ) : null}

      {!isLoading && initialTab === "subscriptions" ? (
        <div className="grid gap-4 xl:grid-cols-[360px_360px_minmax(0,1fr)]">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold text-slate-900">Change Plan</div>
            <div className="mt-4 space-y-3">
              <SearchablePicker
                label="Store"
                placeholder="Search store"
                value={subscriptionForm.organizationId != null ? String(subscriptionForm.organizationId) : ""}
                search={subscriptionStoreSearch}
                options={subscriptionStorePickerOptions}
                onSearchChange={setSubscriptionStoreSearch}
                onValueChange={(value) => {
                  const selectedSubscription = subscriptions.find(
                    (subscription) => String(subscription.organizationId) === value,
                  );

                  setSubscriptionForm(
                    selectedSubscription
                      ? subscriptionFormFromResponse(selectedSubscription)
                      : emptySubscriptionForm(),
                  );

                  if (!selectedSubscription) {
                    setPlanSearch("");
                  }
                }}
              />
              <SearchablePicker
                label="Plan"
                placeholder="Search plans"
                value={subscriptionForm.planCode}
                search={planSearch}
                options={planPickerOptions}
                onSearchChange={setPlanSearch}
                onValueChange={(value) => setSubscriptionForm((current) => ({ ...current, planCode: value }))}
              />
              <label className="block text-sm text-slate-700">
                Status
                <input value={subscriptionForm.status} onChange={(e) => setSubscriptionForm((current) => ({ ...current, status: e.target.value.toUpperCase() }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" />
              </label>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="block text-sm text-slate-700">
                  Starts on
                  <input type="date" value={subscriptionForm.startsOn} onChange={(e) => setSubscriptionForm((current) => ({ ...current, startsOn: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" />
                </label>
                <label className="block text-sm text-slate-700">
                  Ends on
                  <input type="date" value={subscriptionForm.endsOn} onChange={(e) => setSubscriptionForm((current) => ({ ...current, endsOn: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" />
                </label>
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={subscriptionForm.autoRenew} onChange={(e) => setSubscriptionForm((current) => ({ ...current, autoRenew: e.target.checked }))} />
                Auto renew
              </label>
              <label className="block text-sm text-slate-700">
                Notes
                <textarea value={subscriptionForm.notes} onChange={(e) => setSubscriptionForm((current) => ({ ...current, notes: e.target.value }))} rows={3} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" />
              </label>
              <button type="button" onClick={() => void handleSaveSubscriptionChange()} disabled={isSaving || !subscriptionForm.organizationId} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                <Save className="h-4 w-4" />
                Save Plan Change
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold text-slate-900">Cancel Subscription</div>
            <div className="mt-4 space-y-3">
              <SearchablePicker
                label="Store"
                placeholder="Search store"
                value={cancelSubscriptionForm.organizationId != null ? String(cancelSubscriptionForm.organizationId) : ""}
                search={cancelSubscriptionStoreSearch}
                options={subscriptionStorePickerOptions}
                onSearchChange={setCancelSubscriptionStoreSearch}
                onValueChange={(value) => {
                  const selectedSubscription = subscriptions.find(
                    (subscription) => String(subscription.organizationId) === value,
                  );

                  setCancelSubscriptionForm(
                    selectedSubscription
                      ? {
                          organizationId: selectedSubscription.organizationId,
                          endsOn: selectedSubscription.endsOn ?? "",
                          notes: "",
                        }
                      : emptyCancelSubscriptionForm(),
                  );
                }}
              />
              <label className="block text-sm text-slate-700">
                Effective end date
                <input type="date" value={cancelSubscriptionForm.endsOn} onChange={(e) => setCancelSubscriptionForm((current) => ({ ...current, endsOn: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" />
              </label>
              <label className="block text-sm text-slate-700">
                Notes
                <textarea value={cancelSubscriptionForm.notes} onChange={(e) => setCancelSubscriptionForm((current) => ({ ...current, notes: e.target.value }))} rows={4} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" />
              </label>
              <button type="button" onClick={() => void handleCancelSubscription()} disabled={isSaving || !cancelSubscriptionForm.organizationId} className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 disabled:opacity-60">
                Cancel Subscription
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold text-slate-900">Store Subscriptions</div>
            <DataTable
              className="mt-4 overflow-x-auto"
              columns={subscriptionColumns}
              rows={subscriptions}
              rowKey={(subscription) => subscription.organizationId}
              emptyMessage="No subscriptions found."
            />
          </div>
        </div>
      ) : null}

      {!isLoading && initialTab === "plans" ? (
        <div className="grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-900">{planForm.planId ? "Edit Plan" : "Create Plan"}</div>
              <button type="button" onClick={() => beginEditPlan(null)} className="text-sm text-slate-500 hover:text-slate-900">Reset</button>
            </div>
            <div className="mt-4 grid gap-3">
              <label className="block text-sm text-slate-700">
                Plan code
                <input value={planForm.code} onChange={(e) => setPlanForm((current) => ({ ...current, code: e.target.value.toUpperCase() }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" />
              </label>
              <label className="block text-sm text-slate-700">
                Plan name
                <input value={planForm.name} onChange={(e) => setPlanForm((current) => ({ ...current, name: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" />
              </label>
              <label className="block text-sm text-slate-700">
                Billing period
                <input value={planForm.billingPeriod} onChange={(e) => setPlanForm((current) => ({ ...current, billingPeriod: e.target.value.toUpperCase() }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" />
              </label>
              <label className="block text-sm text-slate-700">
                Max organizations
                <input type="number" value={planForm.maxOrganizations} onChange={(e) => setPlanForm((current) => ({ ...current, maxOrganizations: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" />
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={planForm.unlimitedOrganizations} onChange={(e) => setPlanForm((current) => ({ ...current, unlimitedOrganizations: e.target.checked }))} />
                Unlimited organizations
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={planForm.active} onChange={(e) => setPlanForm((current) => ({ ...current, active: e.target.checked }))} />
                Plan active
              </label>
              <label className="block text-sm text-slate-700">
                Description
                <textarea value={planForm.description} onChange={(e) => setPlanForm((current) => ({ ...current, description: e.target.value }))} rows={4} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" />
              </label>
              <button type="button" onClick={() => void handleSavePlan()} disabled={isSaving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                <Save className="h-4 w-4" />
                Save Plan
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-sm font-semibold text-slate-900">Plan Catalog</div>
              <DataTable className="mt-4 overflow-x-auto" columns={planColumns} rows={plans} rowKey={(plan) => plan.id} emptyMessage="No plans configured." />
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-sm font-semibold text-slate-900">Feature Matrix</div>
              <div className="mt-4 grid gap-3">
                {planForm.features.map((feature, index) => (
                  <div key={feature.featureCode} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-slate-900">{feature.name}</div>
                        <div className="text-xs text-slate-500">{feature.featureCode}{feature.moduleCode ? ` · ${feature.moduleCode}` : ""}</div>
                        {feature.description ? <div className="mt-1 text-xs text-slate-500">{feature.description}</div> : null}
                      </div>
                      <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                        <input type="checkbox" checked={feature.enabled} onChange={(e) => setPlanForm((current) => ({ ...current, features: current.features.map((item, itemIndex) => itemIndex === index ? { ...item, enabled: e.target.checked } : item) }))} />
                        Enabled
                      </label>
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <label className="block text-sm text-slate-700">
                        Limit
                        <input type="number" value={feature.featureLimit} onChange={(e) => setPlanForm((current) => ({ ...current, features: current.features.map((item, itemIndex) => itemIndex === index ? { ...item, featureLimit: e.target.value } : item) }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" />
                      </label>
                      <label className="block text-sm text-slate-700">
                        Config JSON
                        <input value={feature.configJson} onChange={(e) => setPlanForm((current) => ({ ...current, features: current.features.map((item, itemIndex) => itemIndex === index ? { ...item, configJson: e.target.value } : item) }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {!isLoading && initialTab === "teams" ? (
        <div className="grid gap-4 xl:grid-cols-[400px_minmax(0,1fr)]">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-900">Edit Team Member</div>
              <button type="button" onClick={() => { setTeamForm(emptyTeamForm()); setBranchOptions([]); setRoleSearch(""); setDefaultBranchSearch(""); setTeamMemberSearch(""); }} className="text-sm text-slate-500 hover:text-slate-900">Reset</button>
            </div>
            <div className="mt-4 grid gap-3">
              <SearchablePicker
                label="Team member"
                placeholder="Search team member"
                value={
                  teamForm.userId != null && teamForm.organizationId != null
                    ? `${teamForm.organizationId}:${teamForm.userId}`
                    : ""
                }
                search={teamMemberSearch}
                options={teamMemberPickerOptions}
                onSearchChange={setTeamMemberSearch}
                onValueChange={(value) => {
                  const [organizationIdValue, userIdValue] = value.split(":");
                  const selectedMember = teams.find(
                    (member) =>
                      String(member.organizationId) === organizationIdValue &&
                      String(member.userId) === userIdValue,
                  );

                  if (selectedMember) {
                    void handleEditTeam(selectedMember);
                  } else {
                    setTeamForm(emptyTeamForm());
                    setBranchOptions([]);
                    setRoleSearch("");
                    setDefaultBranchSearch("");
                  }
                }}
              />
              <label className="block text-sm text-slate-700">
                Full name
                <input value={teamForm.fullName} onChange={(e) => setTeamForm((current) => ({ ...current, fullName: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" />
              </label>
              <label className="block text-sm text-slate-700">
                Email
                <input value={teamForm.email} onChange={(e) => setTeamForm((current) => ({ ...current, email: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" />
              </label>
              <label className="block text-sm text-slate-700">
                Phone
                <input value={teamForm.phone} onChange={(e) => setTeamForm((current) => ({ ...current, phone: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" />
              </label>
              <label className="block text-sm text-slate-700">
                Employee code
                <input value={teamForm.employeeCode} onChange={(e) => setTeamForm((current) => ({ ...current, employeeCode: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" />
              </label>
              <SearchablePicker
                label="Role"
                placeholder="Search roles"
                value={teamForm.roleCode}
                search={roleSearch}
                options={rolePickerOptions}
                onSearchChange={setRoleSearch}
                onValueChange={(value) => setTeamForm((current) => ({ ...current, roleCode: value }))}
              />
              <SearchablePicker
                label="Default branch"
                placeholder="Search branches"
                value={teamForm.defaultBranchId}
                search={defaultBranchSearch}
                options={branchPickerOptions}
                onSearchChange={setDefaultBranchSearch}
                onValueChange={(value) => setTeamForm((current) => ({ ...current, defaultBranchId: value }))}
              />
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Branch Access</div>
                <div className="space-y-2 rounded-xl border border-slate-200 p-3">
                  {branchOptions.length > 0 ? branchOptions.map((branch) => {
                    const checked = teamForm.branchIds.includes(String(branch.id));
                    return (
                      <label key={branch.id} className="flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            setTeamForm((current) => ({
                              ...current,
                              branchIds: e.target.checked
                                ? [...current.branchIds, String(branch.id)]
                                : current.branchIds.filter((value) => value !== String(branch.id)),
                            }))
                          }
                        />
                        {branch.name} ({branch.code})
                      </label>
                    );
                  }) : <div className="text-sm text-slate-500">Branch options will load when you pick a member.</div>}
                </div>
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={teamForm.active} onChange={(e) => setTeamForm((current) => ({ ...current, active: e.target.checked }))} />
                Team member active
              </label>
              <button type="button" onClick={() => void handleSaveTeam()} disabled={isSaving || !teamForm.userId} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                <Save className="h-4 w-4" />
                Save Team Member
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold text-slate-900">Store Teams</div>
            <DataTable className="mt-4 overflow-x-auto" columns={teamColumns} rows={teams} rowKey={(member) => `${member.organizationId}-${member.userId}`} emptyMessage="No team members found." />
          </div>
        </div>
      ) : null}

      {!isLoading && initialTab === "support" ? (
        <div className="grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold text-slate-900">Support Action</div>
            <div className="mt-4 space-y-3">
              <SearchablePicker
                label="Queue item"
                placeholder="Search support item"
                value={
                  supportAction.referenceId != null && supportAction.itemType
                    ? `${supportAction.itemType}:${supportAction.referenceId}`
                    : ""
                }
                search={supportItemSearch}
                options={supportItemPickerOptions}
                onSearchChange={setSupportItemSearch}
                onValueChange={(value) => {
                  const [itemTypeValue, referenceIdValue] = value.split(":");
                  const selectedItem = supportItems.find(
                    (item) =>
                      item.itemType === itemTypeValue &&
                      String(item.referenceId) === referenceIdValue,
                  );

                  if (selectedItem) {
                    beginSupportAction(selectedItem);
                  } else {
                    setSupportAction(emptySupportActionState());
                  }
                }}
              />
              {supportAction.itemType.toLowerCase().includes("warranty") ? (
                <>
                  <label className="block text-sm text-slate-700">
                    Claim status
                    <input value={supportAction.status} onChange={(e) => setSupportAction((current) => ({ ...current, status: e.target.value.toUpperCase() }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" />
                  </label>
                  <label className="block text-sm text-slate-700">
                    Approved on
                    <input type="date" value={supportAction.approvedOn} onChange={(e) => setSupportAction((current) => ({ ...current, approvedOn: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" />
                  </label>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="block text-sm text-slate-700">
                      Upstream route type
                      <input value={supportAction.upstreamRouteType} onChange={(e) => setSupportAction((current) => ({ ...current, upstreamRouteType: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" />
                    </label>
                    <label className="block text-sm text-slate-700">
                      Upstream company
                      <input value={supportAction.upstreamCompanyName} onChange={(e) => setSupportAction((current) => ({ ...current, upstreamCompanyName: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" />
                    </label>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="block text-sm text-slate-700">
                      Reference number
                      <input value={supportAction.upstreamReferenceNumber} onChange={(e) => setSupportAction((current) => ({ ...current, upstreamReferenceNumber: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" />
                    </label>
                    <label className="block text-sm text-slate-700">
                      Upstream status
                      <input value={supportAction.upstreamStatus} onChange={(e) => setSupportAction((current) => ({ ...current, upstreamStatus: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" />
                    </label>
                  </div>
                  <label className="block text-sm text-slate-700">
                    Routed on
                    <input type="date" value={supportAction.routedOn} onChange={(e) => setSupportAction((current) => ({ ...current, routedOn: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" />
                  </label>
                  <label className="block text-sm text-slate-700">
                    Claim notes
                    <textarea value={supportAction.claimNotes} onChange={(e) => setSupportAction((current) => ({ ...current, claimNotes: e.target.value }))} rows={4} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" />
                  </label>
                  <button type="button" onClick={() => void handleUpdateWarrantyClaim()} disabled={isSaving || !supportAction.referenceId} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                    <Save className="h-4 w-4" />
                    Update Claim
                  </button>
                </>
              ) : (
                <>
                  <SearchablePicker
                    label="Assign to"
                    placeholder="Search team member"
                    value={supportAction.assignedToUserId}
                    search={supportAssigneeSearch}
                    options={assigneeOptions}
                    onSearchChange={setSupportAssigneeSearch}
                    onValueChange={(value) => setSupportAction((current) => ({ ...current, assignedToUserId: value }))}
                  />
                  <label className="block text-sm text-slate-700">
                    Resolution status
                    <input value={supportAction.resolutionStatus} onChange={(e) => setSupportAction((current) => ({ ...current, resolutionStatus: e.target.value.toUpperCase() }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" />
                  </label>
                  <label className="block text-sm text-slate-700">
                    Diagnosis notes
                    <textarea value={supportAction.diagnosisNotes} onChange={(e) => setSupportAction((current) => ({ ...current, diagnosisNotes: e.target.value }))} rows={3} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" />
                  </label>
                  <label className="block text-sm text-slate-700">
                    Remarks
                    <textarea value={supportAction.remarks} onChange={(e) => setSupportAction((current) => ({ ...current, remarks: e.target.value }))} rows={3} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" />
                  </label>
                  <div className="grid gap-2 md:grid-cols-2">
                    <button type="button" onClick={() => void handleAssignTicket()} disabled={isSaving || !supportAction.referenceId || !supportAction.assignedToUserId} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60">
                      Assign Ticket
                    </button>
                    <button type="button" onClick={() => void handleCloseTicket()} disabled={isSaving || !supportAction.referenceId} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                      Close Ticket
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold text-slate-900">Support Queue</div>
            <DataTable
              className="mt-4 overflow-x-auto"
              columns={supportColumns}
              rows={supportItems}
              rowKey={(item) => `${item.itemType}-${item.referenceId}`}
              emptyMessage="No support items in queue."
            />
          </div>
        </div>
      ) : null}

      {!isLoading && initialTab === "feedback" ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-slate-900">Captured Feedback</div>
          <DataTable
            className="mt-4 overflow-x-auto"
            columns={feedbackColumns}
            rows={feedback}
            rowKey={(item) => `${item.serviceVisitId}-${item.serviceTicketId}`}
            emptyMessage="No feedback records found."
          />
        </div>
      ) : null}

      {!isLoading && initialTab === "operations" ? (
        <div className="space-y-4">
          {systemHealth ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {statCard("Notifications", systemHealth.totalNotifications, `${systemHealth.pendingNotifications} pending`)}
              {statCard("Failed Notifications", systemHealth.failedNotifications)}
              {statCard("Unread", systemHealth.unreadNotifications)}
              {statCard("Audit Events", systemHealth.totalAuditEvents)}
            </div>
          ) : null}

          {reports ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-sm font-semibold text-slate-900">Stores By Status</div>
                <div className="mt-3">{countList(reports.storesByStatus, "No store status data available.")}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-sm font-semibold text-slate-900">Subscriptions By Plan</div>
                <div className="mt-3">{countList(reports.subscriptionsByPlan, "No subscription data available.")}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-sm font-semibold text-slate-900">Users By Role</div>
                <div className="mt-3">{countList(reports.usersByRole, "No role usage data available.")}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-sm font-semibold text-slate-900">Support By Status</div>
                <div className="mt-3">{countList(reports.supportItemsByStatus, "No support data available.")}</div>
              </div>
            </div>
          ) : null}

          <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-sm font-semibold text-slate-900">Recent Notifications</div>
              <div className="mt-4 space-y-3">
                {notifications.slice(0, 8).map((item) => (
                  <div key={item.id} className="rounded-lg border border-slate-100 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium text-slate-900">{item.title ?? item.type ?? "Notification"}</div>
                      <div className="text-xs font-semibold text-slate-500">{item.status ?? "Unknown"}</div>
                    </div>
                    <div className="mt-1 text-sm text-slate-600">{item.recipient ?? "No recipient"}</div>
                    <div className="mt-1 text-xs text-slate-500">{formatDateTime(item.createdAt)}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-sm font-semibold text-slate-900">Recent Audit Activity</div>
              <div className="mt-4 space-y-3">
                {auditItems.slice(0, 8).map((item) => (
                  <div key={item.id} className="rounded-lg border border-slate-100 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium text-slate-900">{item.summary ?? item.action ?? "Audit activity"}</div>
                      <div className="text-xs text-slate-500">{formatDateTime(item.occurredAt)}</div>
                    </div>
                    <div className="mt-1 text-sm text-slate-600">
                      {item.actorNameSnapshot ?? "Unknown actor"} · {item.entityType ?? "entity"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
