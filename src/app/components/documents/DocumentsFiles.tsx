import { FileDown, FolderKanban, Info, Workflow } from "lucide-react";

export function DocumentsFiles() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Documents
        </div>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">Generated Files</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          I checked the current backend contract and project code for a real documents or generated
          reports listing API. Report schedules and workflow automation are live, but a file listing
          and download controller is not currently exposed in the active backend contract.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            <Workflow className="h-4 w-4" />
            Available Now
          </div>
          <div className="mt-4 text-lg font-semibold text-slate-950">Report schedules</div>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Use the Automation screen for schedule creation, activation, execution, and workflow
            trigger review.
          </p>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            <FileDown className="h-4 w-4" />
            Missing API
          </div>
          <div className="mt-4 text-lg font-semibold text-slate-950">Generated report files</div>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            The backend currently has report generation services, but no active controller endpoint
            to list generated reports or download them in the current OpenAPI contract.
          </p>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            <FolderKanban className="h-4 w-4" />
            UI Status
          </div>
          <div className="mt-4 text-lg font-semibold text-slate-950">Aligned to backend</div>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            This page now reflects the real backend state so users are not pushed into an old or
            assumed download flow that does not actually exist yet.
          </p>
        </article>
      </section>

      <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-700" />
          <div>
            <h2 className="text-lg font-semibold text-amber-900">What I verified</h2>
            <div className="mt-3 space-y-2 text-sm leading-6 text-amber-900/90">
              <div>The generated OpenAPI includes `Report Schedules`, but no report file list or report download endpoints.</div>
              <div>The backend source contains report generator services and DTOs, but the current `ReportController` is empty.</div>
              <div>`/system/automation` is the correct live destination for reporting automation today.</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
