import { AlertCircle, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../../auth";
import { ApiError } from "../../lib/api";
import { createCustomer } from "./api";

interface CustomerFormState {
  customerCode: string;
  fullName: string;
  customerType: string;
  legalName: string;
  tradeName: string;
  phone: string;
  email: string;
  gstin: string;
  linkedOrganizationId: string;
  billingAddress: string;
  shippingAddress: string;
  state: string;
  stateCode: string;
  contactPersonName: string;
  contactPersonPhone: string;
  contactPersonEmail: string;
  creditLimit: string;
  isPlatformLinked: boolean;
  notes: string;
  status: string;
}

type FormErrors = Partial<Record<keyof CustomerFormState, string>>;

const initialForm: CustomerFormState = {
  customerCode: "",
  fullName: "",
  customerType: "BUSINESS",
  legalName: "",
  tradeName: "",
  phone: "",
  email: "",
  gstin: "",
  linkedOrganizationId: "",
  billingAddress: "",
  shippingAddress: "",
  state: "",
  stateCode: "",
  contactPersonName: "",
  contactPersonPhone: "",
  contactPersonEmail: "",
  creditLimit: "",
  isPlatformLinked: false,
  notes: "",
  status: "ACTIVE",
};

export function NewCustomer() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<CustomerFormState>(initialForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField<Key extends keyof CustomerFormState>(field: Key, value: CustomerFormState[Key]) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setSubmitError("");
  }

  function validateForm() {
    const nextErrors: FormErrors = {};

    if (!form.customerCode.trim()) {
      nextErrors.customerCode = "Customer code is required.";
    }

    if (!form.fullName.trim()) {
      nextErrors.fullName = "Customer name is required.";
    }

    if (form.email.trim() && !/\S+@\S+\.\S+/.test(form.email.trim())) {
      nextErrors.email = "Enter a valid email address.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token || !user?.organizationId || !user.defaultBranchId) {
      setSubmitError("Organization or branch context is missing in the current session.");
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    try {
      await createCustomer(token, user.organizationId, user.defaultBranchId, {
        customerCode: form.customerCode.trim().toUpperCase(),
        fullName: form.fullName.trim(),
        customerType: form.customerType || undefined,
        legalName: form.legalName.trim() || undefined,
        tradeName: form.tradeName.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        gstin: form.gstin.trim() || undefined,
        linkedOrganizationId: form.linkedOrganizationId.trim()
          ? Number(form.linkedOrganizationId)
          : undefined,
        billingAddress: form.billingAddress.trim() || undefined,
        shippingAddress: form.shippingAddress.trim() || undefined,
        state: form.state.trim() || undefined,
        stateCode: form.stateCode.trim() || undefined,
        contactPersonName: form.contactPersonName.trim() || undefined,
        contactPersonPhone: form.contactPersonPhone.trim() || undefined,
        contactPersonEmail: form.contactPersonEmail.trim() || undefined,
        creditLimit: form.creditLimit.trim() ? Number(form.creditLimit) : undefined,
        isPlatformLinked: form.isPlatformLinked,
        notes: form.notes.trim() || undefined,
        status: form.status,
      });

      navigate("/people/customers");
    } catch (err) {
      if (err instanceof ApiError && err.validationErrors) {
        setErrors((current) => ({
          ...current,
          customerCode: err.validationErrors?.customerCode || current.customerCode,
          fullName: err.validationErrors?.fullName || current.fullName,
          email: err.validationErrors?.email || current.email,
        }));
      }

      setSubmitError(err instanceof Error ? err.message : "Failed to create customer.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_320px]">
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              People
            </div>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">New Customer</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              This form matches the ERP customer contract: customer code, legal or trade identity,
              GST details, billing and shipping addresses, and contact ownership.
            </p>
          </div>

          <Link
            to="/people/customers"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to customers</span>
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <label>
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Customer Code
              </div>
              <input
                value={form.customerCode}
                onChange={(event) => updateField("customerCode", event.target.value)}
                className="crm-field uppercase"
              />
              {errors.customerCode && <div className="mt-2 text-sm text-rose-600">{errors.customerCode}</div>}
            </label>
            <label>
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Full Name
              </div>
              <input
                value={form.fullName}
                onChange={(event) => updateField("fullName", event.target.value)}
                className="crm-field"
              />
              {errors.fullName && <div className="mt-2 text-sm text-rose-600">{errors.fullName}</div>}
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label>
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Customer Type
              </div>
              <select
                value={form.customerType}
                onChange={(event) => updateField("customerType", event.target.value)}
                className="crm-select"
              >
                <option value="INDIVIDUAL">Individual</option>
                <option value="BUSINESS">Business</option>
                <option value="WHOLESALER">Wholesaler</option>
                <option value="RETAILER">Retailer</option>
                <option value="DISTRIBUTOR">Distributor</option>
              </select>
            </label>
            <label>
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Legal Name
              </div>
              <input
                value={form.legalName}
                onChange={(event) => updateField("legalName", event.target.value)}
                className="crm-field"
              />
            </label>
            <label>
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Trade Name
              </div>
              <input
                value={form.tradeName}
                onChange={(event) => updateField("tradeName", event.target.value)}
                className="crm-field"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {(["phone", "email", "gstin", "stateCode"] as const).map((field) => (
              <label key={field}>
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {field}
                </div>
                <input
                  value={form[field]}
                  onChange={(event) => updateField(field, event.target.value)}
                  className="crm-field"
                />
                {errors[field] && <div className="mt-2 text-sm text-rose-600">{errors[field]}</div>}
              </label>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label>
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Billing Address
              </div>
              <textarea
                value={form.billingAddress}
                onChange={(event) => updateField("billingAddress", event.target.value)}
                rows={3}
                className="crm-textarea"
              />
            </label>
            <label>
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Shipping Address
              </div>
              <textarea
                value={form.shippingAddress}
                onChange={(event) => updateField("shippingAddress", event.target.value)}
                rows={3}
                className="crm-textarea"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label>
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                State
              </div>
              <input
                value={form.state}
                onChange={(event) => updateField("state", event.target.value)}
                className="crm-field"
              />
            </label>
            <label>
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Contact Person
              </div>
              <input
                value={form.contactPersonName}
                onChange={(event) => updateField("contactPersonName", event.target.value)}
                className="crm-field"
              />
            </label>
            <label>
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Contact Phone
              </div>
              <input
                value={form.contactPersonPhone}
                onChange={(event) => updateField("contactPersonPhone", event.target.value)}
                className="crm-field"
              />
            </label>
            <label>
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Contact Email
              </div>
              <input
                value={form.contactPersonEmail}
                onChange={(event) => updateField("contactPersonEmail", event.target.value)}
                className="crm-field"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label>
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Credit Limit
              </div>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.creditLimit}
                onChange={(event) => updateField("creditLimit", event.target.value)}
                className="crm-field"
              />
            </label>
            <label>
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Linked Organization ID
              </div>
              <input
                value={form.linkedOrganizationId}
                onChange={(event) => updateField("linkedOrganizationId", event.target.value)}
                className="crm-field"
              />
            </label>
            <label>
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Status
              </div>
              <select
                value={form.status}
                onChange={(event) => updateField("status", event.target.value)}
                className="crm-select"
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="ON_HOLD">On Hold</option>
              </select>
            </label>
            <label className="flex items-center gap-3 pt-7">
              <input
                type="checkbox"
                checked={form.isPlatformLinked}
                onChange={(event) => updateField("isPlatformLinked", event.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              <span className="text-sm text-slate-700">Platform-linked customer</span>
            </label>
          </div>

          <label>
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Notes
            </div>
            <textarea
              value={form.notes}
              onChange={(event) => updateField("notes", event.target.value)}
              rows={3}
              className="crm-textarea"
            />
          </label>

          {submitError && (
            <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 pt-5">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{isSubmitting ? "Saving..." : "Create customer"}</span>
            </button>
          </div>
        </form>
      </section>

      <aside className="space-y-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="text-sm font-semibold text-slate-900">ERP Notes</div>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
            <li>Customer code is mandatory in phase 1.</li>
            <li>Addresses are split into billing and shipping.</li>
            <li>Commercial terms are handled in a separate customer terms flow.</li>
          </ul>
        </section>
      </aside>
    </div>
  );
}
