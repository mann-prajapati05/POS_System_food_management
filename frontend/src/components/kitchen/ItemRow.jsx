export default function ItemRow({ item, preparedQuantity, stagedPreparedQuantity, canToggle, onToggle }) {
  const quantity = Number(item.quantity || 0);
  const prepared = Math.min(quantity, Number(preparedQuantity || 0));
  const pending = Math.max(0, quantity - prepared);
  const isFullyPrepared = prepared >= quantity;
  const textClasses = isFullyPrepared ? 'text-[#555555] line-through' : 'text-[#E5E5E5]';

  return (
    <button
      type="button"
      disabled={!canToggle}
      onClick={onToggle}
      className={`flex h-8 w-full items-center justify-between rounded-linen-sm px-3 text-left text-[13px] transition-all ${
        canToggle
          ? 'hover:bg-[#222222]'
          : 'cursor-default'
      }`}
    >
      <div className="flex items-center gap-2">
        <span className={`h-1 w-1 rounded-full ${isFullyPrepared ? 'bg-[#22C55E]' : 'bg-[#EF4444]'}`} />
        <span className={`font-medium transition-all ${textClasses}`}>
          {item.name}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {stagedPreparedQuantity > 0 && (
          <span className="rounded-linen-sm bg-[#2563EB]/20 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-[#60A5FA]">
            +{stagedPreparedQuantity}
          </span>
        )}
        <span className="font-mono text-xs text-[#888888]">
          {prepared}/{quantity}
        </span>
      </div>
    </button>
  );
}
