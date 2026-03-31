import { ArrowRight } from "lucide-react";
import { Link } from "react-router";
import { navGroups } from "../navigation";

export function ModuleHome() {
  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          App Skeleton
        </div>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">
          Business app structure, ready to build.
        </h1>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-600">
          This shell is organized around the major workflows we want in the product. We now have a
          full information architecture in place and can start implementing each module inside this
          frame.
        </p>
      </section>

      {navGroups.map((group) => (
        <section key={group.id} className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            {group.label}
          </h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {group.items.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
                      <Icon className="h-5 w-5" />
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-slate-950">{item.label}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
