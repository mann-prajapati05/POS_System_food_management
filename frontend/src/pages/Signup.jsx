import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { signup } from "../services/authService";
import useAuthStore from "../store/authStore";

function getRedirectPath(role) {
  if (role === "admin") return "/dashboard";
  if (role === "kitchen") return "/kitchen";
  return "/pos";
}

export default function Signup() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "staff",
    posName: "",
    posUniqueId: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const onChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        posName: formData.posName,
        posUniqueId: formData.posUniqueId,
      };

      const response = await signup(payload);
      toast.success("Account created successfully");
      setAuth({ token: response.token, user: response.user });
      navigate(getRedirectPath(response.user.role), { replace: true });
    } catch (requestError) {
      const message =
        requestError?.response?.data?.error ||
        "Signup failed. Please try again.";
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const roles = [
    { value: "staff", label: "Staff", desc: "POS terminal access" },
    { value: "kitchen", label: "Kitchen", desc: "Kitchen display access" },
  ];

  return (
    <main className="flex min-h-screen animate-fade-in">
      {/* Left dark panel */}
      <div className="hidden w-1/2 flex-col justify-between bg-linen-primary p-10 lg:flex">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-linen-sm bg-white/10 font-mono text-[13px] font-semibold text-white">
            POS
          </div>
        </div>

        <div className="max-w-md">
          <p className="text-[36px] font-light leading-[1.3] text-white">
            Every great dining experience starts here.
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            {["Table Management", "Kitchen Display", "Smart Payments"].map((feature) => (
              <span
                key={feature}
                className="rounded-linen-pill border border-white/[0.12] bg-white/[0.08] px-3 py-1.5 text-xs text-white"
              >
                {feature}
              </span>
            ))}
          </div>
        </div>

        <p className="text-xs text-white/30">Odoo POS Cafe v1.0</p>
      </div>

      {/* Right form panel */}
      <div className="flex w-full items-center justify-center bg-linen-bg px-6 py-10 lg:w-1/2">
        <section className="w-full max-w-[400px]">
          <h1 className="text-[28px] font-semibold text-linen-text-primary">
            Create your account
          </h1>
          <p className="mt-1 text-sm text-linen-text-secondary">
            Set up access to POS Cafe
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-5">
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.07em] text-linen-text-secondary">
                Full Name
              </span>
              <input
                name="name"
                value={formData.name}
                onChange={onChange}
                required
                className="h-11 w-full rounded-linen border border-linen-border bg-white px-3 text-sm text-linen-text-primary outline-none transition-colors placeholder:text-linen-text-muted focus:border-linen-primary"
                placeholder="Ava Manager"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.07em] text-linen-text-secondary">
                Email
              </span>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={onChange}
                required
                className="h-11 w-full rounded-linen border border-linen-border bg-white px-3 text-sm text-linen-text-primary outline-none transition-colors placeholder:text-linen-text-muted focus:border-linen-primary"
                placeholder="you@company.com"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.07em] text-linen-text-secondary">
                Password
              </span>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={onChange}
                minLength={8}
                required
                className="h-11 w-full rounded-linen border border-linen-border bg-white px-3 text-sm text-linen-text-primary outline-none transition-colors placeholder:text-linen-text-muted focus:border-linen-primary"
                placeholder="At least 8 characters"
              />
            </label>

            {/* Role selector as toggle cards */}
            <div>
              <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.07em] text-linen-text-secondary">
                Role
              </span>
              <div className="grid grid-cols-2 gap-3">
                {roles.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, role: r.value }))}
                    className={`flex flex-col items-start rounded-linen-lg border p-3 text-left transition-colors ${
                      formData.role === r.value
                        ? "border-linen-primary bg-linen-bg"
                        : "border-linen-border bg-white hover:border-linen-border-strong"
                    }`}
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className="text-sm font-medium text-linen-text-primary">{r.label}</span>
                      {formData.role === r.value && (
                        <svg className="h-4 w-4 text-linen-primary" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      )}
                    </div>
                    <span className="mt-0.5 text-xs text-linen-text-muted">{r.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-linen-lg border border-linen-border bg-linen-surface-2 p-4">
              <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.07em] text-linen-text-secondary">
                POS Credentials (from your admin)
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  name="posName"
                  value={formData.posName}
                  onChange={onChange}
                  required
                  className="h-10 w-full rounded-linen border border-linen-border bg-white px-3 text-sm outline-none transition-colors placeholder:text-linen-text-muted focus:border-linen-primary"
                  placeholder="POS name"
                />
                <input
                  name="posUniqueId"
                  value={formData.posUniqueId}
                  onChange={onChange}
                  required
                  className="h-10 w-full rounded-linen border border-linen-border bg-white px-3 text-sm outline-none transition-colors placeholder:text-linen-text-muted focus:border-linen-primary"
                  placeholder="POS unique ID"
                />
              </div>
            </div>

            {error && (
              <p className="rounded-linen bg-red-50 px-3 py-2 text-sm text-linen-danger">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-linen bg-linen-primary text-sm font-medium text-white transition-colors hover:bg-linen-primary-hover disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              )}
              {submitting ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-linen-text-secondary">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-medium text-linen-text-primary hover:underline"
            >
              Sign in
            </Link>
          </p>
          <p className="mt-2 text-center text-sm text-linen-text-secondary">
            Admin?{" "}
            <Link to="/admin/signup" className="font-medium text-linen-text-primary hover:underline">
              Go to admin signup
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
