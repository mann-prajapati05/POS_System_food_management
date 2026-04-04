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

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_95%_0%,rgba(56,189,248,0.18),transparent_36%),radial-gradient(circle_at_15%_80%,rgba(16,185,129,0.14),transparent_36%)]" />

      <section className="relative w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-8 shadow-[0_30px_80px_-35px_rgba(15,23,42,0.35)]">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          POS Onboarding
        </p>
        <h1 className="mt-3 text-3xl font-bold text-slate-900">
          Create your account
        </h1>

        <form onSubmit={onSubmit} className="mt-8 grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-2 block text-sm font-semibold text-slate-700">
              Name
            </span>
            <input
              name="name"
              value={formData.name}
              onChange={onChange}
              required
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition-all focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
              placeholder="Ava Manager"
            />
          </label>

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
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition-all focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
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
              minLength={8}
              required
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition-all focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
              placeholder="At least 8 characters"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">
              Role
            </span>
            <select
              name="role"
              value={formData.role}
              onChange={onChange}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition-all focus:border-sky-400 focus:ring-4 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              <option value="staff">Staff</option>
              <option value="kitchen">Kitchen</option>
            </select>
          </label>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:col-span-2">
            <p className="mb-2 text-sm font-semibold text-slate-700">Enter POS credentials provided by your admin</p>
            <div className="mt-1 grid gap-3 sm:grid-cols-2">
              <input
                name="posName"
                value={formData.posName}
                onChange={onChange}
                required
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition-all focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                placeholder="POS name"
              />
              <input
                name="posUniqueId"
                value={formData.posUniqueId}
                onChange={onChange}
                required
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition-all focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                placeholder="POS unique ID"
              />
            </div>
          </div>

          {error && (
            <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600 sm:col-span-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-emerald-500 px-4 py-3 text-sm font-bold text-white transition-all hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70 sm:col-span-2"
          >
            {submitting && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            )}
            {submitting ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-semibold text-sky-600 hover:text-sky-700"
          >
            Sign in
          </Link>
        </p>
        <p className="mt-2 text-center text-sm text-slate-500">
          Admin? <Link to="/admin/signup" className="font-semibold text-sky-600 hover:text-sky-700">Go to admin signup</Link>
        </p>
      </section>
    </main>
  );
}
