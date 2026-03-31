interface AccessDeniedPageProps {
  title?: string;
  requiredPermissions?: string[];
}

export function AccessDeniedPage({
  title = "Access restricted",
  requiredPermissions = [],
}: AccessDeniedPageProps) {
  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-6">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-700">
          Permission Required
        </div>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">{title}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-700">
          You are not allowed to open this page or perform actions here with the current
          permission matrix from the backend login session.
        </p>
      </section>

      {requiredPermissions.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white px-6 py-5">
          <div className="text-sm font-semibold text-slate-900">Expected permissions</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {requiredPermissions.map((permission) => (
              <span
                key={permission}
                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
              >
                {permission}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
