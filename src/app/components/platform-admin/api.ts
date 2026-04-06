import { apiRequest, createIdempotencyKey } from "../../lib/api";

interface ErpApiResponse<T> {
  success: boolean;
  data: T;
  message: string | null;
  timestamp: string;
}

async function platformRequest<T>(
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

export interface CountByLabel {
  label: string;
  count: number;
}

export interface SubscriptionCountByPlan {
  planCode: string;
  planName: string;
  count: number;
}

export interface PlatformOverviewResponse {
  totalStores: number;
  activeStores: number;
  totalOwnerAccounts: number;
  totalUsers: number;
  activeUsers: number;
  openSupportItems: number;
  feedbackItems: number;
  activeReportSchedules: number;
  subscriptionsByPlan: SubscriptionCountByPlan[];
  usersByRole: CountByLabel[];
}

export interface PlatformStoreResponse {
  organizationId: number;
  organizationCode: string;
  organizationName: string;
  ownerAccountId: number | null;
  active: boolean | null;
  branchCount: number;
  warehouseCount: number;
  teamCount: number;
  currentPlanCode: string | null;
  currentPlanName: string | null;
  currentSubscriptionStatus: string | null;
  subscriptionVersion: number | null;
  subscriptionStartsOn: string | null;
  subscriptionEndsOn: string | null;
}

export interface PlatformStoreUpsertPayload {
  name: string;
  code: string;
  legalName?: string;
  phone?: string;
  email?: string;
  gstin?: string;
  ownerAccountId: number;
  gstThresholdAmount?: number;
  gstThresholdAlertEnabled?: boolean;
  isActive?: boolean;
}

export interface PlatformSubscriptionResponse {
  organizationId: number;
  organizationCode: string;
  organizationName: string;
  ownerAccountId: number | null;
  planCode: string | null;
  planName: string | null;
  status: string | null;
  startsOn: string | null;
  endsOn: string | null;
  autoRenew: boolean | null;
  maxOrganizations: number | null;
  unlimitedOrganizations: boolean | null;
  organizationsUsed: number | null;
}

export interface PlatformSubscriptionChangePayload {
  planCode: string;
  status?: string;
  startsOn?: string;
  endsOn?: string;
  autoRenew?: boolean;
  notes?: string;
}

export interface PlatformSubscriptionCancelPayload {
  endsOn?: string;
  notes?: string;
}

export interface SubscriptionFeatureResponse {
  code: string;
  name: string;
  moduleCode: string | null;
  description: string | null;
  enabled: boolean | null;
  featureLimit: number | null;
}

export interface SubscriptionPlanResponse {
  id: number;
  code: string;
  name: string;
  description: string | null;
  billingPeriod: string;
  maxOrganizations: number | null;
  unlimitedOrganizations: boolean | null;
  active: boolean | null;
  featureCodes: string[];
  features: SubscriptionFeatureResponse[];
}

export interface PlatformSubscriptionPlanUpsertPayload {
  code: string;
  name: string;
  description?: string;
  billingPeriod: string;
  maxOrganizations?: number;
  unlimitedOrganizations?: boolean;
  active?: boolean;
}

export interface PlatformSubscriptionPlanFeatureAssignmentPayload {
  featureCode: string;
  enabled?: boolean;
  featureLimit?: number;
  configJson?: string;
}

export interface PlatformTeamMemberSummaryResponse {
  organizationId: number;
  organizationCode: string;
  organizationName: string;
  userId: number;
  accountId: number | null;
  personId: number | null;
  username: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  roleCode: string | null;
  roleName: string | null;
  employeeCode: string | null;
  defaultBranchId: number | null;
  active: boolean | null;
  createdAt: string;
}

export interface PlatformBranchAccessSummary {
  branchId: number;
  isDefault: boolean | null;
}

export interface PlatformTeamMemberResponse {
  id: number;
  organizationId: number;
  accountId: number | null;
  personId: number | null;
  username: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  roleCode: string | null;
  roleName: string | null;
  employeeCode: string | null;
  defaultBranchId: number | null;
  branchAccess: PlatformBranchAccessSummary[];
  active: boolean | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformTeamMemberUpdatePayload {
  fullName?: string;
  email?: string;
  phone?: string;
  roleCode?: string;
  employeeCode?: string;
  defaultBranchId?: number;
  branchIds?: number[];
  active?: boolean;
}

export interface PlatformSupportItemResponse {
  itemType: string;
  organizationId: number;
  organizationCode: string;
  organizationName: string;
  branchId: number | null;
  referenceId: number;
  referenceNumber: string | null;
  status: string | null;
  priorityOrType: string | null;
  summary: string | null;
  eventDate: string | null;
}

export interface PlatformAssignSupportTicketPayload {
  organizationId?: number;
  branchId?: number;
  assignedToUserId: number;
  remarks?: string;
}

export interface PlatformCloseSupportTicketPayload {
  organizationId?: number;
  branchId?: number;
  resolutionStatus: string;
  diagnosisNotes?: string;
  remarks?: string;
}

export interface PlatformUpdateWarrantyClaimStatusPayload {
  organizationId?: number;
  branchId?: number;
  status: string;
  approvedOn?: string;
  upstreamRouteType?: string;
  upstreamCompanyName?: string;
  upstreamReferenceNumber?: string;
  upstreamStatus?: string;
  routedOn?: string;
  claimNotes?: string;
}

export interface PlatformFeedbackResponse {
  organizationId: number;
  organizationCode: string;
  organizationName: string;
  serviceVisitId: number;
  serviceTicketId: number;
  visitStatus: string | null;
  scheduledAt: string | null;
  completedAt: string | null;
  customerFeedback: string | null;
}

export interface PlatformNotificationResponse {
  id: number;
  notificationId: string | null;
  type: string | null;
  channel: string | null;
  status: string | null;
  priority: string | null;
  title: string | null;
  recipient: string | null;
  referenceType: string | null;
  referenceId: number | null;
  scheduledFor: string | null;
  sentAt: string | null;
  createdAt: string | null;
  retryCount: number | null;
  errorMessage: string | null;
}

export interface PlatformAuditActivityResponse {
  id: number;
  organizationId: number | null;
  branchId: number | null;
  eventType: string | null;
  entityType: string | null;
  entityId: number | null;
  entityNumber: string | null;
  action: string | null;
  actorUserId: number | null;
  actorNameSnapshot: string | null;
  actorRoleSnapshot: string | null;
  summary: string | null;
  occurredAt: string | null;
}

export interface PlatformSystemHealthResponse {
  totalNotifications: number;
  pendingNotifications: number;
  failedNotifications: number;
  unreadNotifications: number;
  activeReportSchedules: number;
  totalAuditEvents: number;
  notificationsByStatus: CountByLabel[];
  notificationsByType: CountByLabel[];
}

export interface PlatformReportsResponse {
  storesByStatus: CountByLabel[];
  subscriptionsByPlan: SubscriptionCountByPlan[];
  usersByRole: CountByLabel[];
  supportItemsByStatus: CountByLabel[];
  feedbackByVisitStatus: CountByLabel[];
  activeReportSchedules: number;
}

export async function fetchPlatformOverview(token: string) {
  return platformRequest<PlatformOverviewResponse>("/api/platform-admin/overview", token);
}

export async function fetchPlatformStores(token: string) {
  return platformRequest<PlatformStoreResponse[]>("/api/platform-admin/stores", token);
}

export async function fetchPlatformStore(token: string, organizationId: number) {
  return platformRequest<PlatformStoreResponse>(`/api/platform-admin/stores/${organizationId}`, token);
}

export async function createPlatformStore(token: string, payload: PlatformStoreUpsertPayload) {
  return platformRequest<PlatformStoreResponse>("/api/platform-admin/stores", token, {
    method: "POST",
    idempotencyKey: createIdempotencyKey("platform-store:create", payload),
    body: JSON.stringify(payload),
  });
}

export async function updatePlatformStore(token: string, organizationId: number, payload: PlatformStoreUpsertPayload) {
  return platformRequest<PlatformStoreResponse>(`/api/platform-admin/stores/${organizationId}`, token, {
    method: "PUT",
    idempotencyKey: createIdempotencyKey("platform-store:update", { organizationId, ...payload }),
    body: JSON.stringify(payload),
  });
}

export async function updatePlatformStoreStatus(token: string, organizationId: number, active: boolean) {
  return platformRequest<PlatformStoreResponse>(`/api/platform-admin/stores/${organizationId}/status`, token, {
    method: "PUT",
    idempotencyKey: createIdempotencyKey("platform-store:status", { organizationId, active }),
    body: JSON.stringify({ active }),
  });
}

export async function fetchPlatformSubscriptions(token: string) {
  return platformRequest<PlatformSubscriptionResponse[]>("/api/platform-admin/subscriptions", token);
}

export async function changePlatformSubscriptionPlan(
  token: string,
  organizationId: number,
  payload: PlatformSubscriptionChangePayload,
) {
  return platformRequest<PlatformSubscriptionResponse>(
    `/api/platform-admin/subscriptions/organizations/${organizationId}/change-plan`,
    token,
    {
      method: "POST",
      idempotencyKey: createIdempotencyKey("platform-subscription:change-plan", {
        organizationId,
        ...payload,
      }),
      body: JSON.stringify(payload),
    },
  );
}

export async function cancelPlatformSubscription(
  token: string,
  organizationId: number,
  payload: PlatformSubscriptionCancelPayload,
) {
  return platformRequest<PlatformSubscriptionResponse>(
    `/api/platform-admin/subscriptions/organizations/${organizationId}/cancel`,
    token,
    {
      method: "POST",
      idempotencyKey: createIdempotencyKey("platform-subscription:cancel", {
        organizationId,
        ...payload,
      }),
      body: JSON.stringify(payload),
    },
  );
}

export async function fetchPlatformPlans(token: string) {
  return platformRequest<SubscriptionPlanResponse[]>("/api/platform-admin/plans-features", token);
}

export async function createPlatformPlan(token: string, payload: PlatformSubscriptionPlanUpsertPayload) {
  return platformRequest<SubscriptionPlanResponse>("/api/platform-admin/plans-features/plans", token, {
    method: "POST",
    idempotencyKey: createIdempotencyKey("platform-plan:create", payload),
    body: JSON.stringify(payload),
  });
}

export async function updatePlatformPlan(
  token: string,
  planId: number,
  payload: PlatformSubscriptionPlanUpsertPayload,
) {
  return platformRequest<SubscriptionPlanResponse>(`/api/platform-admin/plans-features/plans/${planId}`, token, {
    method: "PUT",
    idempotencyKey: createIdempotencyKey("platform-plan:update", { planId, ...payload }),
    body: JSON.stringify(payload),
  });
}

export async function updatePlatformPlanFeatures(
  token: string,
  planId: number,
  items: PlatformSubscriptionPlanFeatureAssignmentPayload[],
) {
  return platformRequest<SubscriptionPlanResponse>(
    `/api/platform-admin/plans-features/plans/${planId}/features`,
    token,
    {
      method: "PUT",
      idempotencyKey: createIdempotencyKey("platform-plan:features", { planId, items }),
      body: JSON.stringify({ items }),
    },
  );
}

export async function fetchPlatformStoreTeams(token: string) {
  return platformRequest<PlatformTeamMemberSummaryResponse[]>("/api/platform-admin/store-teams", token);
}

export async function fetchPlatformStoreTeamMember(token: string, organizationId: number, userId: number) {
  return platformRequest<PlatformTeamMemberResponse>(
    `/api/platform-admin/store-teams/${userId}?organizationId=${organizationId}`,
    token,
  );
}

export async function updatePlatformStoreTeamMember(
  token: string,
  organizationId: number,
  userId: number,
  payload: PlatformTeamMemberUpdatePayload,
) {
  return platformRequest<PlatformTeamMemberResponse>(
    `/api/platform-admin/store-teams/${userId}?organizationId=${organizationId}`,
    token,
    {
      method: "PUT",
      idempotencyKey: createIdempotencyKey("platform-team:update", { organizationId, userId, ...payload }),
      body: JSON.stringify(payload),
    },
  );
}

export async function updatePlatformStoreTeamMemberStatus(
  token: string,
  organizationId: number,
  userId: number,
  active: boolean,
) {
  return platformRequest<PlatformTeamMemberResponse>(
    `/api/platform-admin/store-teams/${userId}/status?organizationId=${organizationId}`,
    token,
    {
      method: "PUT",
      idempotencyKey: createIdempotencyKey("platform-team:status", { organizationId, userId, active }),
      body: JSON.stringify({ active }),
    },
  );
}

export async function fetchPlatformSupportItems(token: string) {
  return platformRequest<PlatformSupportItemResponse[]>("/api/platform-admin/support-grievances", token);
}

export async function assignPlatformSupportTicket(
  token: string,
  ticketId: number,
  payload: PlatformAssignSupportTicketPayload,
) {
  return platformRequest<void>(`/api/platform-admin/support-grievances/service-tickets/${ticketId}/assign`, token, {
    method: "POST",
    idempotencyKey: createIdempotencyKey("platform-support:assign", { ticketId, ...payload }),
    body: JSON.stringify(payload),
  });
}

export async function closePlatformSupportTicket(
  token: string,
  ticketId: number,
  payload: PlatformCloseSupportTicketPayload,
) {
  return platformRequest<void>(`/api/platform-admin/support-grievances/service-tickets/${ticketId}/close`, token, {
    method: "POST",
    idempotencyKey: createIdempotencyKey("platform-support:close", { ticketId, ...payload }),
    body: JSON.stringify(payload),
  });
}

export async function updatePlatformWarrantyClaimStatus(
  token: string,
  claimId: number,
  payload: PlatformUpdateWarrantyClaimStatusPayload,
) {
  return platformRequest<void>(`/api/platform-admin/support-grievances/warranty-claims/${claimId}/status`, token, {
    method: "POST",
    idempotencyKey: createIdempotencyKey("platform-support:warranty-claim", { claimId, ...payload }),
    body: JSON.stringify(payload),
  });
}

export async function fetchPlatformFeedback(token: string) {
  return platformRequest<PlatformFeedbackResponse[]>("/api/platform-admin/feedback", token);
}

export async function fetchPlatformNotifications(token: string) {
  return platformRequest<PlatformNotificationResponse[]>("/api/platform-admin/notifications", token);
}

export async function fetchPlatformAuditActivity(token: string) {
  return platformRequest<PlatformAuditActivityResponse[]>("/api/platform-admin/audit-activity", token);
}

export async function fetchPlatformSystemHealth(token: string) {
  return platformRequest<PlatformSystemHealthResponse>("/api/platform-admin/system-health", token);
}

export async function fetchPlatformReports(token: string) {
  return platformRequest<PlatformReportsResponse>("/api/platform-admin/reports", token);
}
