export default function ProductTable({
  products,
  onEdit,
  onDelete,
  onToggleStatus,
}) {
  return (
    <div className="overflow-hidden rounded-linen-lg border border-linen-border bg-white">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-linen-border bg-linen-surface-2">
            <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.07em] text-linen-text-secondary">Name</th>
            <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.07em] text-linen-text-secondary">Price</th>
            <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.07em] text-linen-text-secondary">Category</th>
            <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.07em] text-linen-text-secondary">Variants</th>
            <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.07em] text-linen-text-secondary">Status</th>
            <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.07em] text-linen-text-secondary">Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id} className="border-t border-linen-surface-2">
              <td className="px-4 py-3">
                <p className="font-medium text-linen-text-primary">{product.name}</p>
                <p className="text-xs text-linen-text-muted">{product.description || "-"}</p>
              </td>
              <td className="px-4 py-3 font-mono font-semibold text-linen-text-primary">
                ${Number(product.price || 0).toFixed(2)}
              </td>
              <td className="px-4 py-3 text-linen-text-secondary">{product.category_name || "-"}</td>
              <td className="px-4 py-3 text-linen-text-muted">-</td>
              <td className="px-4 py-3">
                <button
                  type="button"
                  onClick={() => onToggleStatus(product)}
                  className={`rounded-linen-pill px-2.5 py-0.5 text-[11px] font-semibold uppercase ${product.is_available ? "bg-[#DCFCE7] text-linen-success" : "bg-red-50 text-linen-danger"}`}
                >
                  {product.is_available ? "Active" : "Inactive"}
                </button>
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  <button type="button" onClick={() => onEdit(product)} className="rounded-linen-sm border border-linen-border px-3 py-1 text-xs font-medium text-linen-text-primary transition-colors hover:bg-linen-surface-2">Edit</button>
                  <button type="button" onClick={() => onDelete(product)} className="rounded-linen-sm border border-red-200 px-3 py-1 text-xs font-medium text-linen-danger transition-colors hover:bg-red-50">Delete</button>
                </div>
              </td>
            </tr>
          ))}
          {products.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-linen-text-secondary">No products found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
