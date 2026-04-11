import { AlertCircle, Building2, CheckCircle2, CirclePlus, Warehouse } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "../../auth";
import { createWarehouse, fetchWarehouses, updateWarehouse, type WarehouseResponse } from "./api";

export function Warehouses() {
  const { token, user } = useAuth();
  const [warehouses, setWarehouses] = useState<WarehouseResponse[]>([]);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function loadWarehouses() {
    if (!token || !user?.organizationId) {
      return;
    }

    const response = await fetchWarehouses(token, user.organizationId, user.defaultBranchId ?? undefined);
    setWarehouses(response);
  }

  useEffect(() => {
    async function loadData() {
      try {
        setError("");
        await loadWarehouses();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "We could not load warehouses.");
      }
    }

    void loadData();
  }, [token, user?.organizationId, user?.defaultBranchId]);

  async function handleCreateWarehouse(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token || !user?.organizationId || !user.defaultBranchId) {
      setError("Organization and branch context are required.");
      return;
    }

    if (!code.trim() || !name.trim()) {
      setError("Warehouse code and name are required.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setSuccessMessage("");

    try {
      await createWarehouse(token, {
        organizationId: user.organizationId,
        branchId: user.defaultBranchId,
        code: code.trim(),
        name: name.trim(),
        isPrimary,
        isActive,
      });
      setCode("");
      setName("");
      setIsPrimary(false);
      setIsActive(true);
      setSuccessMessage("Warehouse created successfully.");
      await loadWarehouses();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We could not create the warehouse.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggleActive(warehouse: WarehouseResponse) {
    if (!token || !user?.organizationId) {
      return;
    }

    try {
      setError("");
      await updateWarehouse(token, user.organizationId, warehouse.id, {
        isActive: !warehouse.isActive,
      });
      await loadWarehouses();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We could not update this warehouse.");
    }
  }

  async function handleMakePrimary(warehouse: WarehouseResponse) {
    if (!token || !user?.organizationId) {
      return;
    }

    try {
      setError("");
      await updateWarehouse(token, user.organizationId, warehouse.id, {
        isPrimary: true,
      });
      await loadWarehouses();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We could not update this warehouse.");
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Inventory</div>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">Warehouses</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          This page now uses the live ERP warehouse controller for listing and managing warehouses
          within the current organization and branch context.
        </p>

        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {successMessage ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {successMessage}
          </div>
        ) : null}
      </section>

      <section className="grid gap-6 xl:grid-cols-[520px_minmax(0,1fr)] 2xl:grid-cols-[560px_minmax(0,1fr)]">
        <form onSubmit={handleCreateWarehouse} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
              <CirclePlus className="h-5 w-5" />
            </div>
            <div>
              <div className="text-lg font-semibold text-slate-950">Create Warehouse</div>
              <div className="text-sm text-slate-500">
                Branch {user?.defaultBranchId ?? "-"} in organization {user?.organizationId ?? "-"}
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <input value={code} onChange={(event) => setCode(event.target.value)} className="crm-field" placeholder="Warehouse code" />
            <input value={name} onChange={(event) => setName(event.target.value)} className="crm-field" placeholder="Warehouse name" />

            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
              <input type="checkbox" checked={isPrimary} onChange={(event) => setIsPrimary(event.target.checked)} />
              Set as primary warehouse
            </label>

            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
              <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
              Warehouse is active
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-full bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {isSubmitting ? "Creating..." : "Create warehouse"}
            </button>
          </div>
        </form>

        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                ERP Warehouses
              </div>
              <h2 className="mt-2 text-xl font-semibold text-slate-950">Warehouse list</h2>
            </div>
            <div className="text-sm text-slate-500">{warehouses.length} warehouse{warehouses.length === 1 ? "" : "s"}</div>
          </div>

          <div className="divide-y divide-slate-200">
            {warehouses.map((warehouse) => (
              <div key={warehouse.id} className="flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
                      <Warehouse className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-base font-semibold text-slate-950">
                        {warehouse.name}
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        {warehouse.code} · Branch {warehouse.branchId}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {warehouse.isPrimary ? (
                    <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Primary
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void handleMakePrimary(warehouse)}
                      className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                    >
                      Make primary
                    </button>
                  )}

                  <div
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      warehouse.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {warehouse.isActive ? "Active" : "Inactive"}
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleToggleActive(warehouse)}
                    className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                  >
                    {warehouse.isActive ? "Deactivate" : "Activate"}
                  </button>
                </div>
              </div>
            ))}

            {warehouses.length === 0 ? (
              <div className="flex items-center gap-3 px-6 py-10 text-sm text-slate-500">
                <AlertCircle className="h-4 w-4 text-slate-400" />
                <span>No warehouses are available yet for this branch.</span>
              </div>
            ) : null}
          </div>
        </section>
      </section>
    </div>
  );
}
