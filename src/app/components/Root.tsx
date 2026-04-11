import { Suspense } from "react";
import { Link, Outlet, useLocation } from "react-router";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth";
import { findNavItem, sidebarSections, type NavItem, type SidebarSection } from "../navigation";

const SIDEBAR_STORAGE_KEY = "ui.sidebar-collapsed";

function isItemAllowed(
  item: Pick<NavItem, "requiredFeature" | "requiredPermissions">,
  canAccess: (feature: NavItem["requiredFeature"]) => boolean,
  hasAnyPermission: (permissions: string[] | null | undefined) => boolean,
) {
  return canAccess(item.requiredFeature ?? null) && hasAnyPermission(item.requiredPermissions);
}

function getVisibleSections(
  sections: SidebarSection[],
  canAccess: (feature: NavItem["requiredFeature"]) => boolean,
  hasAnyPermission: (permissions: string[] | null | undefined) => boolean,
  isPlatformAdmin: boolean,
) {
  const scopedSections = sections.filter((section) =>
    isPlatformAdmin ? section.id === "platform-admin" : section.id !== "platform-admin",
  );

  return scopedSections
    .map((section) => {
      const children = section.children?.filter((item) => isItemAllowed(item, canAccess, hasAnyPermission));
      const sectionAllowed =
        canAccess(section.requiredFeature ?? null) && hasAnyPermission(section.requiredPermissions);

      if (!sectionAllowed && (!children || children.length === 0)) {
        return null;
      }

      return {
        ...section,
        path: sectionAllowed ? section.path : children?.[0]?.path ?? section.path,
        children,
      };
    })
    .filter((section): section is SidebarSection => Boolean(section));
}

function RouteLoadingFallback() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-7 text-sm text-slate-500 shadow-sm">
      Loading module...
    </div>
  );
}

