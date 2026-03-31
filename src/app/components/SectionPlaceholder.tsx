interface SectionPlaceholderProps {
  eyebrow: string;
  title: string;
  description: string;
  nextSteps?: string[];
}

export function SectionPlaceholder({
  eyebrow,
  title,
  description,
  nextSteps = [],
}: SectionPlaceholderProps) {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          {eyebrow}
        </div>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">{title}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
      </section>

      <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-sm text-slate-600 shadow-sm">
        <div>This section is intentionally scaffolded for the rebuild.</div>
        {nextSteps.length > 0 && (
          <div className="mt-4 space-y-2">
            {nextSteps.map((step) => (
              <div key={step}>• {step}</div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
