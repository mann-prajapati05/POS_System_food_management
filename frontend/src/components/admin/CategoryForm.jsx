import { useEffect, useState } from 'react';

const INITIAL_FORM = {
  name: '',
  description: '',
};

export default function CategoryForm({
  open,
  mode,
  initialValues,
  submitting,
  onSubmit,
  onClose,
}) {
  const [form, setForm] = useState(INITIAL_FORM);

  useEffect(() => {
    if (!open) return;
    setForm({
      name: initialValues?.name || '',
      description: initialValues?.description || '',
    });
  }, [open, initialValues]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/35 p-4">
      <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <h3 className="text-xl font-bold text-slate-900">{mode === 'edit' ? 'Edit Category' : 'Create Category'}</h3>

        <form
          className="mt-4 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit({
              name: form.name.trim(),
              description: form.description.trim() || undefined,
            });
          }}
        >
          <label className="block text-sm font-semibold text-slate-700">
            Category Name
            <input
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              required
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
              placeholder="Quick Bites"
            />
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            Description
            <textarea
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              rows={4}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
              placeholder="Optional description"
            />
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">Cancel</button>
            <button type="submit" disabled={submitting} className="rounded-xl bg-gradient-to-r from-sky-500 to-emerald-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-70">
              {submitting ? 'Saving...' : mode === 'edit' ? 'Update Category' : 'Create Category'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
