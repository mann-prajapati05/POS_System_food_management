import { useEffect, useState } from 'react';

const INITIAL_FORM = {
  name: '',
  categoryId: '',
  price: '',
  description: '',
  image: '',
  isAvailable: true,
  variants: [],
};

function VariantEditor({ variants, onChange }) {
  return (
    <div className="space-y-2 rounded-xl border border-slate-200 p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700">Variants (UI only)</p>
        <button
          type="button"
          onClick={() => onChange([...variants, { id: Date.now(), name: '', options: '' }])}
          className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
        >
          Add Variant
        </button>
      </div>

      {variants.map((variant) => (
        <div key={variant.id} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <input
            value={variant.name}
            onChange={(e) => onChange(variants.map((v) => (v.id === variant.id ? { ...v, name: e.target.value } : v)))}
            placeholder="Variant name (e.g. Size)"
            className="rounded-lg border border-slate-200 px-2 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
          />
          <input
            value={variant.options}
            onChange={(e) => onChange(variants.map((v) => (v.id === variant.id ? { ...v, options: e.target.value } : v)))}
            placeholder="Options (S,M,L:+20)"
            className="rounded-lg border border-slate-200 px-2 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
          />
          <button
            type="button"
            onClick={() => onChange(variants.filter((v) => v.id !== variant.id))}
            className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50"
          >
            Remove
          </button>
        </div>
      ))}

      {variants.length === 0 && <p className="text-xs text-slate-500">No variants configured.</p>}
    </div>
  );
}

export default function ProductForm({
  open,
  mode,
  categories,
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
      categoryId: initialValues?.category_id || '',
      price: initialValues?.price ?? '',
      description: initialValues?.description || '',
      image: '',
      isAvailable: initialValues?.is_available ?? true,
      variants: initialValues?.variants || [],
    });
  }, [open, initialValues]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/35 p-4">
      <section className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <h3 className="text-xl font-bold text-slate-900">{mode === 'edit' ? 'Edit Product' : 'Create Product'}</h3>

        <form
          className="mt-4 grid gap-4 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit({
              name: form.name.trim(),
              categoryId: form.categoryId,
              price: Number(form.price),
              description: form.description.trim() || undefined,
              isAvailable: Boolean(form.isAvailable),
              image: form.image.trim() || undefined,
              variants: form.variants,
            });
          }}
        >
          <label className="block text-sm font-semibold text-slate-700 sm:col-span-2">
            Product Name
            <input
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              required
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
            />
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            Category
            <select
              value={form.categoryId}
              onChange={(e) => setForm((prev) => ({ ...prev, categoryId: e.target.value }))}
              required
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
            >
              <option value="">Select category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            Base Price
            <input
              type="number"
              min={0.01}
              step="0.01"
              value={form.price}
              onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
              required
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
            />
          </label>

          <label className="block text-sm font-semibold text-slate-700 sm:col-span-2">
            Description
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
            />
          </label>

          <label className="block text-sm font-semibold text-slate-700 sm:col-span-2">
            Image URL (optional)
            <input
              value={form.image}
              onChange={(e) => setForm((prev) => ({ ...prev, image: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
            />
          </label>

          <div className="sm:col-span-2">
            <VariantEditor variants={form.variants} onChange={(variants) => setForm((prev) => ({ ...prev, variants }))} />
          </div>

          <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 sm:col-span-2">
            <input
              type="checkbox"
              checked={Boolean(form.isAvailable)}
              onChange={(e) => setForm((prev) => ({ ...prev, isAvailable: e.target.checked }))}
            />
            Product is active
          </label>

          <div className="flex justify-end gap-2 sm:col-span-2">
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">Cancel</button>
            <button type="submit" disabled={submitting} className="rounded-xl bg-gradient-to-r from-sky-500 to-emerald-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-70">
              {submitting ? 'Saving...' : mode === 'edit' ? 'Update Product' : 'Create Product'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
