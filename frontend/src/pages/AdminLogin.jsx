import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { adminLogin } from "../services/authService";
import useAuthStore from "../store/authStore";

export default function AdminLogin() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    adminSecretCode: "",
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
      const response = await adminLogin(formData);
      setAuth({
        token: response.token,
        user: response.user,
        adminSecretCode: formData.adminSecretCode,
      });
      toast.success("Admin login successful");
      navigate("/dashboard", { replace: true });
    } catch (requestError) {
      const message =
        requestError?.response?.data?.error || "Admin login failed";
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "h-11 w-full rounded-linen border border-linen-border bg-white px-3 text-sm text-linen-text-primary outline-none transition-colors placeholder:text-linen-text-muted focus:border-linen-primary";

  return (
    <main className="flex min-h-screen animate-fade-in">
      <div className="hidden w-1/2 flex-col justify-between bg-linen-primary p-10 lg:flex">
        <div className="flex h-8 w-8 items-center justify-center rounded-linen-sm bg-white/10 font-mono text-[13px] font-semibold text-white">
          ADM
        </div>
        <div className="max-w-md">
          <p className="text-[36px] font-light leading-[1.3] text-white">
            Manage floors, menus, analytics — all from one place.
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            {["Floor Config", "Product CRUD", "Analytics"].map((f) => (
              <span
                key={f}
                className="rounded-linen-pill border border-white/[0.12] bg-white/[0.08] px-3 py-1.5 text-xs text-white"
              >
                {f}
              </span>
            ))}
          </div>
        </div>
        <p className="text-xs text-white/30">Odoo POS Cafe — Admin</p>
      </div>

      <div className="flex w-full items-center justify-center bg-linen-bg px-6 lg:w-1/2">
        <section className="w-full max-w-[360px]">
          <h1 className="text-[28px] font-semibold text-linen-text-primary">
            Admin Login
          </h1>
          <p className="mt-1 text-sm text-linen-text-secondary">
            Sign in with admin credentials
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-5">
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.07em] text-linen-text-secondary">
                Email
              </span>
              <input
                name="email"
                type="email"
                value={formData.email}
                onChange={onChange}
                required
                placeholder="admin@company.com"
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.07em] text-linen-text-secondary">
                Password
              </span>
              <input
                name="password"
                type="password"
                value={formData.password}
                onChange={onChange}
                required
                placeholder="••••••••"
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.07em] text-linen-text-secondary">
                Admin Secret Code
              </span>
              <input
                name="adminSecretCode"
                type="password"
                value={formData.adminSecretCode}
                onChange={onChange}
                required
                placeholder="Secret code"
                className={inputClass}
              />
            </label>

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
              {submitting ? "Signing in..." : "Admin Sign In"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-linen-text-secondary">
            New admin?{" "}
            <Link
              to="/admin/signup"
              className="font-medium text-linen-text-primary hover:underline"
            >
              Create admin account
            </Link>
          </p>
          <p className="mt-2 text-center text-sm text-linen-text-secondary">
            Staff/Kitchen?{" "}
            <Link
              to="/login"
              className="font-medium text-linen-text-primary hover:underline"
            >
              Go to standard login
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
