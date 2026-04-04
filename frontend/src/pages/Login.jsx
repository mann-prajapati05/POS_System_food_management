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
    <main className="relative flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(56,189,248,0.16),transparent_35%),radial-gradient(circle_at_80%_20%,rgba(16,185,129,0.14),transparent_35%)]" />

      <section className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-[0_30px_80px_-35px_rgba(15,23,42,0.35)]">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          POS Access
        </p>
        <h1 className="mt-3 text-3xl font-bold text-slate-900">
          Sign in to your workspace
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Clean, fast checkout operations start here.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">
              Email
            </span>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={onChange}
              required
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none transition-all focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
              placeholder="you@company.com"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">
              Password
            </span>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={onChange}
              required
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none transition-all focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
              placeholder="••••••••"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">
                POS Name
              </span>
              <input
                type="text"
                name="posName"
                value={formData.posName}
                onChange={onChange}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none transition-all focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                placeholder="Provided by your admin"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">
                POS Unique ID
              </span>
              <input
                type="text"
                name="posUniqueId"
                value={formData.posUniqueId}
                onChange={onChange}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none transition-all focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                placeholder="Provided by your admin"
              />
            </label>
          </div>

          {error && (
            <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-emerald-500 px-4 py-3 text-sm font-bold text-white transition-all hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            )}
            {submitting ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Need an account?{" "}
          <Link
            to="/signup"
            className="font-semibold text-sky-600 hover:text-sky-700"
          >
            Create one
          </Link>
        </p>
        <p className="mt-2 text-center text-sm text-slate-500">
          Admin? <Link to="/admin/login" className="font-semibold text-sky-600 hover:text-sky-700">Go to admin login</Link>
        </p>
      </section>
    </main>
  );
}
