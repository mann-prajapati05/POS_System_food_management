export default function CategoryTabs({
  categories,
  selectedCategoryId,
  onSelect,
}) {
  const tabBase =
    "h-8 rounded-linen-pill border px-3 text-[13px] font-medium transition-all duration-150 whitespace-nowrap";
  const tabActive =
    "border-linen-primary bg-linen-primary text-white";
  const tabInactive =
    "border-linen-border bg-transparent text-linen-text-secondary hover:border-linen-border-strong hover:bg-linen-surface-2";

  return (
    <div className="flex flex-wrap gap-1.5">
      <button
        type="button"
        onClick={() => onSelect("")}
        className={`${tabBase} ${selectedCategoryId ? tabInactive : tabActive}`}
      >
        All
      </button>

      {categories.map((category) => (
        <button
          key={category.id}
          type="button"
          onClick={() => onSelect(category.id)}
          className={`${tabBase} ${selectedCategoryId === category.id ? tabActive : tabInactive}`}
        >
          {category.name}
        </button>
      ))}
    </div>
  );
}
