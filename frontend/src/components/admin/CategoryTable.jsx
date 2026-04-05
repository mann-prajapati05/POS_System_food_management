export default function CategoryTable({ categories, onEdit, onDelete }) {
  return (
    <div className="overflow-hidden rounded-linen-lg border border-linen-border bg-white">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-linen-border bg-linen-surface-2">
            <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.07em] text-linen-text-secondary">Name</th>
            <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.07em] text-linen-text-secondary">Description</th>
            <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.07em] text-linen-text-secondary">Products</th>
            <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.07em] text-linen-text-secondary">Created</th>
            <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.07em] text-linen-text-secondary">Actions</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((category) => (
            <tr key={category.id} className="border-t border-linen-surface-2">
              <td className="px-4 py-3 font-medium text-linen-text-primary">{category.name}</td>
              <td className="px-4 py-3 text-linen-text-secondary">{category.description || "-"}</td>
              <td className="px-4 py-3 font-mono text-linen-text-secondary">{category.product_count ?? 0}</td>
              <td className="px-4 py-3 text-linen-text-secondary">
                {category.created_at ? new Date(category.created_at).toLocaleDateString() : "-"}
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  <button type="button" onClick={() => onEdit(category)} className="rounded-linen-sm border border-linen-border px-3 py-1 text-xs font-medium text-linen-text-primary transition-colors hover:bg-linen-surface-2">Edit</button>
                  <button type="button" onClick={() => onDelete(category)} className="rounded-linen-sm border border-red-200 px-3 py-1 text-xs font-medium text-linen-danger transition-colors hover:bg-red-50">Delete</button>
                </div>
              </td>
            </tr>
          ))}
          {categories.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-linen-text-secondary">No categories found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