export function Root() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [openSectionId, setOpenSectionId] = useState<string | null>(null);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState("");
  const [isSwitchingOrganization, setIsSwitchingOrganization] = useState(false);
  const [organizationSwitchError, setOrganizationSwitchError] = useState("");
  const {
    user,
    logout,
    capabilities,
    canAccess,
    hasAnyPermission,
    isPlatformAdmin,
    switchOrganization,
  } = useAuth();
  const visibleSections = useMemo(
    () => getVisibleSections(sidebarSections, canAccess, hasAnyPermission, isPlatformAdmin),
    [canAccess, hasAnyPermission, isPlatformAdmin],
  );
  const currentNavItem = findNavItem(location.pathname);

  useEffect(() => {
    const savedValue = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    setSidebarCollapsed(savedValue === "true");
  }, []);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  useEffect(() => {
    const activeSection = visibleSections.find((section) =>
      section.children?.some((item) => item.path === location.pathname) || section.path === location.pathname,
    );

    if (activeSection) {
      setOpenSectionId(activeSection.id);
    }
  }, [location.pathname, visibleSections]);

  useEffect(() => {
    setSelectedOrganizationId(user?.organizationId ? String(user.organizationId) : "");
  }, [user?.organizationId]);

  function toggleSection(sectionId: string) {
    setOpenSectionId((current) => (current === sectionId ? null : sectionId));
  }

  const subscriptionBadge =
    capabilities.subscriptionStatus === "ACTIVE" || capabilities.subscriptionStatus === "TRIAL"
      ? "bg-emerald-50 text-emerald-700"
      : "bg-amber-50 text-amber-700";

  const organizationChoices =
    !isPlatformAdmin && user?.memberships && user.memberships.length > 1
      ? user.memberships.filter((membership) => membership.active !== false)
      : [];

  async function handleOrganizationChange(nextOrganizationId: string) {
    if (!nextOrganizationId) {
      return;
    }

    setSelectedOrganizationId(nextOrganizationId);
    setOrganizationSwitchError("");
    if (String(user?.organizationId ?? "") === nextOrganizationId) {
      return;
    }

    setIsSwitchingOrganization(true);
    try {
      await switchOrganization(Number(nextOrganizationId));
    } catch (error) {
      setOrganizationSwitchError(
        error instanceof Error ? error.message : "Failed to switch organization.",
      );
      setSelectedOrganizationId(String(user?.organizationId ?? ""));
    } finally {
      setIsSwitchingOrganization(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
        <div className="crm-shell flex items-center gap-3 px-3 py-3 sm:px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="rounded-lg border border-slate-200 p-2 text-slate-600 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <button
              onClick={() => setSidebarCollapsed((value) => !value)}
              className="hidden rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100 lg:inline-flex"
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="h-5 w-5" />
              ) : (
                <PanelLeftClose className="h-5 w-5" />
              )}
            </button>
            <div>
              <div className="text-sm font-semibold text-slate-900">Retail Management</div>
              <div className="text-xs text-slate-500">
                {isPlatformAdmin ? "Platform admin workspace" : "Backend-driven ERP workspace"}
              </div>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-3">
            {organizationChoices.length > 0 && (
              <div className="hidden min-w-[260px] sm:block">
                <select
                  value={selectedOrganizationId}
                  onChange={(event) => void handleOrganizationChange(event.target.value)}
                  disabled={isSwitchingOrganization}
                  className="crm-select h-9 w-full py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label="Switch organization"
                >
                  {organizationChoices.map((membership) => (
                    <option key={`${membership.organizationId}-${membership.userId ?? "self"}`} value={membership.organizationId}>
                      {(membership.organizationName || `Organization ${membership.organizationId}`) +
                        (membership.roleName ? ` · ${membership.roleName}` : "")}
                    </option>
                  ))}
                </select>
                {organizationSwitchError ? (
                  <div className="mt-1 text-xs text-rose-600">{organizationSwitchError}</div>
                ) : null}
              </div>
            )}
            <div className={`hidden rounded-full px-3 py-1 text-xs font-semibold sm:block ${subscriptionBadge}`}>
              {capabilities.plan} · {capabilities.subscriptionStatus}
            </div>
            {user && (
              <div className="hidden rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-right sm:block">
                <div className="text-sm font-medium text-slate-900">
                  {isPlatformAdmin ? user.username : user.organizationName || user.username}
                </div>
                <div className="text-xs text-slate-500">
                  {!isPlatformAdmin && user.defaultBranchId ? `Branch ${user.defaultBranchId} · ` : ""}
                  {user.email}
                </div>
              </div>
            )}
            <button
              onClick={() => {
                void logout();
              }}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-100"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-slate-200 px-3 py-3 lg:hidden">
            <div className="space-y-4">
              {visibleSections.map((section) => {
                const Icon = section.icon;
                const isOpen = openSectionId === section.id;
                const isActiveSection =
                  section.path === location.pathname ||
                  section.children?.some((item) => item.path === location.pathname);

                return (
                  <div key={section.id}>
                    <div className="flex items-center gap-2">
                      <Link
                        to={section.path}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${
                          isActiveSection ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{section.label}</span>
                      </Link>
                      {section.children && section.children.length > 0 && (
                        <button
                          onClick={() => toggleSection(section.id)}
                          className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500"
                        >
                          <ChevronDown className={`h-4 w-4 transition ${isOpen ? "rotate-180" : ""}`} />
                        </button>
                      )}
                    </div>
                    {section.children && section.children.length > 0 && isOpen && (
                      <div className="mt-1.5 space-y-1.5 pl-3">
                        {section.children.map((item) => {
                          const isActive = location.pathname === item.path;

                          return (
                            <Link
                              key={item.path}
                              to={item.path}
                              onClick={() => setMobileMenuOpen(false)}
                              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${
                                isActive ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-700"
                              }`}
                            >
                              <item.icon className="h-4 w-4" />
                              <span>{item.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </header>

      <div
        className={`crm-shell grid gap-4 px-3 py-4 sm:px-4 lg:px-6 ${
          sidebarCollapsed
            ? "lg:grid-cols-[92px_minmax(0,1fr)]"
            : "lg:grid-cols-[228px_minmax(0,1fr)]"
        }`}
      >
        <aside className="hidden self-start lg:sticky lg:top-[76px] lg:block">
          <div className="flex max-h-[calc(100vh-92px)] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white p-2.5">
            <div className="mb-3 flex items-center justify-between px-1.5">
              {!sidebarCollapsed && (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    {isPlatformAdmin ? "Platform" : "Navigation"}
                  </div>
                  <div className="mt-1 text-sm text-slate-600">
                    {isPlatformAdmin ? "Company admin modules" : "Modules you can access"}
                  </div>
                </div>
              )}
              <button
                onClick={() => setSidebarCollapsed((value) => !value)}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100"
                aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {sidebarCollapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronLeft className="h-4 w-4" />
                )}
              </button>
            </div>

            <nav className="space-y-1.5 overflow-y-auto pr-1">
              {visibleSections.map((section) => {
                const Icon = section.icon;
                const isOpen = openSectionId === section.id;
                const isActiveSection =
                  section.path === location.pathname ||
                  section.children?.some((item) => item.path === location.pathname);

                return (
                  <div key={section.id}>
                    <div className="flex items-center gap-2">
                      <Link
                        to={section.path}
                        title={sidebarCollapsed ? section.label : undefined}
                        className={`flex min-w-0 items-center rounded-xl px-2.5 py-2.5 text-sm transition ${
                          isActiveSection
                            ? "bg-slate-900 text-white"
                            : "text-slate-700 hover:bg-slate-100"
                        } ${sidebarCollapsed ? "flex-1 justify-center" : "flex-1 gap-3"}`}
                      >
                        <Icon className="h-4 w-4 flex-shrink-0" />
                        {!sidebarCollapsed && <span className="truncate">{section.label}</span>}
                      </Link>
                      {!sidebarCollapsed && section.children && section.children.length > 0 && (
                        <button
                          onClick={() => toggleSection(section.id)}
                          className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                        >
                          <ChevronDown className={`h-4 w-4 transition ${isOpen ? "rotate-180" : ""}`} />
                        </button>
                      )}
                    </div>

                    {!sidebarCollapsed && section.children && section.children.length > 0 && isOpen && (
                      <div className="mt-1.5 space-y-1 pl-3">
                        {section.children.map((item) => {
                          const isActive = location.pathname === item.path;

                          return (
                            <Link
                              key={item.path}
                              to={item.path}
                              className={`flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm transition ${
                                isActive
                                  ? "bg-blue-50 font-medium text-blue-700"
                                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                              }`}
                            >
                              <item.icon className="h-4 w-4 flex-shrink-0" />
                              <span className="truncate">{item.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>
        </aside>

        <main className="min-w-0">
          {currentNavItem && (
            <div className="mb-4 rounded-xl border border-slate-200 bg-white px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                {currentNavItem.eyebrow}
              </div>
              <div className="mt-2 text-lg font-semibold text-slate-950">
                {currentNavItem.label}
              </div>
              <div className="mt-1 text-sm text-slate-600">{currentNavItem.description}</div>
            </div>
          )}

          <Suspense fallback={<RouteLoadingFallback />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
