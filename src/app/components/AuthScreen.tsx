import { useState } from "react";
import { LockKeyhole, Store } from "lucide-react";
import { useAuth } from "../auth";

type AuthMode = "login" | "register";

const initialForm = {
  username: "",
  email: "",
  password: "",
  firstName: "",
  lastName: "",
  phone: "",
};

export function AuthScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<AuthMode>("login");
  const [formData, setFormData] = useState(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const updateField = (field: keyof typeof initialForm, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      if (mode === "login") {
        await login({
          username: formData.username,
          password: formData.password,
        });
      } else {
        await register({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName || undefined,
          lastName: formData.lastName || undefined,
          phone: formData.phone || undefined,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto grid max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl lg:grid-cols-[1.1fr_0.9fr]">
        <section className="bg-slate-900 px-8 py-12 text-white lg:px-12">
          <div className="mb-10 inline-flex items-center gap-3 rounded-full border border-white/20 px-4 py-2 text-sm">
            <Store className="h-4 w-4" />
            Retail Management ERP
          </div>
          <h1 className="max-w-md text-4xl font-semibold leading-tight">
            Sign in with your backend account and continue straight into your ERP workspace.
          </h1>
          <p className="mt-4 max-w-lg text-slate-300">
            Login now returns your organization, default branch, roles, permissions, and subscription
            context. The app uses that session directly, so no extra business or branch setup is required after login.
          </p>

          <div className="mt-10 space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="text-sm text-slate-300">Session data used after login</div>
              <div className="mt-1 text-lg">Organization, branch, subscription, permissions</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="text-sm text-slate-300">Access control</div>
              <div className="mt-1 text-lg">Menus, pages, and actions are gated from the JWT matrix</div>
            </div>
          </div>
        </section>

        <section className="px-8 py-10 lg:px-12">
          <div className="mb-8 flex rounded-full bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError("");
              }}
              className={`flex-1 rounded-full px-4 py-2 transition-colors ${
                mode === "login" ? "bg-white shadow text-slate-900" : "text-slate-600"
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setError("");
              }}
              className={`flex-1 rounded-full px-4 py-2 transition-colors ${
                mode === "register" ? "bg-white shadow text-slate-900" : "text-slate-600"
              }`}
            >
              Register
            </button>
          </div>

          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-xl bg-blue-50 p-3 text-blue-700">
              <LockKeyhole className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">
                {mode === "login" ? "Welcome back" : "Create your account"}
              </h2>
              <p className="text-sm text-slate-600">
                {mode === "login"
                  ? "Use your backend credentials to open the ERP workspace."
                  : "New users are created through the backend and signed in automatically."}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm text-slate-700">Username</label>
              <input
                type="text"
                required
                value={formData.username}
                onChange={(e) => updateField("username", e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>

            {mode === "register" && (
              <div>
                <label className="mb-2 block text-sm text-slate-700">Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm text-slate-700">Password</label>
              <input
                type="password"
                required
                minLength={mode === "register" ? 6 : undefined}
                value={formData.password}
                onChange={(e) => updateField("password", e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>

            {mode === "register" && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm text-slate-700">First Name</label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => updateField("firstName", e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm text-slate-700">Last Name</label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => updateField("lastName", e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-700">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                </div>
              </>
            )}

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting
                ? "Please wait..."
                : mode === "login"
                  ? "Login"
                  : "Register and continue"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
