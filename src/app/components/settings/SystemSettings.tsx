import { useMemo } from "react";
import { useAuth } from "../../auth";
import { SettingsTabs, type SettingsTab } from "./SettingsTabs";

const tabCopy: Record<SettingsTab, { title: string; description: string }> = {
  organization: {
    title: "Organization Context",
    description:
      "This screen now reflects the active backend organization, subscription, and login session instead of local demo setup.",
  },
  branches: {
    title: "Branch Context",
    description:
      "The active branch now comes from the authenticated membership returned by login.",
  },
  employees: {
    title: "Users & Roles",
    description:
      "User access should follow backend users, roles, and permission matrices.",
  },
  roles: {
    title: "Permissions Matrix",
    description:
      "Role and permission enforcement is now session-driven. Extend the page once backend management APIs are finalized.",
  },
};

export function SystemSettings({ initialTab = "organization" }: { initialTab?: SettingsTab }) {
  const { user, capabilities } = useAuth();

  const activeCopy = tabCopy[initialTab];

  const activeMembership = useMemo(
    () =>
      user?.memberships.find((membership) => membership.organizationId === user.organizationId) ??
      user?.memberships[0] ??
      null,
    [user],
  );

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          System
        </div>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">{activeCopy.title}</h1>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-600">{activeCopy.description}</p>
      </section>

      <SettingsTabs activeTab={initialTab} />

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="text-sm font-semibold text-slate-900">Session Snapshot</div>
          <dl className="mt-4 space-y-3 text-sm text-slate-600">
            <div className="flex justify-between gap-4">
              <dt>Organization</dt>
              <dd className="text-right font-medium text-slate-900">
                {user.organizationName || "Not returned"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Organization Code</dt>
              <dd className="text-right font-medium text-slate-900">
                {user.organizationCode || "Not returned"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Organization ID</dt>
              <dd className="text-right font-medium text-slate-900">
                {user.organizationId ?? "Not returned"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Default Branch ID</dt>
              <dd className="text-right font-medium text-slate-900">
                {user.defaultBranchId ?? "Not returned"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Role Snapshot</dt>
              <dd className="text-right font-medium text-slate-900">
                {activeMembership?.roleName || activeMembership?.roleCode || user.roles.join(", ") || "Not returned"}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="text-sm font-semibold text-slate-900">Subscription & Access</div>
          <dl className="mt-4 space-y-3 text-sm text-slate-600">
            <div className="flex justify-between gap-4">
              <dt>Plan</dt>
              <dd className="text-right font-medium text-slate-900">{capabilities.plan}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Status</dt>
              <dd className="text-right font-medium text-slate-900">
                {capabilities.subscriptionStatus}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Backend Features</dt>
              <dd className="text-right font-medium text-slate-900">
                {Object.keys(capabilities.features).length}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Permission Entries</dt>
              <dd className="text-right font-medium text-slate-900">
                {user.permissions.length}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Memberships</dt>
              <dd className="text-right font-medium text-slate-900">
                {user.memberships.length}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {initialTab === "roles" && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="text-sm font-semibold text-slate-900">Current permissions</div>
          <div className="mt-4 flex flex-wrap gap-2">
            {user.permissions.length > 0 ? (
              user.permissions.map((permission) => (
                <span
                  key={permission}
                  className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                >
                  {permission}
                </span>
              ))
            ) : (
              <div className="text-sm text-slate-500">
                No explicit permissions were returned in this session.
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
