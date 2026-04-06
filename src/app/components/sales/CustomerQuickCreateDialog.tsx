import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../../auth";
import { ApiError } from "../../lib/api";
import { createCustomer } from "../customers/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import type { SalesCustomerSummary } from "./api";

interface CustomerQuickCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (customer: SalesCustomerSummary) => void;
}

interface CustomerQuickDraft {
  fullName: string;
  phone: string;
  email: string;
  state: string;
  stateCode: string;
  billingAddress: string;
}

const initialDraft: CustomerQuickDraft = {
  fullName: "",
  phone: "",
  email: "",
  state: "",
  stateCode: "",
  billingAddress: "",
};

export function CustomerQuickCreateDialog({
  open,
  onOpenChange,
  onCreated,
}: CustomerQuickCreateDialogProps) {
  const { token, user } = useAuth();
  const [form, setForm] = useState<CustomerQuickDraft>(initialDraft);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField<Key extends keyof CustomerQuickDraft>(
    field: Key,
    value: CustomerQuickDraft[Key],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
    setError("");
  }

  function reset() {
    setForm(initialDraft);
    setError("");
    setIsSubmitting(false);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token || !user?.organizationId || !user.defaultBranchId) {
      setError("Organization or branch context is missing in the current session.");
      return;
    }

    if (!form.fullName.trim()) {
      setError("Customer name is required.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const created = await createCustomer(token, user.organizationId, user.defaultBranchId, {
        fullName: form.fullName.trim(),
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        state: form.state.trim() || undefined,
        stateCode: form.stateCode.trim() || undefined,
        billingAddress: form.billingAddress.trim() || undefined,
        status: "ACTIVE",
      });

      onCreated({
        id: created.id,
        customerCode: created.customerCode,
        fullName: created.fullName,
        email: created.email,
        phone: created.phone,
        gstin: created.gstin,
        stateCode: created.stateCode,
        status: created.status,
      });
      reset();
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError && err.validationErrors) {
        setError(
          err.validationErrors.fullName ||
            err.validationErrors.email ||
            "Failed to create customer.",
        );
      } else {
        setError(err instanceof Error ? err.message : "Failed to create customer.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          reset();
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Customer</DialogTitle>
          <DialogDescription>
            Add a customer without leaving the sales flow.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label>
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Customer Name
              </div>
              <input
                value={form.fullName}
                onChange={(event) => updateField("fullName", event.target.value)}
                className="crm-field"
                placeholder="Customer name"
              />
            </label>
            <label>
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Phone
              </div>
              <input
                value={form.phone}
                onChange={(event) => updateField("phone", event.target.value)}
                className="crm-field"
                placeholder="Phone"
              />
            </label>
            <label>
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Email
              </div>
              <input
                value={form.email}
                onChange={(event) => updateField("email", event.target.value)}
                className="crm-field"
                placeholder="Email"
              />
            </label>
            <label>
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                State
              </div>
              <input
                value={form.state}
                onChange={(event) => updateField("state", event.target.value)}
                className="crm-field"
                placeholder="State name"
              />
            </label>
            <label>
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                State Code
              </div>
              <input
                value={form.stateCode}
                onChange={(event) => updateField("stateCode", event.target.value)}
                className="crm-field uppercase"
                placeholder="KA"
              />
            </label>
          </div>

          <label>
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Billing Address
            </div>
            <textarea
              value={form.billingAddress}
              onChange={(event) => updateField("billingAddress", event.target.value)}
              rows={3}
              className="crm-textarea resize-none"
              placeholder="Billing address"
            />
          </label>

          {error ? (
            <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{isSubmitting ? "Creating..." : "Create customer"}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                reset();
                onOpenChange(false);
              }}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              <span>Cancel</span>
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
