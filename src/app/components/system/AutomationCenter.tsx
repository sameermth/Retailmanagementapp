import { AlertCircle, PlayCircle, RefreshCcw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "../../auth";
import {
  activateReportSchedule,
  createReportSchedule,
  deactivateReportSchedule,
  deleteReportSchedule,
  dispatchWorkflowTriggers,
  executeReportSchedule,
  fetchReportSchedules,
  fetchWorkflowReview,
  type ReportScheduleResponse,
  type ScheduleReportRequest,
  type WorkflowTriggerReviewResponse,
} from "./api";

const reportTypeOptions = [
  "SALES_SUMMARY",
  "SALES_DETAILED",
  "TOP_PRODUCTS",
  "INVENTORY_SUMMARY",
  "LOW_STOCK_REPORT",
  "PURCHASE_SUMMARY",
  "PROFIT_LOSS",
  "EXPENSE_SUMMARY",
  "TAX_REPORT",
  "CUSTOMER_DUES",
  "AUDIT_TRAIL",
];

const formatOptions = ["PDF", "EXCEL", "CSV", "HTML", "JSON"];
const frequencyOptions = ["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY", "CUSTOM"];

function toLocalDateTimeValue(date = new Date()) {
  const copy = new Date(date);
  copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset());
  return copy.toISOString().slice(0, 16);
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "Not scheduled";
  }

  return new Date(value).toLocaleString("en-IN");
}

function formatDate(value?: string | null) {
  if (!value) {
    return "No due date";
  }

  return new Date(value).toLocaleDateString("en-IN");
}

