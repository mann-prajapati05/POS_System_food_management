export default function ProductTable({
  products,
  onEdit,
  onDelete,
  onToggleStatus,
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-slate-50 text-left text-slate-500">
          <tr>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Price</th>
            <th className="px-4 py-3">Category</th>
            <th className="px-4 py-3">Variants</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id} className="border-t border-slate-100">
              <td className="px-4 py-3">
                <p className="font-semibold text-slate-800">{product.name}</p>
                <p className="text-xs text-slate-500">
                  {product.description || "-"}
                </p>
              </td>
              <td className="px-4 py-3 text-slate-700">
                ${Number(product.price || 0).toFixed(2)}
              </td>
              <td className="px-4 py-3 text-slate-700">
                {product.category_name || "-"}
              </td>
              <td className="px-4 py-3 text-slate-500">-</td>
              <td className="px-4 py-3">
                <button
                  type="button"
                  onClick={() => onToggleStatus(product)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${product.is_available ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}
                >
                  {product.is_available ? "Active" : "Inactive"}
                </button>
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onEdit(product)}
                    className="rounded-lg border border-slate-200 px-3 py-1 text-slate-700 hover:bg-slate-100"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(product)}
                    className="rounded-lg border border-rose-200 px-3 py-1 text-rose-600 hover:bg-rose-50"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {products.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                No products found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
