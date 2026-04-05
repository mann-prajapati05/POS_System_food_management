export default function FilterSidebar({
  products,
  categories,
  selectedProduct,
  selectedCategory,
  onProductChange,
  onCategoryChange,
  onReset,
}) {
  return (
    <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-slate-500">Filters</h2>
        <button
          type="button"
          onClick={onReset}
          className="text-xs font-semibold text-sky-700 hover:text-sky-800"
        >
          Reset
        </button>
      </div>

      <div className="mt-4 space-y-4">
        <label className="block text-sm font-semibold text-slate-700">
          Product
          <select
            value={selectedProduct}
            onChange={(e) => onProductChange(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
          >
            <option value="">All Products</option>
            {products.map((product) => (
              <option key={product} value={product}>{product}</option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-semibold text-slate-700">
          Category
          <select
            value={selectedCategory}
            disabled={categories.length === 0}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-100"
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
          {categories.length === 0 && (
            <p className="mt-1 text-xs font-normal text-slate-500">Category data is not provided by current kitchen API payload.</p>
          )}
        </label>
      </div>
    </aside>
  );
}
