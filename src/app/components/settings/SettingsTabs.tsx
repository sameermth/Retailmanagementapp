import { Building2, GitBranch, ShieldCheck, Users } from "lucide-react";
import { Link } from "react-router";

export type SettingsTab = "organization" | "branches" | "employees" | "roles";

const tabs: Array<{ id: SettingsTab; label: string; href: string; icon: typeof Building2 }> = [
  { id: "organization", label: "Organization", href: "/system/settings", icon: Building2 },
  { id: "branches", label: "Branches", href: "/system/settings/branches", icon: GitBranch },
  { id: "employees", label: "Employees", href: "/system/settings/employees", icon: Users },
  { id: "roles", label: "Roles", href: "/system/settings/roles", icon: ShieldCheck },
];

export function SettingsTabs({ activeTab }: { activeTab: SettingsTab }) {
  return (
    <section className="flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <Link
            key={tab.id}
            to={tab.href}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
              activeTab === tab.id
                ? "bg-slate-950 text-white"
                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
            }`}
          >
            <Icon className="h-4 w-4" />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </section>
  );
}
