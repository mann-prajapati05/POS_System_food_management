export default function CategoryTable({ categories, onEdit, onDelete }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-slate-50 text-left text-slate-500">
          <tr>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Description</th>
            <th className="px-4 py-3">Products</th>
            <th className="px-4 py-3">Created</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((category) => (
            <tr key={category.id} className="border-t border-slate-100">
              <td className="px-4 py-3 font-semibold text-slate-800">
                {category.name}
              </td>
              <td className="px-4 py-3 text-slate-600">
                {category.description || "-"}
              </td>
              <td className="px-4 py-3 text-slate-600">
                {category.product_count ?? 0}
              </td>
              <td className="px-4 py-3 text-slate-600">
                {category.created_at
                  ? new Date(category.created_at).toLocaleDateString()
                  : "-"}
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onEdit(category)}
                    className="rounded-lg border border-slate-200 px-3 py-1 text-slate-700 hover:bg-slate-100"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(category)}
                    className="rounded-lg border border-rose-200 px-3 py-1 text-rose-600 hover:bg-rose-50"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {categories.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                No categories found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
