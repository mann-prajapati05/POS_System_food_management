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
    <aside className="rounded-linen-lg border border-[#2A2A2A] bg-[#1A1A1A] p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.1em] text-[#888888]">Filters</h2>
        <button
          type="button"
          onClick={onReset}
          className="text-xs font-medium text-[#888888] transition-colors hover:text-white"
        >
          Reset
        </button>
      </div>

      <div className="mt-4 space-y-4">
        <label className="block text-[11px] font-medium uppercase tracking-[0.07em] text-[#888888]">
          Product
          <select
            value={selectedProduct}
            onChange={(e) => onProductChange(e.target.value)}
            className="mt-1.5 w-full rounded-linen border border-[#2A2A2A] bg-[#111111] px-3 py-2 text-[13px] text-[#E5E5E5] outline-none transition-colors focus:border-[#3A3A3A]"
          >
            <option value="">All Products</option>
            {products.map((product) => (
              <option key={product} value={product}>{product}</option>
            ))}
          </select>
        </label>

        <label className="block text-[11px] font-medium uppercase tracking-[0.07em] text-[#888888]">
          Category
          <select
            value={selectedCategory}
            disabled={categories.length === 0}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="mt-1.5 w-full rounded-linen border border-[#2A2A2A] bg-[#111111] px-3 py-2 text-[13px] text-[#E5E5E5] outline-none transition-colors focus:border-[#3A3A3A] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
          {categories.length === 0 && (
            <p className="mt-1 text-xs font-normal text-[#555555]">Category data is not provided by current kitchen API payload.</p>
          )}
        </label>
      </div>
    </aside>
  );
}
