import { apiRequest } from "../../lib/api";

interface ErpApiResponse<T> {
  success: boolean;
  data: T;
  message: string | null;
  timestamp: string;
}

export interface ReportScheduleResponse {
  id: number;
  scheduleId: string;
  scheduleName: string;
  reportType: string;
  format: string;
  createdBy: string | null;
  frequency: string;
  cronExpression: string | null;
  startDate: string | null;
  endDate: string | null;
  lastRunDate: string | null;
  nextRunDate: string | null;
  parameters: Record<string, string> | null;
  recipients: string | null;
  isActive: boolean;
  successCount: number;
  failureCount: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface PageResponse<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
}

export interface WorkflowTriggerItemResponse {
  triggerType: string;
  severity: string;
  title: string;
  message: string;
  referenceType: string | null;
  referenceId: number | null;
  amount: number | null;
  dueDate: string | null;
  data: Record<string, unknown> | null;
}

export interface WorkflowTriggerReviewResponse {
  organizationId: number;
  asOfDate: string;
  totalTriggers: number;
  criticalCount: number;
  warningCount: number;
  triggers: WorkflowTriggerItemResponse[];
}

export interface WorkflowTriggerDispatchResponse {
  organizationId: number;
  asOfDate: string;
  reviewedCount: number;
  dispatchedCount: number;
  dispatched: WorkflowTriggerItemResponse[];
}

export interface ScheduleReportRequest {
  scheduleName: string;
  reportType: string;
  format: string;
  frequency: string;
  cronExpression?: string;
  startDate?: string;
  endDate?: string;
  parameters?: Record<string, string>;
  recipients?: string;
  description?: string;
}

function query(params: Record<string, string | number | undefined | null>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  });
  return search.toString();
}

export async function fetchReportSchedules(token: string, page = 0, size = 20) {
  return apiRequest<PageResponse<ReportScheduleResponse>>(
    `/api/report-schedules?${query({ page, size, sort: "createdAt,desc" })}`,
    { method: "GET", token },
  );
}

export async function createReportSchedule(token: string, payload: ScheduleReportRequest) {
  return apiRequest<ReportScheduleResponse>("/api/report-schedules", {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

export async function executeReportSchedule(token: string, id: number) {
  return apiRequest<void>(`/api/report-schedules/${id}/execute`, {
    method: "POST",
    token,
  });
}

export async function activateReportSchedule(token: string, id: number) {
  return apiRequest<void>(`/api/report-schedules/${id}/activate`, {
    method: "PUT",
    token,
  });
}

export async function deactivateReportSchedule(token: string, id: number) {
  return apiRequest<void>(`/api/report-schedules/${id}/deactivate`, {
    method: "PUT",
    token,
  });
}

export async function deleteReportSchedule(token: string, id: number) {
  return apiRequest<void>(`/api/report-schedules/${id}`, {
    method: "DELETE",
    token,
  });
}

export async function fetchWorkflowReview(
  token: string,
  organizationId?: number,
  asOfDate?: string,
) {
  const response = await apiRequest<ErpApiResponse<WorkflowTriggerReviewResponse>>(
    `/api/erp/workflow-triggers/review?${query({ organizationId, asOfDate })}`,
    { method: "GET", token },
  );
  return response.data;
}

export async function dispatchWorkflowTriggers(
  token: string,
  organizationId?: number,
  asOfDate?: string,
) {
  const response = await apiRequest<ErpApiResponse<WorkflowTriggerDispatchResponse>>(
    `/api/erp/workflow-triggers/dispatch?${query({ organizationId, asOfDate })}`,
    { method: "POST", token },
  );
  return response.data;
}
