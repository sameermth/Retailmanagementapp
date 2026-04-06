import { AlertCircle, ArrowLeft, Check, CheckCircle2, ChevronsUpDown, Package2, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../../auth";
import { ApiError } from "../../lib/api";
import {
  createProductAttributeDefinition,
  createStoreProduct,
  fetchBrandOptions,
  fetchCategoryOptions,
  fetchHsnOptions,
  fetchProductAttributeDefinitions,
  fetchProductAttributeUiConfig,
  fetchTaxGroupOptions,
  fetchTaxGroupSuggestion,
  fetchUomOptions,
  fetchWarehouses,
  postManualAdjustment,
  upsertStoreProductSuppliers,
  updateProductAttributeDefinition,
  type BrandOptionResponse,
  type CategoryOptionResponse,
  type CreateProductAttributeDefinitionPayload,
  type HsnMasterResponse,
  type ProductAttributeDefinitionResponse,
  type ProductAttributeUiConfigResponse,
  type TaxGroupOptionResponse,
  type UomOptionResponse,
  type WarehouseResponse,
} from "./api";
import { fetchSupplierSummaries, type SupplierSummaryResponse } from "../purchases/api";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

interface InventoryItemDraft {
  itemType: "goods" | "service";
  status: "active" | "inactive";
  name: string;
  sku: string;
  hsnCode: string;
  hsnSearch: string;
  categoryId: string;
  categorySearch: string;
  brandId: string;
  brandSearch: string;
  baseUomId: string;
  baseUomSearch: string;
  taxGroupId: string;
  taxGroupSearch: string;
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
  defaultWarrantyMonths: string;
  warrantyTerms: string;
}

type FormErrors = Partial<Record<keyof InventoryItemDraft, string>>;

interface AttributeDraftValue {
  text: string;
  number: string;
  boolean: boolean;
  date: string;
  optionId: string;
  json: string;
}

type AttributeErrors = Record<number, string>;

interface AttributeBuilderDraft {
  attributeDefinitionId: number | null;
  label: string;
  code: string;
  description: string;
  dataType: string;
  inputType: string;
  isRequired: boolean;
  placeholder: string;
  helpText: string;
  unitLabel: string;
  optionsText: string;
}

interface SupplierLinkDraft {
  localId: string;
  supplierId: string;
  supplierSearch: string;
  supplierProductCode: string;
  supplierProductName: string;
  priority: string;
  isPreferred: boolean;
  isActive: boolean;
}

function getDefaultItemDraft(): InventoryItemDraft {
  return {
    itemType: "goods",
    status: "active",
    name: "",
    sku: "",
    hsnCode: "",
    hsnSearch: "",
    categoryId: "",
    categorySearch: "",
    brandId: "",
    brandSearch: "",
    baseUomId: "",
    baseUomSearch: "",
    taxGroupId: "",
    taxGroupSearch: "",
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
    defaultWarrantyMonths: "",
    warrantyTerms: "",
  };
}

function formatPreviewValue(value: string, prefix = "") {
  if (!value.trim()) {
    return "Not set";
  }

  return `${prefix}${value}`;
}

function formatCategoryOption(option: CategoryOptionResponse) {
  return option.name;
}

function formatBrandOption(option: BrandOptionResponse) {
  return option.name;
}

function formatUomOption(option: UomOptionResponse) {
  return `${option.code} - ${option.name}`;
}

function formatTaxGroupOption(option: TaxGroupOptionResponse) {
  return `${option.name} (${option.code})`;
}

function formatHsnOption(option: HsnMasterResponse) {
  return `${option.hsnCode} - ${option.description}`;
}

function resolveBackendTrackingMode(form: InventoryItemDraft) {
  if (form.inventoryTrackingMode === "SERIAL") {
    return "SERIALIZED";
  }

  if (form.inventoryTrackingMode === "BATCH") {
    return form.expiryTrackingEnabled ? "BATCHED_EXPIRY" : "BATCHED";
  }

  if (form.fractionalQuantityAllowed) {
    return "FRACTIONAL";
  }

  return "SIMPLE";
}

function getTrackingModeLabel(form: InventoryItemDraft) {
  const resolvedMode = resolveBackendTrackingMode(form);

  switch (resolvedMode) {
    case "SERIALIZED":
      return "Serialized";
    case "BATCHED":
      return "Batched";
    case "BATCHED_EXPIRY":
      return "Batched + Expiry";
    case "FRACTIONAL":
      return "Fractional";
    case "MIXED_UOM":
      return "Mixed UOM";
    default:
      return "Simple";
  }
}

function deriveTrackingFlags(mode: InventoryItemDraft["inventoryTrackingMode"]) {
  return {
    serialTrackingEnabled: mode === "SERIAL",
    batchTrackingEnabled: mode === "BATCH",
  };
}

function getDefaultAttributeValue(): AttributeDraftValue {
  return {
    text: "",
    number: "",
    boolean: false,
    date: "",
    optionId: "",
    json: "",
  };
}

function getDefaultAttributeBuilderDraft(): AttributeBuilderDraft {
  return {
    attributeDefinitionId: null,
    label: "",
    code: "",
    description: "",
    dataType: "TEXT",
    inputType: "TEXT",
    isRequired: false,
    placeholder: "",
    helpText: "",
    unitLabel: "",
    optionsText: "",
  };
}

function getDefaultSupplierLinkDraft(): SupplierLinkDraft {
  return {
    localId: Math.random().toString(36).slice(2, 10),
    supplierId: "",
    supplierSearch: "",
    supplierProductCode: "",
    supplierProductName: "",
    priority: "1",
    isPreferred: false,
    isActive: true,
  };
}

function slugifyAttributeCode(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function attributeBuilderFromDefinition(
  definition: ProductAttributeDefinitionResponse,
): AttributeBuilderDraft {
  return {
    attributeDefinitionId: definition.id,
    label: definition.label ?? "",
    code: definition.code ?? "",
    description: definition.description ?? "",
    dataType: definition.dataType ?? "TEXT",
    inputType: definition.inputType ?? "TEXT",
    isRequired: definition.isRequired ?? false,
    placeholder: definition.placeholder ?? "",
    helpText: definition.helpText ?? "",
    unitLabel: definition.unitLabel ?? "",
    optionsText: definition.options.map((option) => option.label).join("\n"),
  };
}

function getAttributeDisplayValue(
  definition: ProductAttributeDefinitionResponse,
  value: AttributeDraftValue | undefined,
) {
  if (!value) {
    return "";
  }

  if (definition.dataType === "OPTION") {
    const matchedOption = definition.options.find(
      (option) => String(option.id) === value.optionId,
    );
    return matchedOption?.label ?? "";
  }

  if (definition.dataType === "BOOLEAN") {
    return value.boolean ? "Yes" : "";
  }

  if (definition.dataType === "NUMBER") {
    return value.number;
  }

  if (definition.dataType === "DATE") {
    return value.date;
  }

  if (definition.dataType === "JSON") {
    return value.json;
  }

  return value.text;
}

function hasAttributeValue(
  definition: ProductAttributeDefinitionResponse,
  value: AttributeDraftValue | undefined,
) {
  if (!value) {
    return false;
  }

  if (definition.dataType === "OPTION") {
    return Boolean(value.optionId.trim());
  }

  if (definition.dataType === "BOOLEAN") {
    return value.boolean;
  }

  if (definition.dataType === "NUMBER") {
    return Boolean(value.number.trim());
  }

  if (definition.dataType === "DATE") {
    return Boolean(value.date.trim());
  }

  if (definition.dataType === "JSON") {
    return Boolean(value.json.trim());
  }

  return Boolean(value.text.trim());
}

interface PickerOption {
  id: string;
  label: string;
  meta?: string;
}

interface SearchablePickerProps {
  label: string;
  placeholder: string;
  searchValue: string;
  selectedLabel: string;
  options: PickerOption[];
  onSearchChange: (value: string) => void;
  onSelect: (option: PickerOption) => void;
  disabled?: boolean;
  hint?: string;
  error?: string;
}

function SearchablePicker({
  label,
  placeholder,
  searchValue,
  selectedLabel,
  options,
  onSearchChange,
  onSelect,
  disabled = false,
  hint,
  error,
}: SearchablePickerProps) {
  const [open, setOpen] = useState(false);
  const [internalQuery, setInternalQuery] = useState("");
  const effectiveQuery = open ? internalQuery : searchValue;
  const filteredOptions = useMemo(() => {
    const query = effectiveQuery.trim().toLowerCase();

    if (!query) {
      return options;
    }

    return options.filter((option) =>
      `${option.label} ${option.meta ?? ""}`.toLowerCase().includes(query),
    );
  }, [effectiveQuery, options]);

  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <Popover
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) {
            setInternalQuery("");
          }
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setInternalQuery(searchValue)}
            className="mt-3 flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-left text-sm text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
          >
            <span className="truncate">{selectedLabel || placeholder}</span>
            <ChevronsUpDown className="ml-3 h-4 w-4 shrink-0 text-slate-400" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <div className="border-b border-slate-200 p-3">
            <input
              value={effectiveQuery}
              onChange={(event) => {
                setInternalQuery(event.target.value);
                onSearchChange(event.target.value);
              }}
              placeholder={placeholder}
              className="crm-field"
              autoFocus
            />
          </div>
          <div className="max-h-72 overflow-y-auto p-2">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-6 text-sm text-slate-500">No results found.</div>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    onSelect(option);
                    setInternalQuery("");
                    setOpen(false);
                  }}
                  className="flex w-full items-start gap-3 rounded-2xl px-3 py-2 text-left transition hover:bg-slate-100"
                >
                  <Check
                    className={`mt-0.5 h-4 w-4 shrink-0 ${
                      option.label === selectedLabel ? "text-slate-900" : "text-transparent"
                    }`}
                  />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-slate-900">{option.label}</div>
                    {option.meta ? (
                      <div className="mt-0.5 text-xs text-slate-500">{option.meta}</div>
                    ) : null}
                  </div>
                </button>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
      {hint ? <div className="mt-2 text-xs text-slate-500">{hint}</div> : null}
      {error ? <div className="mt-2 text-sm text-rose-600">{error}</div> : null}
    </div>
  );
}

