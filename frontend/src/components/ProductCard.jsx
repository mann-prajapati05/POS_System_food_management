export default function ProductCard({ product, onAdd, disabled = false }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onAdd(product)}
      className="flex w-full flex-col rounded-linen-lg border border-linen-border bg-white p-4 text-left transition-all duration-150 hover:border-linen-primary active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60"
    >
      <p className="text-[13px] font-medium text-linen-text-primary">{product.name}</p>
      <p className="mt-0.5 text-[11px] text-linen-text-muted">{product.category_name}</p>
      {product.description && (
        <p className="mt-2 line-clamp-2 text-xs text-linen-text-secondary">{product.description}</p>
      )}
      <p className="mt-auto pt-3 font-mono text-base font-bold text-linen-text-primary">
        ${Number(product.price || 0).toFixed(2)}
      </p>
    </button>
  );
}
