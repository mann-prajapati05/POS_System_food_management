export default function ProductCard({ product, onAdd, disabled = false }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onAdd(product)}
      className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left transition-all hover:border-sky-300 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <p className="text-sm font-semibold text-slate-900">{product.name}</p>
      <p className="mt-1 text-xs text-slate-500">{product.category_name}</p>
      {product.description && <p className="mt-2 line-clamp-2 text-xs text-slate-500">{product.description}</p>}
      <p className="mt-3 text-sm font-bold text-slate-900">${Number(product.price || 0).toFixed(2)}</p>
    </button>
  );
}
