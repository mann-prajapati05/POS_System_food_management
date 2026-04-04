export default function CategoryTabs({
  categories,
  selectedCategoryId,
  onSelect,
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onSelect("")}
        className={`rounded-xl border px-3 py-2 text-sm font-semibold ${selectedCategoryId ? "border-slate-200 text-slate-700 hover:bg-slate-100" : "border-sky-300 bg-sky-50 text-sky-700"}`}
      >
        All
      </button>

      {categories.map((category) => (
        <button
          key={category.id}
          type="button"
          onClick={() => onSelect(category.id)}
          className={`rounded-xl border px-3 py-2 text-sm font-semibold ${selectedCategoryId === category.id ? "border-sky-300 bg-sky-50 text-sky-700" : "border-slate-200 text-slate-700 hover:bg-slate-100"}`}
        >
          {category.name}
        </button>
      ))}
    </div>
  );
}
