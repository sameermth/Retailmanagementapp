import type { FeatureKey, SubscriptionCapabilities } from "../features";

interface LockedFeaturePageProps {
  feature: FeatureKey | null;
  capabilities: SubscriptionCapabilities;
}

function formatFeatureLabel(feature: FeatureKey | null) {
  if (!feature) {
    return "This feature";
  }

  return feature
    .split(".")
    .map((part) => part.replace(/-/g, " "))
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" / ");
}

export function LockedFeaturePage({ feature, capabilities }: LockedFeaturePageProps) {
  const needsSubscription =
    capabilities.subscriptionStatus === "PAST_DUE" || capabilities.subscriptionStatus === "EXPIRED";

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-6">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
          Subscription Required
        </div>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">
          {formatFeatureLabel(feature)} is not available right now
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-700">
          {needsSubscription
            ? "Your current subscription is not active for this module. Please renew or subscribe to continue."
            : "This module is outside the current subscription matrix returned by the backend. Subscribe or upgrade to unlock it."}
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
          <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Plan</div>
          <div className="mt-2 text-lg font-semibold text-slate-900">{capabilities.plan}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
          <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Status</div>
          <div className="mt-2 text-lg font-semibold text-slate-900">
            {capabilities.subscriptionStatus}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
          <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Backend Matrix</div>
          <div className="mt-2 text-lg font-semibold text-slate-900">
            {Object.keys(capabilities.features).length} enabled features
          </div>
        </div>
      </section>
    </div>
  );
}
