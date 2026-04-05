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

  const inputClass = "mt-1.5 h-10 w-full rounded-linen border border-linen-border bg-white px-3 text-sm text-linen-text-primary outline-none transition-colors placeholder:text-linen-text-muted focus:border-linen-primary";

  return (
    <div className="linen-modal-backdrop">
      <section className="linen-modal w-full max-w-lg p-6">
        <h3 className="text-lg font-semibold text-linen-text-primary">{mode === 'edit' ? 'Edit Category' : 'Create Category'}</h3>

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
          <label className="block text-[11px] font-medium uppercase tracking-[0.07em] text-linen-text-secondary">
            Category Name
            <input
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              required
              className={inputClass}
              placeholder="Quick Bites"
            />
          </label>

          <label className="block text-[11px] font-medium uppercase tracking-[0.07em] text-linen-text-secondary">
            Description
            <textarea
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              rows={4}
              className="mt-1.5 w-full rounded-linen border border-linen-border bg-white px-3 py-2 text-sm text-linen-text-primary outline-none transition-colors placeholder:text-linen-text-muted focus:border-linen-primary"
              placeholder="Optional description"
            />
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="h-9 rounded-linen border border-linen-border px-4 text-[13px] font-medium text-linen-text-primary transition-colors hover:bg-linen-surface-2">Cancel</button>
            <button type="submit" disabled={submitting} className="h-9 rounded-linen bg-linen-primary px-4 text-[13px] font-medium text-white transition-colors hover:bg-linen-primary-hover disabled:opacity-70">
              {submitting ? 'Saving...' : mode === 'edit' ? 'Update Category' : 'Create Category'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