export function AutomationCenter() {
  const { token, user, hasAnyPermission } = useAuth();
  const [schedules, setSchedules] = useState<ReportScheduleResponse[]>([]);
  const [workflowReview, setWorkflowReview] = useState<WorkflowTriggerReviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState<ScheduleReportRequest>({
    scheduleName: "",
    reportType: "SALES_SUMMARY",
    format: "PDF",
    frequency: "WEEKLY",
    cronExpression: "",
    startDate: toLocalDateTimeValue(),
    endDate: "",
    recipients: user?.email ?? "",
    description: "",
  });

  const canManageSchedules = hasAnyPermission([
    "report-schedules.write",
    "report-schedules.manage",
    "automation.manage",
    "ROLE_ADMIN",
    "ROLE_MANAGER",
  ]);
  const canDispatchWorkflow = hasAnyPermission([
    "approval.manage",
    "erp.workflow.dispatch",
    "automation.manage",
    "ROLE_ADMIN",
    "ROLE_MANAGER",
  ]);

  async function loadAutomationData() {
    if (!token) {
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const [schedulePage, review] = await Promise.all([
        fetchReportSchedules(token),
        fetchWorkflowReview(token, user?.organizationId ?? undefined, new Date().toISOString().slice(0, 10)),
      ]);
      setSchedules(schedulePage.content ?? []);
      setWorkflowReview(review);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load automation center.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadAutomationData();
  }, [token, user?.organizationId]);

  useEffect(() => {
    setForm((current) => ({
      ...current,
      recipients: current.recipients || user?.email || "",
    }));
  }, [user?.email]);

  async function handleCreateSchedule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      return;
    }

    setIsSubmitting(true);
    setError("");
    setNotice("");

    try {
      await createReportSchedule(token, {
        ...form,
        cronExpression: form.frequency === "CUSTOM" ? form.cronExpression || undefined : undefined,
        endDate: form.endDate || undefined,
        description: form.description || undefined,
        recipients: form.recipients || undefined,
      });
      setNotice("Report schedule created.");
      setForm({
        scheduleName: "",
        reportType: "SALES_SUMMARY",
        format: "PDF",
        frequency: "WEEKLY",
        cronExpression: "",
        startDate: toLocalDateTimeValue(),
        endDate: "",
        recipients: user?.email ?? "",
        description: "",
      });
      await loadAutomationData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create report schedule.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function runScheduleAction(action: () => Promise<void>, successMessage: string) {
    setError("");
    setNotice("");
    try {
      await action();
      setNotice(successMessage);
      await loadAutomationData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Schedule action failed.");
    }
  }

  async function handleDispatch() {
    if (!token) {
      return;
    }

    setError("");
    setNotice("");
    try {
      const response = await dispatchWorkflowTriggers(
        token,
        user?.organizationId ?? undefined,
        new Date().toISOString().slice(0, 10),
      );
      setNotice(`Workflow dispatch completed. ${response.dispatchedCount} trigger(s) dispatched.`);
      await loadAutomationData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to dispatch workflow triggers.");
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          System
        </div>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">Automation</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          This screen now uses the current backend automation flow for report schedules and ERP
          workflow trigger review instead of the old placeholder page.
        </p>
      </section>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {notice && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {notice}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Total Schedules
          </div>
          <div className="mt-4 text-3xl font-semibold text-slate-950">
            {isLoading ? "..." : schedules.length}
          </div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Active Schedules
          </div>
          <div className="mt-4 text-3xl font-semibold text-slate-950">
            {isLoading ? "..." : schedules.filter((schedule) => schedule.isActive).length}
          </div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Workflow Triggers
          </div>
          <div className="mt-4 text-3xl font-semibold text-slate-950">
            {isLoading ? "..." : workflowReview?.totalTriggers ?? 0}
          </div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Critical Triggers
          </div>
          <div className="mt-4 text-3xl font-semibold text-slate-950">
            {isLoading ? "..." : workflowReview?.criticalCount ?? 0}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Report Schedules</h2>
              <p className="mt-2 text-sm text-slate-600">
                Backend source: `/api/report-schedules`
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadAutomationData()}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </button>
          </div>

          <div className="mt-5 space-y-3">
            {schedules.length ? (
              schedules.map((schedule) => (
                <div key={schedule.id} className="rounded-2xl border border-slate-200 px-4 py-4">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                      <div className="text-sm font-medium text-slate-900">{schedule.scheduleName}</div>
                      <div className="mt-1 text-sm text-slate-500">
                        {schedule.reportType} · {schedule.format} · {schedule.frequency}
                      </div>
                      <div className="mt-2 text-xs text-slate-500">
                        Next run: {formatDateTime(schedule.nextRunDate)}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        Last run: {formatDateTime(schedule.lastRunDate)}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          void runScheduleAction(
                            () => executeReportSchedule(token!, schedule.id),
                            "Schedule executed.",
                          )
                        }
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                      >
                        <PlayCircle className="h-4 w-4" />
                        Run now
                      </button>
                      {schedule.isActive ? (
                        <button
                          type="button"
                          onClick={() =>
                            void runScheduleAction(
                              () => deactivateReportSchedule(token!, schedule.id),
                              "Schedule deactivated.",
                            )
                          }
                          className="rounded-full border border-amber-200 px-3 py-2 text-xs font-medium text-amber-700 transition hover:bg-amber-50"
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            void runScheduleAction(
                              () => activateReportSchedule(token!, schedule.id),
                              "Schedule activated.",
                            )
                          }
                          className="rounded-full border border-emerald-200 px-3 py-2 text-xs font-medium text-emerald-700 transition hover:bg-emerald-50"
                        >
                          Activate
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          void runScheduleAction(
                            () => deleteReportSchedule(token!, schedule.id),
                            "Schedule deleted.",
                          )
                        }
                        className="inline-flex items-center gap-2 rounded-full border border-rose-200 px-3 py-2 text-xs font-medium text-rose-700 transition hover:bg-rose-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-2 text-xs text-slate-500 md:grid-cols-3">
                    <div>Status: {schedule.isActive ? "Active" : "Inactive"}</div>
                    <div>Success: {schedule.successCount ?? 0}</div>
                    <div>Failures: {schedule.failureCount ?? 0}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-slate-500">No report schedules returned yet.</div>
            )}
          </div>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Create Report Schedule</h2>
          <p className="mt-2 text-sm text-slate-600">
            Uses the live `ScheduleReportRequest` contract from the backend.
          </p>

          {canManageSchedules ? (
            <form className="mt-5 space-y-4" onSubmit={handleCreateSchedule}>
              <label className="block text-sm text-slate-600">
                Schedule name
                <input
                  value={form.scheduleName}
                  onChange={(event) => setForm((current) => ({ ...current, scheduleName: event.target.value }))}
                  className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                  required
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm text-slate-600">
                  Report type
                  <select
                    value={form.reportType}
                    onChange={(event) => setForm((current) => ({ ...current, reportType: event.target.value }))}
                    className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                  >
                    {reportTypeOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm text-slate-600">
                  Format
                  <select
                    value={form.format}
                    onChange={(event) => setForm((current) => ({ ...current, format: event.target.value }))}
                    className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                  >
                    {formatOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm text-slate-600">
                  Frequency
                  <select
                    value={form.frequency}
                    onChange={(event) => setForm((current) => ({ ...current, frequency: event.target.value }))}
                    className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                  >
                    {frequencyOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm text-slate-600">
                  Recipients
                  <input
                    value={form.recipients ?? ""}
                    onChange={(event) => setForm((current) => ({ ...current, recipients: event.target.value }))}
                    className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                    placeholder="name@example.com"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm text-slate-600">
                  Start date
                  <input
                    type="datetime-local"
                    value={form.startDate ?? ""}
                    onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))}
                    className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                  />
                </label>

                <label className="block text-sm text-slate-600">
                  End date
                  <input
                    type="datetime-local"
                    value={form.endDate ?? ""}
                    onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))}
                    className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                  />
                </label>
              </div>

              {form.frequency === "CUSTOM" ? (
                <label className="block text-sm text-slate-600">
                  Cron expression
                  <input
                    value={form.cronExpression ?? ""}
                    onChange={(event) => setForm((current) => ({ ...current, cronExpression: event.target.value }))}
                    className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                    placeholder="0 0 9 * * MON"
                    required
                  />
                </label>
              ) : null}

              <label className="block text-sm text-slate-600">
                Description
                <textarea
                  value={form.description ?? ""}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  rows={3}
                  className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                />
              </label>

              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Creating..." : "Create schedule"}
              </button>
            </form>
          ) : (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
              Your current permission matrix allows viewing automation data, but schedule creation is
              restricted for this account.
            </div>
          )}
        </article>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Workflow Trigger Review</h2>
            <p className="mt-2 text-sm text-slate-600">
              Backend source: `/api/erp/workflow-triggers/review`
            </p>
          </div>
          {canDispatchWorkflow ? (
            <button
              type="button"
              onClick={() => void handleDispatch()}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Dispatch triggers
            </button>
          ) : null}
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {workflowReview?.triggers.length ? (
            workflowReview.triggers.map((trigger) => (
              <div key={`${trigger.triggerType}-${trigger.referenceType}-${trigger.referenceId}`} className="rounded-2xl border border-slate-200 px-4 py-4">
                <div className="text-sm font-medium text-slate-900">{trigger.title}</div>
                <div className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {trigger.severity} · {trigger.triggerType}
                </div>
                <div className="mt-3 text-sm leading-6 text-slate-600">{trigger.message}</div>
                <div className="mt-3 text-xs text-slate-500">
                  {trigger.referenceType || "No reference"}
                  {typeof trigger.referenceId === "number" ? ` #${trigger.referenceId}` : ""}
                </div>
                <div className="mt-1 text-xs text-slate-500">Due: {formatDate(trigger.dueDate)}</div>
                {typeof trigger.amount === "number" ? (
                  <div className="mt-1 text-sm font-semibold text-slate-900">Rs. {trigger.amount}</div>
                ) : null}
              </div>
            ))
          ) : (
            <div className="text-sm text-slate-500">No workflow triggers returned for the active organization.</div>
          )}
        </div>
      </section>
    </div>
  );
}
