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

  const inputClass = "h-11 w-full rounded-linen border border-linen-border bg-white px-3 text-sm text-linen-text-primary outline-none transition-colors placeholder:text-linen-text-muted focus:border-linen-primary";

  return (
    <main className="flex min-h-screen animate-fade-in">
      <div className="hidden w-1/2 flex-col justify-between bg-linen-primary p-10 lg:flex">
        <div className="flex h-8 w-8 items-center justify-center rounded-linen-sm bg-white/10 font-mono text-[13px] font-semibold text-white">
          ADM
        </div>
        <div className="max-w-md">
          <p className="text-[36px] font-light leading-[1.3] text-white">
            Set up your restaurant in minutes.
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            {["Create POS", "Configure Floors", "Add Products"].map((f) => (
              <span key={f} className="rounded-linen-pill border border-white/[0.12] bg-white/[0.08] px-3 py-1.5 text-xs text-white">{f}</span>
            ))}
          </div>
        </div>
        <p className="text-xs text-white/30">Odoo POS Cafe — Admin Onboarding</p>
      </div>

      <div className="flex w-full items-center justify-center bg-linen-bg px-6 py-10 lg:w-1/2">
        <section className="w-full max-w-[400px]">
          <h1 className="text-[28px] font-semibold text-linen-text-primary">Create Admin + POS</h1>
          <p className="mt-1 text-sm text-linen-text-secondary">Set up your admin account and POS system</p>

          <form onSubmit={onSubmit} className="mt-8 space-y-5">
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.07em] text-linen-text-secondary">Admin Name</span>
              <input name="name" value={formData.name} onChange={onChange} required placeholder="Admin name" className={inputClass} />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.07em] text-linen-text-secondary">Email</span>
                <input name="email" type="email" value={formData.email} onChange={onChange} required placeholder="admin@company.com" className={inputClass} />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.07em] text-linen-text-secondary">Password</span>
                <input name="password" type="password" value={formData.password} onChange={onChange} minLength={8} required placeholder="Min 8 chars" className={inputClass} />
              </label>
            </div>
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.07em] text-linen-text-secondary">POS Name</span>
              <input name="newPosName" value={formData.newPosName} onChange={onChange} required placeholder="e.g. Main Floor POS" className={inputClass} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.07em] text-linen-text-secondary">Admin Secret Code</span>
              <input name="adminSecretCode" type="password" value={formData.adminSecretCode} onChange={onChange} required placeholder="Secret code from env" className={inputClass} />
            </label>

            {createdPos && (
              <div className="rounded-linen-lg border border-linen-success/30 bg-green-50 px-3 py-3 text-sm text-linen-success">
                POS Created: {createdPos.name} | Unique ID: <span className="font-mono font-semibold">{createdPos.uniqueId}</span>
              </div>
            )}

            {error && <p className="rounded-linen bg-red-50 px-3 py-2 text-sm text-linen-danger">{error}</p>}

            <button type="submit" disabled={submitting} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-linen bg-linen-primary text-sm font-medium text-white transition-colors hover:bg-linen-primary-hover disabled:cursor-not-allowed disabled:opacity-70">
              {submitting ? "Creating..." : "Create Admin Account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-linen-text-secondary">
            Already admin?{" "}
            <Link to="/admin/login" className="font-medium text-linen-text-primary hover:underline">Go to admin login</Link>
          </p>
        </section>
      </div>
    </main>
  );
}
