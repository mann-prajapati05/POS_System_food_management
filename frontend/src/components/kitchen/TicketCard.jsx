import ItemRow from './ItemRow';

const STAGE_STYLE = {
  to_cook: {
    card: 'border-amber-200 bg-amber-50/70',
    badge: 'bg-amber-100 text-amber-800',
    label: 'To Cook',
  },
  preparing: {
    card: 'border-orange-200 bg-orange-50/70',
    badge: 'bg-orange-100 text-orange-800',
    label: 'Preparing',
  },
  completed: {
    card: 'border-emerald-200 bg-emerald-50/70',
    badge: 'bg-emerald-100 text-emerald-800',
    label: 'Completed',
  },
};

export default function TicketCard({
  order,
  stage,
  stagedPreparedMap,
  canPromoteToPreparing,
  onToggleItem,
  onPromote,
  onComplete,
  onServe,
  busy,
  isUpdated,
}) {
  const style = STAGE_STYLE[stage] || STAGE_STYLE.to_cook;
  const cardAction = stage === 'preparing' ? () => onComplete(order) : stage === 'completed' ? () => onServe(order) : null;

  return (
    <article
      role={cardAction ? 'button' : undefined}
      tabIndex={cardAction && !busy ? 0 : undefined}
      onClick={busy ? undefined : cardAction || undefined}
      onKeyDown={(e) => {
        if (!cardAction || busy) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          cardAction();
        }
      }}
      className={`rounded-2xl border p-4 shadow-sm transition-all ${style.card} ${cardAction ? 'cursor-pointer hover:scale-[1.01]' : ''}`}
    >
      <header className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-bold text-slate-900">{order.ticketLabel}</h3>
          <p className="text-xs text-slate-600">Floor {order.floor_name} • Table {order.table_number}</p>
        </div>
        <span className={`rounded-lg px-2 py-1 text-xs font-semibold ${style.badge}`}>
          {style.label}
        </span>
      </header>

      {isUpdated && (
        <div className="mt-2 inline-flex rounded-md border border-sky-200 bg-sky-50 px-2 py-1 text-[11px] font-semibold text-sky-700">
          Updated
        </div>
      )}

      <div className="mt-3 space-y-2">
        {order.items.map((item) => {
          const staged = Number(stagedPreparedMap[item.itemId] || 0);
          const basePrepared = Number(item.quantityPrepared ?? 0);
          const effectivePrepared = Math.min(Number(item.quantity || 0), basePrepared + staged);
          return (
            <ItemRow
              key={item.itemId}
              item={item}
              preparedQuantity={effectivePrepared}
              stagedPreparedQuantity={staged}
              canToggle={stage === 'to_cook' && !busy && effectivePrepared < Number(item.quantity || 0)}
              onToggle={() => onToggleItem(order, item)}
            />
          );
        })}
      </div>

      <footer className="mt-4 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-slate-600">
          {order.preparedCountDisplay}/{order.totalQuantityDisplay} qty prepared
        </p>

        {stage === 'to_cook' && (
          <button
            type="button"
            disabled={busy || !canPromoteToPreparing}
            onClick={(e) => {
              e.stopPropagation();
              onPromote(order);
            }}
            className="rounded-xl bg-amber-500 px-3 py-2 text-xs font-semibold text-white transition-all hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Move to Preparing
          </button>
        )}

        {stage === 'preparing' && (
          <button
            type="button"
            disabled={busy}
            onClick={(e) => {
              e.stopPropagation();
              onComplete(order);
            }}
            className="rounded-xl bg-orange-500 px-3 py-2 text-xs font-semibold text-white transition-all hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Mark Completed
          </button>
        )}

        {stage === 'completed' && (
          <button
            type="button"
            disabled={busy}
            onClick={(e) => {
              e.stopPropagation();
              onServe(order);
            }}
            className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition-all hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Served (Remove)
          </button>
        )}
      </footer>
    </article>
  );
}
