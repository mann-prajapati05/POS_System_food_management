import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import useAuthStore from "../store/authStore";
import { login } from "../services/authService";

function getRedirectPath(role) {
  if (role === "admin") return "/dashboard";
  if (role === "kitchen") return "/kitchen";
  return "/pos";
}

export default function Login() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    posName: "",
    posUniqueId: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const onChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const response = await login(formData);
      setAuth({ token: response.token, user: response.user });
      toast.success("Welcome back!");
      navigate(getRedirectPath(response.user.role), { replace: true });
    } catch (requestError) {
      const message =
        requestError?.response?.data?.error ||
        "Login failed. Please check your credentials.";
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

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
      <div className="flex w-full items-center justify-center bg-linen-bg px-6 lg:w-1/2">
        <section className="w-full max-w-[360px]">
          <h1 className="text-[28px] font-semibold text-linen-text-primary">
            Welcome back
          </h1>
          <p className="mt-1 text-sm text-linen-text-secondary">
            Sign in to your POS account
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-5">
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
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={onChange}
                  required
                  className="h-11 w-full rounded-linen border border-linen-border bg-white px-3 pr-10 text-sm text-linen-text-primary outline-none transition-colors placeholder:text-linen-text-muted focus:border-linen-primary"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-linen-text-secondary hover:text-linen-text-primary"
                  tabIndex={-1}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.07em] text-linen-text-secondary">
                  POS Name
                </span>
                <input
                  type="text"
                  name="posName"
                  value={formData.posName}
                  onChange={onChange}
                  className="h-11 w-full rounded-linen border border-linen-border bg-white px-3 text-sm text-linen-text-primary outline-none transition-colors placeholder:text-linen-text-muted focus:border-linen-primary"
                  placeholder="Provided by admin"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.07em] text-linen-text-secondary">
                  POS Unique ID
                </span>
                <input
                  type="text"
                  name="posUniqueId"
                  value={formData.posUniqueId}
                  onChange={onChange}
                  className="h-11 w-full rounded-linen border border-linen-border bg-white px-3 text-sm text-linen-text-primary outline-none transition-colors placeholder:text-linen-text-muted focus:border-linen-primary"
                  placeholder="Provided by admin"
                />
              </label>
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
              {submitting ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-linen-border" />
            <span className="text-xs text-linen-text-muted">or</span>
            <div className="h-px flex-1 bg-linen-border" />
          </div>

          <p className="text-center text-sm text-linen-text-secondary">
            Don't have an account?{" "}
            <Link
              to="/signup"
              className="font-medium text-linen-text-primary hover:underline"
            >
              Sign Up
            </Link>
          </p>
          <p className="mt-2 text-center text-sm text-linen-text-secondary">
            Admin?{" "}
            <Link to="/admin/login" className="font-medium text-linen-text-primary hover:underline">
              Go to admin login
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
