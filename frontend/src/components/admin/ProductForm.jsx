import { useEffect, useState } from 'react';

const INITIAL_FORM = {
  name: '',
  categoryId: '',
  price: '',
  description: '',
  image: null,
  currentImage: '',
  isAvailable: true,
  variants: [],
};

const inputClass = "mt-1.5 h-10 w-full rounded-linen border border-linen-border bg-white px-3 text-sm text-linen-text-primary outline-none transition-colors placeholder:text-linen-text-muted focus:border-linen-primary";

function VariantEditor({ variants, onChange }) {
  return (
    <div className="space-y-2 rounded-linen-lg border border-linen-border p-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-[0.07em] text-linen-text-secondary">Variants (UI only)</p>
        <button
          type="button"
          onClick={() => onChange([...variants, { id: Date.now(), name: '', options: '' }])}
          className="rounded-linen-sm border border-linen-border px-2 py-1 text-xs font-medium text-linen-text-primary transition-colors hover:bg-linen-surface-2"
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
            className="h-9 rounded-linen border border-linen-border px-2 text-sm outline-none focus:border-linen-primary"
          />
          <input
            value={variant.options}
            onChange={(e) => onChange(variants.map((v) => (v.id === variant.id ? { ...v, options: e.target.value } : v)))}
            placeholder="Options (S,M,L:+20)"
            className="h-9 rounded-linen border border-linen-border px-2 text-sm outline-none focus:border-linen-primary"
          />
          <button
            type="button"
            onClick={() => onChange(variants.filter((v) => v.id !== variant.id))}
            className="rounded-linen-sm border border-red-200 px-3 py-1 text-xs font-medium text-linen-danger transition-colors hover:bg-red-50"
          >
            Remove
          </button>
        </div>
      ))}

      {variants.length === 0 && <p className="text-xs text-linen-text-muted">No variants configured.</p>}
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
      image: null,
      currentImage: initialValues?.image_path || initialValues?.image_url || '',
      isAvailable: initialValues?.is_available ?? true,
      variants: initialValues?.variants || [],
    });
  }, [open, initialValues]);

  if (!open) return null;

  return (
    <div className="linen-modal-backdrop">
      <section className="linen-modal w-full max-w-2xl p-6">
        <h3 className="text-lg font-semibold text-linen-text-primary">{mode === 'edit' ? 'Edit Product' : 'Create Product'}</h3>

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
              image: form.image || undefined,
              variants: form.variants,
            });
          }}
        >
          <label className="block text-[11px] font-medium uppercase tracking-[0.07em] text-linen-text-secondary sm:col-span-2">
            Product Name
            <input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} required className={inputClass} />
          </label>

          <label className="block text-[11px] font-medium uppercase tracking-[0.07em] text-linen-text-secondary">
            Category
            <select value={form.categoryId} onChange={(e) => setForm((prev) => ({ ...prev, categoryId: e.target.value }))} required className={inputClass + " bg-white"}>
              <option value="">Select category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </label>

          <label className="block text-[11px] font-medium uppercase tracking-[0.07em] text-linen-text-secondary">
            Base Price
            <input type="number" min={0.01} step="0.01" value={form.price} onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))} required className={inputClass} />
          </label>

          <label className="block text-[11px] font-medium uppercase tracking-[0.07em] text-linen-text-secondary sm:col-span-2">
            Description
            <textarea rows={3} value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} className="mt-1.5 w-full rounded-linen border border-linen-border bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-linen-primary" />
          </label>

          <label className="block text-[11px] font-medium uppercase tracking-[0.07em] text-linen-text-secondary sm:col-span-2">
            Product Image (optional)
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={(e) => setForm((prev) => ({ ...prev, image: e.target.files?.[0] || null }))}
              className="mt-1.5 block w-full text-sm text-linen-text-primary file:mr-3 file:h-9 file:rounded-linen file:border file:border-linen-border file:bg-white file:px-3 file:text-[13px] file:font-medium file:text-linen-text-primary"
            />
            <p className="mt-1 text-xs text-linen-text-muted">Accepted: jpg, jpeg, png, webp (max 2MB)</p>
            {form.currentImage && !form.image && (
              <p className="mt-1 text-xs text-linen-text-muted">Current image will be kept if you do not upload a new one.</p>
            )}
          </label>

          <div className="sm:col-span-2">
            <VariantEditor variants={form.variants} onChange={(variants) => setForm((prev) => ({ ...prev, variants }))} />
          </div>

          <label className="inline-flex items-center gap-2 rounded-linen border border-linen-border px-3 py-2.5 text-[13px] font-medium text-linen-text-primary sm:col-span-2">
            <input
              type="checkbox"
              checked={Boolean(form.isAvailable)}
              onChange={(e) => setForm((prev) => ({ ...prev, isAvailable: e.target.checked }))}
              className="h-4 w-4 rounded border-linen-border accent-linen-primary"
            />
            Product is active
          </label>

          <div className="flex justify-end gap-2 sm:col-span-2">
            <button type="button" onClick={onClose} className="h-9 rounded-linen border border-linen-border px-4 text-[13px] font-medium text-linen-text-primary transition-colors hover:bg-linen-surface-2">Cancel</button>
            <button type="submit" disabled={submitting} className="h-9 rounded-linen bg-linen-primary px-4 text-[13px] font-medium text-white transition-colors hover:bg-linen-primary-hover disabled:opacity-70">
              {submitting ? 'Saving...' : mode === 'edit' ? 'Update Product' : 'Create Product'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