export function NewItem() {
  const { token, user, hasPermission } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<InventoryItemDraft>(getDefaultItemDraft());
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [warehouses, setWarehouses] = useState<WarehouseResponse[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierSummaryResponse[]>([]);
  const [categories, setCategories] = useState<CategoryOptionResponse[]>([]);
  const [brands, setBrands] = useState<BrandOptionResponse[]>([]);
  const [uoms, setUoms] = useState<UomOptionResponse[]>([]);
  const [taxGroups, setTaxGroups] = useState<TaxGroupOptionResponse[]>([]);
  const [hsnOptions, setHsnOptions] = useState<HsnMasterResponse[]>([]);
  const [attributeDefinitions, setAttributeDefinitions] = useState<ProductAttributeDefinitionResponse[]>([]);
  const [attributeValues, setAttributeValues] = useState<Record<number, AttributeDraftValue>>({});
  const [attributeErrors, setAttributeErrors] = useState<AttributeErrors>({});
  const [attributeUiConfig, setAttributeUiConfig] = useState<ProductAttributeUiConfigResponse | null>(null);
  const [showAttributeBuilder, setShowAttributeBuilder] = useState(false);
  const [attributeBuilder, setAttributeBuilder] = useState<AttributeBuilderDraft>(getDefaultAttributeBuilderDraft());
  const [attributeBuilderError, setAttributeBuilderError] = useState("");
  const [isCreatingAttribute, setIsCreatingAttribute] = useState(false);
  const [warehouseError, setWarehouseError] = useState("");
  const [taxGroupMessage, setTaxGroupMessage] = useState("");
  const [hsnMeta, setHsnMeta] = useState<HsnMasterResponse | null>(null);
  const [taxGroupLocked, setTaxGroupLocked] = useState(false);
  const [supplierLinks, setSupplierLinks] = useState<SupplierLinkDraft[]>([]);

  const categoryPickerOptions = useMemo(
    () =>
      categories.map((option) => ({
        id: String(option.id),
        label: formatCategoryOption(option),
        meta: option.parentCategoryId ? `Parent #${option.parentCategoryId}` : undefined,
      })),
    [categories],
  );

  const brandPickerOptions = useMemo(
    () =>
      brands.map((option) => ({
        id: String(option.id),
        label: formatBrandOption(option),
      })),
    [brands],
  );

  const uomPickerOptions = useMemo(
    () =>
      uoms.map((option) => ({
        id: String(option.id),
        label: formatUomOption(option),
        meta: `Group #${option.uomGroupId ?? "-"}`,
      })),
    [uoms],
  );

  const taxGroupPickerOptions = useMemo(
    () =>
      taxGroups.map((option) => ({
        id: String(option.id),
        label: formatTaxGroupOption(option),
        meta: `CGST ${option.cgstRate ?? "0"} · SGST ${option.sgstRate ?? "0"} · IGST ${option.igstRate ?? "0"}`,
      })),
    [taxGroups],
  );

  const hsnPickerOptions = useMemo(
    () =>
      hsnOptions.map((option) => ({
        id: String(option.id),
        label: formatHsnOption(option),
        meta: `CGST ${option.cgstRate ?? "0"} · SGST ${option.sgstRate ?? "0"} · IGST ${option.igstRate ?? "0"}`,
      })),
    [hsnOptions],
  );

  const supplierPickerOptions = useMemo(
    () =>
      suppliers.map((supplier) => ({
        id: String(supplier.id),
        label: supplier.name,
        meta: [supplier.supplierCode, supplier.phone, supplier.email].filter(Boolean).join(" · "),
      })),
    [suppliers],
  );

  const canManageAttributes =
    attributeUiConfig?.canManage === true || hasPermission("catalog.manage");

  const selectedCategoryId = form.categoryId.trim() ? Number(form.categoryId) : null;
  const selectedBrandId = form.brandId.trim() ? Number(form.brandId) : null;
  const derivedTrackingFlags = deriveTrackingFlags(form.inventoryTrackingMode);

  useEffect(() => {
    async function loadWarehouses() {
      if (!token) {
        return;
      }

      try {
        const response = await fetchWarehouses(token, user.organizationId, user.defaultBranchId ?? undefined);
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
  }, [token, user.defaultBranchId, user.organizationId]);

  useEffect(() => {
    async function loadReferences() {
      if (!token) {
        return;
      }

      try {
        const [supplierResponse, categoryResponse, brandResponse, uomResponse, taxGroupResponse, hsnResponse, attributeUiResponse] =
          await Promise.all([
            fetchSupplierSummaries(token, user.organizationId),
            fetchCategoryOptions(token, user.organizationId),
            fetchBrandOptions(token, user.organizationId),
            fetchUomOptions(token),
            fetchTaxGroupOptions(token, user.organizationId),
            fetchHsnOptions(token),
            fetchProductAttributeUiConfig(token, user.organizationId),
          ]);

        setSuppliers(supplierResponse);
        setCategories(categoryResponse.filter((option) => option.isActive));
        setBrands(brandResponse.filter((option) => option.isActive));
        setUoms(uomResponse.filter((option) => option.isActive));
        setTaxGroups(taxGroupResponse.filter((option) => option.isActive));
        setHsnOptions(hsnResponse.filter((option) => option.isActive));
        setAttributeUiConfig(attributeUiResponse);
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : "Failed to load product references.");
      }
    }

    void loadReferences();
  }, [token, user.organizationId]);

  useEffect(() => {
    if (!token) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void fetchCategoryOptions(token, user.organizationId, form.categorySearch)
        .then((response) => setCategories(response.filter((option) => option.isActive)))
        .catch(() => undefined);
    }, 180);

    return () => window.clearTimeout(timeout);
  }, [form.categorySearch, token, user.organizationId]);

  useEffect(() => {
    if (!token) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void fetchBrandOptions(token, user.organizationId, form.brandSearch)
        .then((response) => setBrands(response.filter((option) => option.isActive)))
        .catch(() => undefined);
    }, 180);

    return () => window.clearTimeout(timeout);
  }, [form.brandSearch, token, user.organizationId]);

  useEffect(() => {
    if (!token) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void fetchUomOptions(token, form.baseUomSearch)
        .then((response) => setUoms(response.filter((option) => option.isActive)))
        .catch(() => undefined);
    }, 180);

    return () => window.clearTimeout(timeout);
  }, [form.baseUomSearch, token]);

  useEffect(() => {
    if (!token) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void fetchTaxGroupOptions(token, user.organizationId, form.taxGroupSearch)
        .then((response) => setTaxGroups(response.filter((option) => option.isActive)))
        .catch(() => undefined);
    }, 180);

    return () => window.clearTimeout(timeout);
  }, [form.taxGroupSearch, token, user.organizationId]);

  useEffect(() => {
    if (!token) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void fetchHsnOptions(token, form.hsnSearch)
        .then((response) => setHsnOptions(response.filter((option) => option.isActive)))
        .catch(() => undefined);
    }, 180);

    return () => window.clearTimeout(timeout);
  }, [form.hsnSearch, token]);

  useEffect(() => {
    if (!token || !form.categoryId.trim() || !form.brandId.trim()) {
      setAttributeDefinitions([]);
      setAttributeValues({});
      setAttributeErrors({});
      setShowAttributeBuilder(false);
      return;
    }

    let cancelled = false;

    void fetchProductAttributeDefinitions(
      token,
      user.organizationId,
      Number(form.categoryId),
      Number(form.brandId),
    )
      .then((response) => {
        if (cancelled) {
          return;
        }

        const activeDefinitions = [...response]
          .filter((definition) => definition.isActive)
          .sort((left, right) => (left.sortOrder ?? 9999) - (right.sortOrder ?? 9999));

        setAttributeDefinitions(activeDefinitions);
        setAttributeValues((currentValues) => {
          const nextValues: Record<number, AttributeDraftValue> = {};

          activeDefinitions.forEach((definition) => {
            nextValues[definition.id] = currentValues[definition.id] ?? getDefaultAttributeValue();
          });

          return nextValues;
        });
        setAttributeErrors({});
      })
      .catch((err) => {
        if (cancelled) {
          return;
        }

        setAttributeDefinitions([]);
        setAttributeValues({});
        setAttributeErrors({});
        setSubmitError(
          err instanceof Error ? err.message : "Failed to load dynamic product attributes.",
        );
      });

    return () => {
      cancelled = true;
    };
  }, [form.brandId, form.categoryId, token, user.organizationId]);

  useEffect(() => {
    if (!attributeBuilder.label.trim()) {
      return;
    }

    setAttributeBuilder((current) => {
      if (current.code.trim()) {
        return current;
      }

      return {
        ...current,
        code: slugifyAttributeCode(current.label),
      };
    });
  }, [attributeBuilder.label]);

  function updateField<Key extends keyof InventoryItemDraft>(
    field: Key,
    value: InventoryItemDraft[Key],
  ) {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
    setErrors((currentErrors) => ({ ...currentErrors, [field]: undefined }));
    setSubmitError("");
  }

  function updateAttributeValue(
    definitionId: number,
    field: keyof AttributeDraftValue,
    value: string | boolean,
  ) {
    setAttributeValues((currentValues) => ({
      ...currentValues,
      [definitionId]: {
        ...(currentValues[definitionId] ?? getDefaultAttributeValue()),
        [field]: value,
      },
    }));
    setAttributeErrors((currentErrors) => {
      const nextErrors = { ...currentErrors };
      delete nextErrors[definitionId];
      return nextErrors;
    });
    setSubmitError("");
  }

  function updateAttributeBuilderField<Key extends keyof AttributeBuilderDraft>(
    field: Key,
    value: AttributeBuilderDraft[Key],
  ) {
    setAttributeBuilder((current) => ({ ...current, [field]: value }));
    setAttributeBuilderError("");
    setSubmitError("");
  }

  function updateSupplierLink(
    localId: string,
    updater: (current: SupplierLinkDraft) => SupplierLinkDraft,
  ) {
    setSupplierLinks((currentLinks) =>
      currentLinks.map((link) => (link.localId === localId ? updater(link) : link)),
    );
    setSubmitError("");
  }

  function addSupplierLink() {
    setSupplierLinks((currentLinks) => [...currentLinks, getDefaultSupplierLinkDraft()]);
    setSubmitError("");
  }

  function removeSupplierLink(localId: string) {
    setSupplierLinks((currentLinks) => currentLinks.filter((link) => link.localId !== localId));
    setSubmitError("");
  }

  function applySupplierSelection(localId: string, option: PickerOption) {
    updateSupplierLink(localId, (current) => ({
      ...current,
      supplierId: option.id,
      supplierSearch: option.label,
    }));
  }

  function markPreferredSupplier(localId: string, checked: boolean) {
    setSupplierLinks((currentLinks) =>
      currentLinks.map((link) => ({
        ...link,
        isPreferred: checked ? link.localId === localId : link.localId === localId ? false : link.isPreferred,
      })),
    );
    setSubmitError("");
  }

  function applyCategorySelection(rawValue: string) {
    const query = rawValue.trim().toLowerCase();
    const selected = categories.find((option) => formatCategoryOption(option).toLowerCase() === query);

    updateField("categorySearch", rawValue);
    updateField("categoryId", selected ? String(selected.id) : "");
  }

  function applyBrandSelection(rawValue: string) {
    const query = rawValue.trim().toLowerCase();
    const selected = brands.find((option) => formatBrandOption(option).toLowerCase() === query);

    updateField("brandSearch", rawValue);
    updateField("brandId", selected ? String(selected.id) : "");
  }

  function applyUomSelection(rawValue: string) {
    const query = rawValue.trim().toLowerCase();
    const selected = uoms.find((option) => formatUomOption(option).toLowerCase() === query);

    updateField("baseUomSearch", rawValue);
    updateField("baseUomId", selected ? String(selected.id) : "");
  }

  function applyTaxGroupSelection(rawValue: string) {
    const query = rawValue.trim().toLowerCase();
    const selected = taxGroups.find((option) => formatTaxGroupOption(option).toLowerCase() === query);

    updateField("taxGroupSearch", rawValue);
    updateField("taxGroupId", selected ? String(selected.id) : "");

    if (selected) {
      setTaxGroupMessage(
        `${selected.name} · CGST ${selected.cgstRate ?? "0"} · SGST ${selected.sgstRate ?? "0"} · IGST ${selected.igstRate ?? "0"}`,
      );
    } else if (!rawValue.trim()) {
      setTaxGroupMessage("");
    }
  }

  async function applyHsnSelection(rawValue: string) {
    const query = rawValue.trim();
    updateField("hsnSearch", rawValue);

    if (!query) {
      updateField("hsnCode", "");
      setHsnMeta(null);
      setTaxGroupMessage("");
      setTaxGroupLocked(false);
      return;
    }

    const selected = hsnOptions.find(
      (option) =>
        option.hsnCode.toLowerCase() === query.toLowerCase() ||
        formatHsnOption(option).toLowerCase() === query.toLowerCase(),
    );

    const normalizedCode = selected?.hsnCode ?? query;
    updateField("hsnCode", normalizedCode);
    setHsnMeta(selected ?? null);

    if (!token) {
      return;
    }

    try {
      const suggestion = await fetchTaxGroupSuggestion(token, user.organizationId, normalizedCode);
      if (suggestion.taxGroupId && suggestion.taxGroupName && suggestion.taxGroupCode) {
        updateField("taxGroupId", String(suggestion.taxGroupId));
        updateField("taxGroupSearch", `${suggestion.taxGroupName} (${suggestion.taxGroupCode})`);
        setTaxGroupLocked(true);
      } else {
        setTaxGroupLocked(false);
      }
      setTaxGroupMessage(suggestion.message);
    } catch (err) {
      setTaxGroupLocked(false);
      setTaxGroupMessage(err instanceof Error ? err.message : "Unable to resolve tax group from HSN.");
    }
  }

  function validateForm() {
    const nextErrors: FormErrors = {};
    const nextAttributeErrors: AttributeErrors = {};

    if (!form.name.trim()) {
      nextErrors.name = "Item name is required.";
    }

    if (!form.sku.trim()) {
      nextErrors.sku = "SKU is required.";
    }

    if (!form.categoryId.trim()) {
      nextErrors.categoryId = "Category is required.";
    }

    if (!form.brandId.trim()) {
      nextErrors.brandId = "Brand is required.";
    }

    if (!form.baseUomId.trim()) {
      nextErrors.baseUomId = "Base UOM is required.";
    }

    if (!form.hsnCode.trim() && !form.taxGroupId.trim()) {
      nextErrors.taxGroupId = "Tax group is required when HSN is not provided.";
    }

    const incompleteSupplierLink = supplierLinks.find((link) => !link.supplierId.trim());
    if (incompleteSupplierLink) {
      setSubmitError("Choose a supplier for each supplier link before saving.");
    }

    attributeDefinitions.forEach((definition) => {
      if (definition.isRequired && !hasAttributeValue(definition, attributeValues[definition.id])) {
        nextAttributeErrors[definition.id] = `${definition.label} is required.`;
      }
    });

    setErrors(nextErrors);
    setAttributeErrors(nextAttributeErrors);
    return (
      Object.keys(nextErrors).length === 0 &&
      Object.keys(nextAttributeErrors).length === 0 &&
      !incompleteSupplierLink
    );
  }

  function renderAttributeField(definition: ProductAttributeDefinitionResponse) {
    const value = attributeValues[definition.id] ?? getDefaultAttributeValue();
    const error = attributeErrors[definition.id];
    const hint =
      definition.helpText ||
      (definition.unitLabel ? `Unit: ${definition.unitLabel}` : undefined);

    if (definition.dataType === "OPTION" || definition.inputType === "SELECT" || definition.inputType === "RADIO") {
      return (
        <SearchablePicker
          label={definition.label}
          placeholder={definition.placeholder || `Select ${definition.label.toLowerCase()}`}
          searchValue={getAttributeDisplayValue(definition, value)}
          selectedLabel={getAttributeDisplayValue(definition, value)}
          options={definition.options
            .filter((option) => option.isActive !== false)
            .sort((left, right) => (left.sortOrder ?? 9999) - (right.sortOrder ?? 9999))
            .map((option) => ({
              id: String(option.id),
              label: option.label,
              meta: option.code,
            }))}
          onSearchChange={() => undefined}
          onSelect={(option) => updateAttributeValue(definition.id, "optionId", option.id)}
          hint={hint}
          error={error}
        />
      );
    }

    if (definition.dataType === "BOOLEAN" || definition.inputType === "CHECKBOX") {
      return (
        <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
          <label className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                {definition.label}
              </div>
              {hint ? <div className="mt-2 text-xs text-slate-500">{hint}</div> : null}
            </div>
            <input
              type="checkbox"
              checked={value.boolean}
              onChange={(event) => updateAttributeValue(definition.id, "boolean", event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
            />
          </label>
          {error ? <div className="mt-2 text-sm text-rose-600">{error}</div> : null}
        </div>
      );
    }

    if (definition.dataType === "DATE" || definition.inputType === "DATE") {
      return (
        <label className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            {definition.label}
          </div>
          <input
            type="date"
            value={value.date}
            onChange={(event) => updateAttributeValue(definition.id, "date", event.target.value)}
            className="crm-field mt-3"
          />
          {hint ? <div className="mt-2 text-xs text-slate-500">{hint}</div> : null}
          {error ? <div className="mt-2 text-sm text-rose-600">{error}</div> : null}
        </label>
      );
    }

    if (definition.dataType === "NUMBER" || definition.inputType === "NUMBER") {
      return (
        <label className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            {definition.label}
          </div>
          <input
            type="number"
            step="0.01"
            value={value.number}
            onChange={(event) => updateAttributeValue(definition.id, "number", event.target.value)}
            placeholder={definition.placeholder || definition.unitLabel || "Enter value"}
            className="crm-field mt-3"
          />
          {hint ? <div className="mt-2 text-xs text-slate-500">{hint}</div> : null}
          {error ? <div className="mt-2 text-sm text-rose-600">{error}</div> : null}
        </label>
      );
    }

    if (definition.dataType === "JSON") {
      return (
        <label className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            {definition.label}
          </div>
          <textarea
            value={value.json}
            onChange={(event) => updateAttributeValue(definition.id, "json", event.target.value)}
            placeholder={definition.placeholder || "Enter structured details"}
            rows={4}
            className="crm-textarea mt-3 resize-none"
          />
          {hint ? <div className="mt-2 text-xs text-slate-500">{hint}</div> : null}
          {error ? <div className="mt-2 text-sm text-rose-600">{error}</div> : null}
        </label>
      );
    }

    if (definition.inputType === "TEXTAREA") {
      return (
        <label className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            {definition.label}
          </div>
          <textarea
            value={value.text}
            onChange={(event) => updateAttributeValue(definition.id, "text", event.target.value)}
            placeholder={definition.placeholder || `Enter ${definition.label.toLowerCase()}`}
            rows={4}
            className="crm-textarea mt-3 resize-none"
          />
          {hint ? <div className="mt-2 text-xs text-slate-500">{hint}</div> : null}
          {error ? <div className="mt-2 text-sm text-rose-600">{error}</div> : null}
        </label>
      );
    }

    return (
      <label className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          {definition.label}
        </div>
        <input
          value={value.text}
          onChange={(event) => updateAttributeValue(definition.id, "text", event.target.value)}
          placeholder={definition.placeholder || `Enter ${definition.label.toLowerCase()}`}
          className="crm-field mt-3"
        />
        {hint ? <div className="mt-2 text-xs text-slate-500">{hint}</div> : null}
        {error ? <div className="mt-2 text-sm text-rose-600">{error}</div> : null}
      </label>
    );
  }

  async function refreshAttributeDefinitions() {
    if (!token || !selectedCategoryId || !selectedBrandId) {
      return;
    }

    const response = await fetchProductAttributeDefinitions(
      token,
      user.organizationId,
      selectedCategoryId,
      selectedBrandId,
    );

    const activeDefinitions = [...response]
      .filter((definition) => definition.isActive)
      .sort((left, right) => (left.sortOrder ?? 9999) - (right.sortOrder ?? 9999));

    setAttributeDefinitions(activeDefinitions);
    setAttributeValues((currentValues) => {
      const nextValues: Record<number, AttributeDraftValue> = {};

      activeDefinitions.forEach((definition) => {
        nextValues[definition.id] = currentValues[definition.id] ?? getDefaultAttributeValue();
      });

      return nextValues;
    });
  }

  async function handleCreateAttributeDefinition() {
    if (!token || !selectedCategoryId || !selectedBrandId) {
      setAttributeBuilderError("Select category and brand before creating a variant attribute.");
      return;
    }

    if (!attributeBuilder.label.trim()) {
      setAttributeBuilderError("Attribute label is required.");
      return;
    }

    if (!attributeBuilder.code.trim()) {
      setAttributeBuilderError("Attribute code is required.");
      return;
    }

    const optionBased =
      attributeBuilder.dataType === "OPTION" ||
      attributeBuilder.inputType === "SELECT" ||
      attributeBuilder.inputType === "RADIO";

    const parsedOptions = optionBased
      ? attributeBuilder.optionsText
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line, index) => ({
            code: slugifyAttributeCode(line),
            label: line,
            sortOrder: index + 1,
            isActive: true,
          }))
      : [];

    if (optionBased && parsedOptions.length === 0) {
      setAttributeBuilderError("Add at least one option for dropdown or radio attributes.");
      return;
    }

    setIsCreatingAttribute(true);
    setAttributeBuilderError("");

    try {
      const payload: CreateProductAttributeDefinitionPayload = {
        organizationId: user.organizationId,
        code: attributeBuilder.code.trim(),
        label: attributeBuilder.label.trim(),
        description: attributeBuilder.description.trim() || undefined,
        dataType: attributeBuilder.dataType,
        inputType: attributeBuilder.inputType,
        isRequired: attributeBuilder.isRequired,
        isActive: true,
        placeholder: attributeBuilder.placeholder.trim() || undefined,
        helpText: attributeBuilder.helpText.trim() || undefined,
        unitLabel: attributeBuilder.unitLabel.trim() || undefined,
        sortOrder: 1,
        options: parsedOptions.length > 0 ? parsedOptions : undefined,
        scopes: [
          {
            categoryId: selectedCategoryId,
            brandId: selectedBrandId,
          },
        ],
      };

      if (attributeBuilder.attributeDefinitionId) {
        await updateProductAttributeDefinition(token, attributeBuilder.attributeDefinitionId, payload);
      } else {
        await createProductAttributeDefinition(token, payload);
      }
      await refreshAttributeDefinitions();
      setAttributeBuilder(getDefaultAttributeBuilderDraft());
      setShowAttributeBuilder(false);
    } catch (err) {
      setAttributeBuilderError(
        err instanceof Error ? err.message : "Failed to create variant attribute.",
      );
    } finally {
      setIsCreatingAttribute(false);
    }
  }

  function handleEditAttributeDefinition(definition: ProductAttributeDefinitionResponse) {
    setAttributeBuilder(attributeBuilderFromDefinition(definition));
    setAttributeBuilderError("");
    setShowAttributeBuilder(true);
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
      const attributePayload = attributeDefinitions
        .map((definition) => {
          const value = attributeValues[definition.id];

          if (!hasAttributeValue(definition, value)) {
            return null;
          }

          return {
            attributeDefinitionId: definition.id,
            valueText:
              definition.dataType === "TEXT" ? value.text.trim() || undefined : undefined,
            valueNumber:
              definition.dataType === "NUMBER" && value.number.trim()
                ? Number(value.number)
                : undefined,
            valueBoolean: definition.dataType === "BOOLEAN" ? value.boolean : undefined,
            valueDate:
              definition.dataType === "DATE" ? value.date.trim() || undefined : undefined,
            valueOptionId:
              definition.dataType === "OPTION" && value.optionId.trim()
                ? Number(value.optionId)
                : undefined,
            valueJson:
              definition.dataType === "JSON" ? value.json.trim() || undefined : undefined,
          };
        })
        .filter((value): value is NonNullable<typeof value> => value !== null);

      const storeProduct = await createStoreProduct(token, {
        organizationId,
        categoryId: Number(form.categoryId),
        brandId: Number(form.brandId),
        baseUomId: Number(form.baseUomId),
        taxGroupId: form.taxGroupId.trim() ? Number(form.taxGroupId) : undefined,
        sku: form.sku.trim().toUpperCase(),
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        hsnCode: form.hsnCode.trim() || undefined,
        inventoryTrackingMode: resolveBackendTrackingMode(form),
        serialTrackingEnabled: derivedTrackingFlags.serialTrackingEnabled,
        batchTrackingEnabled: derivedTrackingFlags.batchTrackingEnabled,
        expiryTrackingEnabled: form.inventoryTrackingMode === "BATCH" ? form.expiryTrackingEnabled : false,
        fractionalQuantityAllowed: form.fractionalQuantityAllowed,
        minStockBaseQty: form.minStockBaseQty.trim()
          ? Number(form.minStockBaseQty)
          : undefined,
        reorderLevelBaseQty: form.reorderLevelBaseQty.trim()
          ? Number(form.reorderLevelBaseQty)
          : undefined,
        defaultWarrantyMonths: form.defaultWarrantyMonths.trim()
          ? Number(form.defaultWarrantyMonths)
          : undefined,
        warrantyTerms: form.warrantyTerms.trim() || undefined,
        isServiceItem: form.itemType === "service",
        isActive: form.status === "active",
        attributes: attributePayload,
      });

      if (supplierLinks.length > 0) {
        const preferredSupplier = supplierLinks.find((link) => link.isPreferred);

        await upsertStoreProductSuppliers(token, organizationId, storeProduct.id, {
          supplierLinks: supplierLinks.map((link) => ({
            supplierId: Number(link.supplierId),
            supplierProductCode: link.supplierProductCode.trim() || undefined,
            supplierProductName: link.supplierProductName.trim() || undefined,
            priority: link.priority.trim() ? Number(link.priority) : undefined,
            isPreferred: link.isPreferred,
            isActive: link.isActive,
          })),
          preferredSupplierId: preferredSupplier?.supplierId
            ? Number(preferredSupplier.supplierId)
            : undefined,
          preferredIsActive: preferredSupplier ? preferredSupplier.isActive : undefined,
        });
      }

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
                onChange={(event) => {
                  const nextMode = event.target.value as InventoryItemDraft["inventoryTrackingMode"];
                  const nextFlags = deriveTrackingFlags(nextMode);
                  updateField("inventoryTrackingMode", nextMode);
                  updateField("serialTrackingEnabled", nextFlags.serialTrackingEnabled);
                  updateField("batchTrackingEnabled", nextFlags.batchTrackingEnabled);
                  if (nextMode !== "BATCH") {
                    updateField("expiryTrackingEnabled", false);
                  }
                }}
                className="crm-select mt-3"
              >
                <option value="STANDARD">Standard</option>
                <option value="SERIAL">Serial Tracked</option>
                <option value="BATCH">Batch Tracked</option>
              </select>
              <div className="mt-3 text-xs text-slate-500">
                Serial and batch flags are set automatically from this selection.
              </div>
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

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="md:col-span-2 xl:col-span-3">
              <SearchablePicker
                label="HSN"
                placeholder="Search HSN code or description"
                searchValue={form.hsnSearch}
                selectedLabel={form.hsnSearch}
                options={hsnPickerOptions}
                onSearchChange={(value) => {
                  updateField("hsnSearch", value);
                  updateField("hsnCode", "");
                  setHsnMeta(null);
                  setTaxGroupLocked(false);
                }}
                onSelect={(option) => {
                  void applyHsnSelection(option.label);
                }}
                hint={
                  form.hsnCode
                    ? `${form.hsnCode}${hsnMeta?.description ? ` · ${hsnMeta.description}` : ""}`
                    : "Optional, but recommended. When present, the backend suggests a matching tax group."
                }
              />
            </div>

            <SearchablePicker
              label="Category"
              placeholder="Search category"
              searchValue={form.categorySearch}
              selectedLabel={form.categorySearch}
              options={categoryPickerOptions}
              onSearchChange={(value) => {
                updateField("categorySearch", value);
                updateField("categoryId", "");
              }}
              onSelect={(option) => applyCategorySelection(option.label)}
              error={errors.categoryId}
            />

            <SearchablePicker
              label="Brand"
              placeholder="Search brand"
              searchValue={form.brandSearch}
              selectedLabel={form.brandSearch}
              options={brandPickerOptions}
              onSearchChange={(value) => {
                updateField("brandSearch", value);
                updateField("brandId", "");
              }}
              onSelect={(option) => applyBrandSelection(option.label)}
              error={errors.brandId}
            />

            <SearchablePicker
              label="Base UOM"
              placeholder="Search UOM"
              searchValue={form.baseUomSearch}
              selectedLabel={form.baseUomSearch}
              options={uomPickerOptions}
              onSearchChange={(value) => {
                updateField("baseUomSearch", value);
                updateField("baseUomId", "");
              }}
              onSelect={(option) => applyUomSelection(option.label)}
              error={errors.baseUomId}
            />

            <SearchablePicker
              label="Tax Group"
              placeholder="Auto-filled from HSN or search manually"
              searchValue={form.taxGroupSearch}
              selectedLabel={form.taxGroupSearch}
              options={taxGroupPickerOptions}
              onSearchChange={(value) => {
                updateField("taxGroupSearch", value);
                updateField("taxGroupId", "");
              }}
              onSelect={(option) => applyTaxGroupSelection(option.label)}
              disabled={taxGroupLocked}
              hint={
                taxGroupLocked
                  ? "Tax group is locked because the selected HSN already resolved a backend match."
                  : taxGroupMessage || undefined
              }
              error={errors.taxGroupId}
            />
          </div>

          <section className="space-y-4 rounded-3xl border border-slate-200 bg-white/70 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Suppliers
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Optional. Link suppliers while creating the product so it is ready for purchasing right away.
                </p>
              </div>
              <button
                type="button"
                onClick={addSupplierLink}
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                <Package2 className="h-4 w-4" />
                <span>Add supplier</span>
              </button>
            </div>

            {supplierLinks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                No suppliers selected yet. You can still save the product without supplier links.
              </div>
            ) : (
              <div className="space-y-4">
                {supplierLinks.map((link, index) => (
                  <div
                    key={link.localId}
                    className="grid gap-4 rounded-3xl border border-slate-200 bg-slate-50/70 p-4 md:grid-cols-2 xl:grid-cols-5"
                  >
                    <div className="md:col-span-2 xl:col-span-2">
                      <SearchablePicker
                        label={`Supplier ${index + 1}`}
                        placeholder="Search supplier"
                        searchValue={link.supplierSearch}
                        selectedLabel={link.supplierSearch}
                        options={supplierPickerOptions}
                        onSearchChange={(value) =>
                          updateSupplierLink(link.localId, (current) => ({
                            ...current,
                            supplierSearch: value,
                            supplierId: "",
                          }))
                        }
                        onSelect={(option) => applySupplierSelection(link.localId, option)}
                      />
                    </div>

                    <label className="rounded-3xl border border-slate-200 bg-white p-4">
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Supplier Product Code
                      </div>
                      <input
                        value={link.supplierProductCode}
                        onChange={(event) =>
                          updateSupplierLink(link.localId, (current) => ({
                            ...current,
                            supplierProductCode: event.target.value,
                          }))
                        }
                        placeholder="Optional supplier code"
                        className="crm-field mt-3"
                      />
                    </label>

                    <label className="rounded-3xl border border-slate-200 bg-white p-4">
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Supplier Product Name
                      </div>
                      <input
                        value={link.supplierProductName}
                        onChange={(event) =>
                          updateSupplierLink(link.localId, (current) => ({
                            ...current,
                            supplierProductName: event.target.value,
                          }))
                        }
                        placeholder="Optional supplier product name"
                        className="crm-field mt-3"
                      />
                    </label>

                    <label className="rounded-3xl border border-slate-200 bg-white p-4">
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Priority
                      </div>
                      <input
                        type="number"
                        min="1"
                        value={link.priority}
                        onChange={(event) =>
                          updateSupplierLink(link.localId, (current) => ({
                            ...current,
                            priority: event.target.value,
                          }))
                        }
                        className="crm-field mt-3"
                      />
                    </label>

                    <div className="flex flex-wrap items-center gap-3 md:col-span-2 xl:col-span-5">
                      <label className="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={link.isPreferred}
                          onChange={(event) => markPreferredSupplier(link.localId, event.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                        />
                        <span>Preferred supplier</span>
                      </label>

                      <label className="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={link.isActive}
                          onChange={(event) =>
                            updateSupplierLink(link.localId, (current) => ({
                              ...current,
                              isActive: event.target.checked,
                            }))
                          }
                          className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                        />
                        <span>Active link</span>
                      </label>

                      <button
                        type="button"
                        onClick={() => removeSupplierLink(link.localId)}
                        className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50"
                      >
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {attributeDefinitions.length > 0 ? (
            <section className="space-y-4 rounded-3xl border border-slate-200 bg-white/70 p-5">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Dynamic Attributes
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Additional product details are loaded from backend attribute definitions for the selected category and brand.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {attributeDefinitions.map((definition) => (
                  <div
                    key={definition.id}
                    className={
                      definition.inputType === "TEXTAREA" || definition.dataType === "JSON"
                        ? "md:col-span-2"
                        : ""
                    }
                  >
                    {renderAttributeField(definition)}
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {selectedCategoryId && selectedBrandId && canManageAttributes ? (
            <section className="space-y-4 rounded-3xl border border-dashed border-slate-300 bg-slate-50/70 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Variant Attributes
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Add a new dynamic product field for this category and brand without leaving product creation.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowAttributeBuilder((current) => !current);
                    setAttributeBuilderError("");
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>{showAttributeBuilder ? "Hide builder" : "Add variant attribute"}</span>
                </button>
              </div>

              {attributeDefinitions.length > 0 ? (
                <div className="space-y-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Existing attributes
                  </div>
                  <div className="grid gap-3">
                    {attributeDefinitions.map((definition) => (
                      <div
                        key={definition.id}
                        className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-900">
                            {definition.label}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {definition.code} · {definition.inputType}
                            {definition.options.length > 0
                              ? ` · Options: ${definition.options.map((option) => option.label).join(", ")}`
                              : ""}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleEditAttributeDefinition(definition)}
                          className="inline-flex items-center justify-center rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                        >
                          Edit attribute
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {showAttributeBuilder ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="rounded-3xl border border-slate-200 bg-white p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Attribute Label
                    </div>
                    <input
                      value={attributeBuilder.label}
                      onChange={(event) => updateAttributeBuilderField("label", event.target.value)}
                      placeholder="Example: Storage Size"
                      className="crm-field mt-3"
                    />
                  </label>

                  <label className="rounded-3xl border border-slate-200 bg-white p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Attribute Code
                    </div>
                    <input
                      value={attributeBuilder.code}
                      onChange={(event) => updateAttributeBuilderField("code", event.target.value)}
                      placeholder="storage_size"
                      className="crm-field mt-3"
                    />
                  </label>

                  <label className="rounded-3xl border border-slate-200 bg-white p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Data Type
                    </div>
                    <select
                      value={attributeBuilder.dataType}
                      onChange={(event) => updateAttributeBuilderField("dataType", event.target.value)}
                      className="crm-select mt-3"
                    >
                      {(attributeUiConfig?.dataTypes ?? []).map((option) => (
                        <option key={option.code} value={option.code}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="rounded-3xl border border-slate-200 bg-white p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Input Type
                    </div>
                    <select
                      value={attributeBuilder.inputType}
                      onChange={(event) => updateAttributeBuilderField("inputType", event.target.value)}
                      className="crm-select mt-3"
                    >
                      {(attributeUiConfig?.inputTypes ?? []).map((option) => (
                        <option key={option.code} value={option.code}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="rounded-3xl border border-slate-200 bg-white p-4 md:col-span-2">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Description
                    </div>
                    <input
                      value={attributeBuilder.description}
                      onChange={(event) => updateAttributeBuilderField("description", event.target.value)}
                      placeholder="Short note explaining this attribute"
                      className="crm-field mt-3"
                    />
                  </label>

                  <label className="rounded-3xl border border-slate-200 bg-white p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Placeholder
                    </div>
                    <input
                      value={attributeBuilder.placeholder}
                      onChange={(event) => updateAttributeBuilderField("placeholder", event.target.value)}
                      placeholder="Shown inside the input"
                      className="crm-field mt-3"
                    />
                  </label>

                  <label className="rounded-3xl border border-slate-200 bg-white p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Unit Label
                    </div>
                    <input
                      value={attributeBuilder.unitLabel}
                      onChange={(event) => updateAttributeBuilderField("unitLabel", event.target.value)}
                      placeholder="Optional, for number fields"
                      className="crm-field mt-3"
                    />
                  </label>

                  <label className="rounded-3xl border border-slate-200 bg-white p-4 md:col-span-2">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Help Text
                    </div>
                    <input
                      value={attributeBuilder.helpText}
                      onChange={(event) => updateAttributeBuilderField("helpText", event.target.value)}
                      placeholder="Explain how users should fill this field"
                      className="crm-field mt-3"
                    />
                  </label>

                  {(attributeBuilder.dataType === "OPTION" ||
                    attributeBuilder.inputType === "SELECT" ||
                    attributeBuilder.inputType === "RADIO") ? (
                    <label className="rounded-3xl border border-slate-200 bg-white p-4 md:col-span-2">
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Options
                      </div>
                      <textarea
                        value={attributeBuilder.optionsText}
                        onChange={(event) => updateAttributeBuilderField("optionsText", event.target.value)}
                        placeholder={"One option per line\n64 GB\n128 GB\n256 GB"}
                        rows={5}
                        className="crm-textarea mt-3 resize-none"
                      />
                    </label>
                  ) : null}

                  <label className="flex items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white px-4 py-4 md:col-span-2">
                    <span className="text-sm font-medium text-slate-700">Required field</span>
                    <input
                      type="checkbox"
                      checked={attributeBuilder.isRequired}
                      onChange={(event) => updateAttributeBuilderField("isRequired", event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                    />
                  </label>

                  {attributeBuilderError ? (
                    <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 md:col-span-2">
                      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                      <span>{attributeBuilderError}</span>
                    </div>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-3 md:col-span-2">
                    <button
                      type="button"
                      onClick={() => void handleCreateAttributeDefinition()}
                      disabled={isCreatingAttribute}
                      className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>
                        {isCreatingAttribute
                          ? attributeBuilder.attributeDefinitionId
                            ? "Saving..."
                            : "Creating..."
                          : attributeBuilder.attributeDefinitionId
                            ? "Save attribute"
                            : "Create attribute"}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAttributeBuilder(getDefaultAttributeBuilderDraft());
                        setAttributeBuilderError("");
                        setShowAttributeBuilder(false);
                      }}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                    >
                      <span>Cancel</span>
                    </button>
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}

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

            <label className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Default Warranty
              </div>
              <input
                type="number"
                min="0"
                step="1"
                value={form.defaultWarrantyMonths}
                onChange={(event) => updateField("defaultWarrantyMonths", event.target.value)}
                placeholder="Months"
                className="crm-field mt-3"
              />
              <div className="mt-2 text-xs text-slate-500">
                Applied automatically when this product is sold.
              </div>
            </label>
          </div>

          <label className="block rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Warranty Terms
            </div>
            <textarea
              value={form.warrantyTerms}
              onChange={(event) => updateField("warrantyTerms", event.target.value)}
              placeholder="Warranty coverage, exclusions, claim notes, or standard terms for this product"
              rows={3}
              className="crm-textarea mt-3 resize-none"
            />
          </label>

          <div className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <span className="font-medium text-slate-700">Tracking flags:</span>
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${derivedTrackingFlags.serialTrackingEnabled ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-600"}`}>
                Serial {derivedTrackingFlags.serialTrackingEnabled ? "On" : "Off"}
              </span>
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${derivedTrackingFlags.batchTrackingEnabled ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-600"}`}>
                Batch {derivedTrackingFlags.batchTrackingEnabled ? "On" : "Off"}
              </span>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {form.inventoryTrackingMode === "BATCH" ? (
                <label className="flex items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white px-4 py-4">
                  <div>
                    <span className="text-sm font-medium text-slate-700">Expiry Tracking</span>
                    <div className="mt-1 text-xs text-slate-500">Track manufactured or expiry dates for batch-controlled stock.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={form.expiryTrackingEnabled}
                    onChange={(event) => updateField("expiryTrackingEnabled", event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                  />
                </label>
              ) : (
                <div className="hidden md:block" />
              )}
              <label className="flex items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white px-4 py-4">
                <div>
                  <span className="text-sm font-medium text-slate-700">Fractional Quantity</span>
                  <div className="mt-1 text-xs text-slate-500">Use for items sold in decimals like wire, oil, or cable.</div>
                </div>
                <input
                  type="checkbox"
                  checked={form.fractionalQuantityAllowed}
                  onChange={(event) => updateField("fractionalQuantityAllowed", event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                />
              </label>
            </div>
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
              <span className="font-medium text-slate-900">{getTrackingModeLabel(form)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span>Category / Brand</span>
              <span className="font-medium text-slate-900">
                {form.categorySearch || "-"} / {form.brandSearch || "-"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span>HSN / Tax</span>
              <span className="font-medium text-slate-900">
                {form.hsnCode || "-"} / {form.taxGroupSearch || "-"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span>Base UOM</span>
              <span className="font-medium text-slate-900">
                {form.baseUomSearch || "-"}
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
            <div className="flex items-center justify-between gap-4">
              <span>Default Warranty</span>
              <span className="font-medium text-slate-900">
                {form.defaultWarrantyMonths.trim()
                  ? `${form.defaultWarrantyMonths.trim()} months`
                  : "Not set"}
              </span>
            </div>
            <div className="flex items-start justify-between gap-4">
              <span>Warranty Terms</span>
              <span className="max-w-[180px] text-right font-medium text-slate-900">
                {form.warrantyTerms.trim() || "Not set"}
              </span>
            </div>
            {attributeDefinitions.length > 0 ? (
              <div className="border-t border-slate-200 pt-4">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Attributes
                </div>
                <div className="mt-3 space-y-3">
                  {attributeDefinitions.map((definition) => {
                    const displayValue = getAttributeDisplayValue(
                      definition,
                      attributeValues[definition.id],
                    );

                    if (!displayValue) {
                      return null;
                    }

                    return (
                      <div
                        key={definition.id}
                        className="flex items-center justify-between gap-4"
                      >
                        <span>{definition.label}</span>
                        <span className="font-medium text-slate-900">
                          {displayValue}
                          {definition.unitLabel ? ` ${definition.unitLabel}` : ""}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
            <Sparkles className="h-4 w-4 text-slate-500" />
            <span>Current backend fit</span>
          </div>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
            <li>Store product creation now uses searchable catalog references and submits their IDs behind the scenes.</li>
            <li>HSN can drive tax-group suggestion automatically, while still allowing manual tax-group selection when needed.</li>
            <li>Category and brand now also drive dynamic product attributes, which render directly from backend metadata.</li>
            <li>Opening stock is optional and is posted separately as a manual inventory adjustment.</li>
            <li>The backend still remains the source of truth for HSN validation and final tax-group resolution.</li>
          </ul>
        </section>
      </aside>
    </div>
  );
}
