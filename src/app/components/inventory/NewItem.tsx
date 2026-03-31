import { AlertCircle, ArrowLeft, CheckCircle2, Package2, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../../auth";
import { ApiError } from "../../lib/api";
import {
  createStoreProduct,
  fetchWarehouses,
  postManualAdjustment,
  type WarehouseResponse,
} from "./api";

interface InventoryItemDraft {
  itemType: "goods" | "service";
  status: "active" | "inactive";
  name: string;
  sku: string;
  categoryId: string;
  brandId: string;
  baseUomId: string;
  taxGroupId: string;
  inventoryTrackingMode: "STANDARD" | "SERIAL" | "BATCH";
  description: string;
  serialTrackingEnabled: boolean;
  batchTrackingEnabled: boolean;
  expiryTrackingEnabled: boolean;
  fractionalQuantityAllowed: boolean;
  openingStock: string;
  minStockBaseQty: string;
  reorderLevelBaseQty: string;
  unitCost: string;
  warehouseId: string;
}

type FormErrors = Partial<Record<keyof InventoryItemDraft, string>>;

function getDefaultItemDraft(): InventoryItemDraft {
  return {
    itemType: "goods",
    status: "active",
    name: "",
    sku: "",
    categoryId: "1",
    brandId: "1",
    baseUomId: "1",
    taxGroupId: "1",
    inventoryTrackingMode: "STANDARD",
    description: "",
    serialTrackingEnabled: false,
    batchTrackingEnabled: false,
    expiryTrackingEnabled: false,
    fractionalQuantityAllowed: false,
    openingStock: "",
    minStockBaseQty: "",
    reorderLevelBaseQty: "",
    unitCost: "",
    warehouseId: "",
  };
}

function formatPreviewValue(value: string, prefix = "") {
  if (!value.trim()) {
    return "Not set";
  }

  return `${prefix}${value}`;
}

export function NewItem() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<InventoryItemDraft>(getDefaultItemDraft());
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [warehouses, setWarehouses] = useState<WarehouseResponse[]>([]);
  const [warehouseError, setWarehouseError] = useState("");

  useEffect(() => {
    async function loadWarehouses() {
      if (!token) {
        return;
      }

      try {
        const response = await fetchWarehouses(token);
        setWarehouses(response);

        const preferredWarehouse =
          response.find((warehouse) => warehouse.isPrimary) ?? response[0] ?? null;

        if (preferredWarehouse) {
          setForm((currentForm) => ({
            ...currentForm,
            warehouseId: preferredWarehouse.id.toString(),
          }));
        }
      } catch (err) {
        setWarehouseError(err instanceof Error ? err.message : "Failed to load warehouses.");
      }
    }

    void loadWarehouses();
  }, [token]);

  function updateField<Key extends keyof InventoryItemDraft>(
    field: Key,
    value: InventoryItemDraft[Key],
  ) {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
    setErrors((currentErrors) => ({ ...currentErrors, [field]: undefined }));
    setSubmitError("");
  }

  function validateForm() {
    const nextErrors: FormErrors = {};

    if (!form.name.trim()) {
      nextErrors.name = "Item name is required.";
    }

    if (!form.sku.trim()) {
      nextErrors.sku = "SKU is required.";
    }

    if (!form.categoryId.trim()) {
      nextErrors.categoryId = "Category ID is required.";
    }

    if (!form.brandId.trim()) {
      nextErrors.brandId = "Brand ID is required.";
    }

    if (!form.baseUomId.trim()) {
      nextErrors.baseUomId = "Base UOM ID is required.";
    }

    if (!form.taxGroupId.trim()) {
      nextErrors.taxGroupId = "Tax group ID is required.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (!token) {
      setSubmitError("No authenticated session found.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    try {
      const organizationId = user?.organizationId ?? 1;
      const storeProduct = await createStoreProduct(token, {
        organizationId,
        categoryId: Number(form.categoryId),
        brandId: Number(form.brandId),
        baseUomId: Number(form.baseUomId),
        taxGroupId: Number(form.taxGroupId),
        sku: form.sku.trim().toUpperCase(),
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        inventoryTrackingMode: form.inventoryTrackingMode,
        serialTrackingEnabled: form.serialTrackingEnabled,
        batchTrackingEnabled: form.batchTrackingEnabled,
        expiryTrackingEnabled: form.expiryTrackingEnabled,
        fractionalQuantityAllowed: form.fractionalQuantityAllowed,
        minStockBaseQty: form.minStockBaseQty.trim()
          ? Number(form.minStockBaseQty)
          : undefined,
        reorderLevelBaseQty: form.reorderLevelBaseQty.trim()
          ? Number(form.reorderLevelBaseQty)
          : undefined,
        isServiceItem: form.itemType === "service",
        isActive: form.status === "active",
      });

      const shouldPostOpeningStock =
        form.itemType === "goods" &&
        form.warehouseId.trim() &&
        Number(form.openingStock || 0) > 0;

      if (shouldPostOpeningStock) {
        await postManualAdjustment(token, {
          organizationId,
          warehouseId: Number(form.warehouseId),
          productId: storeProduct.id,
          uomId: Number(form.baseUomId),
          quantityDelta: Number(form.openingStock),
          baseQuantityDelta: Number(form.openingStock),
          unitCost: form.unitCost.trim() ? Number(form.unitCost) : undefined,
          reason: "Opening stock",
        });
      }

      navigate("/inventory/items");
    } catch (err) {
      if (err instanceof ApiError && err.validationErrors) {
        setErrors((currentErrors) => ({
          ...currentErrors,
          sku: err.validationErrors?.sku || currentErrors.sku,
          name: err.validationErrors?.name || currentErrors.name,
          categoryId: err.validationErrors?.categoryId || currentErrors.categoryId,
          brandId: err.validationErrors?.brandId || currentErrors.brandId,
          baseUomId: err.validationErrors?.baseUomId || currentErrors.baseUomId,
          taxGroupId: err.validationErrors?.taxGroupId || currentErrors.taxGroupId,
        }));
      }

      setSubmitError(err instanceof Error ? err.message : "Failed to save item.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_360px]">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Inventory
            </div>
            <h1 className="mt-3 text-3xl font-semibold text-slate-950">New Item</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Create the store product first, then optionally post opening stock as a separate
              inventory adjustment. This matches the backend ERP product and inventory flow.
            </p>
          </div>

          <Link
            to="/inventory/items"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to items</span>
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-8">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Item Type
              </div>
              <select
                value={form.itemType}
                onChange={(event) =>
                  updateField("itemType", event.target.value as InventoryItemDraft["itemType"])
                }
                className="crm-select mt-3"
              >
                <option value="goods">Goods</option>
                <option value="service">Service</option>
              </select>
            </label>

            <label className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Tracking Mode
              </div>
              <select
                value={form.inventoryTrackingMode}
                onChange={(event) =>
                  updateField(
                    "inventoryTrackingMode",
                    event.target.value as InventoryItemDraft["inventoryTrackingMode"],
                  )
                }
                className="crm-select mt-3"
              >
                <option value="STANDARD">Standard</option>
                <option value="SERIAL">Serial Tracked</option>
                <option value="BATCH">Batch Tracked</option>
              </select>
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Item Name
              </div>
              <input
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
                placeholder="Enter item name"
                className="crm-field mt-3"
              />
              {errors.name && <div className="mt-2 text-sm text-rose-600">{errors.name}</div>}
            </label>

            <label className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                SKU
              </div>
              <input
                value={form.sku}
                onChange={(event) => updateField("sku", event.target.value)}
                placeholder="Enter SKU"
                className="crm-field mt-3 uppercase"
              />
              {errors.sku && <div className="mt-2 text-sm text-rose-600">{errors.sku}</div>}
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Category ID
              </div>
              <input
                value={form.categoryId}
                onChange={(event) => updateField("categoryId", event.target.value)}
                placeholder="1"
                className="crm-field mt-3"
              />
              {errors.categoryId && (
                <div className="mt-2 text-sm text-rose-600">{errors.categoryId}</div>
              )}
            </label>

            <label className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Brand ID
              </div>
              <input
                value={form.brandId}
                onChange={(event) => updateField("brandId", event.target.value)}
                placeholder="1"
                className="crm-field mt-3"
              />
              {errors.brandId && <div className="mt-2 text-sm text-rose-600">{errors.brandId}</div>}
            </label>

            <label className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Base UOM ID
              </div>
              <input
                value={form.baseUomId}
                onChange={(event) => updateField("baseUomId", event.target.value)}
                placeholder="1"
                className="crm-field mt-3"
              />
              {errors.baseUomId && (
                <div className="mt-2 text-sm text-rose-600">{errors.baseUomId}</div>
              )}
            </label>

            <label className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Tax Group ID
              </div>
              <input
                value={form.taxGroupId}
                onChange={(event) => updateField("taxGroupId", event.target.value)}
                placeholder="1"
                className="crm-field mt-3"
              />
              {errors.taxGroupId && (
                <div className="mt-2 text-sm text-rose-600">{errors.taxGroupId}</div>
              )}
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Minimum Stock
              </div>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.minStockBaseQty}
                onChange={(event) => updateField("minStockBaseQty", event.target.value)}
                placeholder="0.00"
                className="crm-field mt-3"
              />
            </label>

            <label className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Reorder Level
              </div>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.reorderLevelBaseQty}
                onChange={(event) => updateField("reorderLevelBaseQty", event.target.value)}
                placeholder="0.00"
                className="crm-field mt-3"
              />
            </label>

            <label className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Status
              </div>
              <select
                value={form.status}
                onChange={(event) =>
                  updateField("status", event.target.value as InventoryItemDraft["status"])
                }
                className="crm-select mt-3"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {([
              ["serialTrackingEnabled", "Serial Tracking"],
              ["batchTrackingEnabled", "Batch Tracking"],
              ["expiryTrackingEnabled", "Expiry Tracking"],
              ["fractionalQuantityAllowed", "Fractional Qty"],
            ] as const).map(([field, label]) => (
              <label
                key={field}
                className="flex items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-slate-50/70 px-4 py-4"
              >
                <span className="text-sm font-medium text-slate-700">{label}</span>
                <input
                  type="checkbox"
                  checked={form[field]}
                  onChange={(event) => updateField(field, event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                />
              </label>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Warehouse
              </div>
              <select
                value={form.warehouseId}
                onChange={(event) => updateField("warehouseId", event.target.value)}
                disabled={form.itemType === "service" || warehouses.length === 0}
                className="crm-select mt-3 disabled:text-slate-400"
              >
                <option value="">
                  {warehouses.length === 0 ? "No active warehouse found" : "Select warehouse"}
                </option>
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id.toString()}>
                    {warehouse.name} ({warehouse.code})
                  </option>
                ))}
              </select>
            </label>

            <label className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Opening Stock
              </div>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.openingStock}
                onChange={(event) => updateField("openingStock", event.target.value)}
                placeholder={form.itemType === "service" ? "Leave 0 for services" : "Current quantity"}
                disabled={form.itemType === "service"}
                className="crm-field mt-3 disabled:text-slate-400"
              />
            </label>

            <label className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4 md:col-span-2">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Opening Unit Cost
              </div>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.unitCost}
                onChange={(event) => updateField("unitCost", event.target.value)}
                placeholder="Optional cost for opening stock"
                disabled={form.itemType === "service"}
                className="crm-field mt-3 disabled:text-slate-400"
              />
            </label>
          </div>

          {(warehouseError || submitError) && (
            <div className="space-y-3">
              {warehouseError && (
                <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>{warehouseError}</span>
                </div>
              )}
              {submitError && (
                <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}
            </div>
          )}

          <label className="block rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Description
            </div>
            <textarea
              value={form.description}
              onChange={(event) => updateField("description", event.target.value)}
              placeholder="Short store product description"
              rows={4}
              className="crm-textarea mt-3 resize-none"
            />
          </label>

          <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 pt-6">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{isSubmitting ? "Saving..." : "Save item"}</span>
            </button>
            <Link
              to="/inventory/items"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              <span>Cancel</span>
            </Link>
          </div>
        </form>
      </section>

      <aside className="space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
              <Package2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-950">
                {form.name || "Item Preview"}
              </div>
              <div className="text-xs text-slate-500">{form.sku || "SKU pending"}</div>
            </div>
          </div>

          <div className="mt-6 space-y-4 text-sm text-slate-600">
            <div className="flex items-center justify-between gap-4">
              <span>Type</span>
              <span className="font-medium capitalize text-slate-900">{form.itemType}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span>Tracking</span>
              <span className="font-medium text-slate-900">{form.inventoryTrackingMode}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span>Category / Brand</span>
              <span className="font-medium text-slate-900">
                {form.categoryId || "-"} / {form.brandId || "-"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span>Base UOM / Tax</span>
              <span className="font-medium text-slate-900">
                {form.baseUomId || "-"} / {form.taxGroupId || "-"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span>Warehouse</span>
              <span className="font-medium text-slate-900">
                {warehouses.find((warehouse) => warehouse.id.toString() === form.warehouseId)?.name ||
                  "Not set"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span>Opening Stock</span>
              <span className="font-medium text-slate-900">
                {formatPreviewValue(form.openingStock)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span>Reorder Level</span>
              <span className="font-medium text-slate-900">
                {formatPreviewValue(form.reorderLevelBaseQty)}
              </span>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
            <Sparkles className="h-4 w-4 text-slate-500" />
            <span>Current backend fit</span>
          </div>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
            <li>Store product creation expects master IDs like category, brand, UOM, and tax group.</li>
            <li>Opening stock is optional and is posted separately as a manual inventory adjustment.</li>
            <li>Pricing and tax presentation will move into dedicated ERP master flows as the backend grows.</li>
          </ul>
        </section>
      </aside>
    </div>
  );
}
