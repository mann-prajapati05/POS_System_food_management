export default function ItemRow({ item, preparedQuantity, stagedPreparedQuantity, canToggle, onToggle }) {
  const quantity = Number(item.quantity || 0);
  const prepared = Math.min(quantity, Number(preparedQuantity || 0));
  const pending = Math.max(0, quantity - prepared);
  const isFullyPrepared = prepared >= quantity;
  const textClasses = isFullyPrepared ? 'text-slate-400 line-through' : 'text-slate-800';

  return (
    <button
      type="button"
      disabled={!canToggle}
      onClick={onToggle}
      className={`flex w-full items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-left text-sm transition-all ${
        canToggle
          ? 'hover:border-sky-200 hover:bg-sky-50'
          : 'cursor-default bg-slate-50'
      }`}
    >
      <span className={`font-medium transition-all ${textClasses}`}>
        {item.quantity} x {item.name}
      </span>

      <div className="flex items-center gap-2">
        {stagedPreparedQuantity > 0 && (
          <span className="rounded-md bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-700">
            +{stagedPreparedQuantity}
          </span>
        )}
        <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${isFullyPrepared ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
          {prepared}/{quantity} prepared
        </span>
        <span className={`h-2.5 w-2.5 rounded-full ${pending === 0 ? 'bg-emerald-500' : 'bg-slate-300'}`} />
      </div>
    </button>
  );
}
