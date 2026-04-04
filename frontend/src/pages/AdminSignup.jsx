import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { adminSignup } from "../services/authService";
import useAuthStore from "../store/authStore";

export default function AdminSignup() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [createdPos, setCreatedPos] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    newPosName: "",
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
      const response = await adminSignup(formData);
      setCreatedPos(response.createdPos || null);
      setAuth({ token: response.token, user: response.user });
      toast.success("Admin account created");
      navigate("/dashboard", { replace: true });
    } catch (requestError) {
      const message =
        requestError?.response?.data?.error || "Admin signup failed";
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <section className="relative w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-8 shadow-[0_30px_80px_-35px_rgba(15,23,42,0.35)]">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          Admin Onboarding
        </p>
        <h1 className="mt-3 text-3xl font-bold text-slate-900">
          Create Admin + POS
        </h1>

        <form onSubmit={onSubmit} className="mt-8 grid gap-4 sm:grid-cols-2">
          <input
            name="name"
            value={formData.name}
            onChange={onChange}
            required
            placeholder="Admin name"
            className="sm:col-span-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
          />
          <input
            name="email"
            type="email"
            value={formData.email}
            onChange={onChange}
            required
            placeholder="admin@company.com"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
          />
          <input
            name="password"
            type="password"
            value={formData.password}
            onChange={onChange}
            minLength={8}
            required
            placeholder="Password"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
          />
          <input
            name="newPosName"
            value={formData.newPosName}
            onChange={onChange}
            required
            placeholder="POS name"
            className="sm:col-span-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
          />
          <input
            name="adminSecretCode"
            type="password"
            value={formData.adminSecretCode}
            onChange={onChange}
            required
            placeholder="Admin secret code"
            className="sm:col-span-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
          />

          {createdPos && (
            <div className="sm:col-span-2 rounded-xl bg-emerald-50 px-3 py-3 text-sm text-emerald-700">
              POS Created: {createdPos.name} | Unique ID: {createdPos.uniqueId}
            </div>
          )}

          {error && (
            <p className="sm:col-span-2 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="sm:col-span-2 inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-sky-500 to-emerald-500 px-4 py-3 text-sm font-bold text-white disabled:opacity-70"
          >
            {submitting ? "Creating..." : "Create Admin Account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already admin?{" "}
          <Link to="/admin/login" className="font-semibold text-sky-600">
            Go to admin login
          </Link>
        </p>
      </section>
    </main>
  );
}
