import ItemRow from './ItemRow';

const STAGE_STYLE = {
  to_cook: {
    card: 'border-l-[3px] border-l-[#EF4444]',
    badge: 'bg-[#EF4444]/20 text-[#EF4444]',
    label: 'To Cook',
  },
  preparing: {
    card: 'border-l-[3px] border-l-[#F59E0B]',
    badge: 'bg-[#F59E0B]/20 text-[#F59E0B]',
    label: 'Preparing',
  },
  completed: {
    card: 'border-l-[3px] border-l-[#22C55E]',
    badge: 'bg-[#22C55E]/20 text-[#22C55E]',
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
      className={`rounded-[10px] border border-[#2A2A2A] bg-[#1A1A1A] p-3.5 transition-all ${style.card} ${cardAction ? 'cursor-pointer hover:border-[#3A3A3A]' : ''}`}
    >
      <header className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-mono text-[13px] font-semibold text-[#F5F5F5]">{order.ticketLabel}</h3>
          <p className="text-[11px] text-[#888888]">Table {order.table_number}</p>
        </div>
        <span className={`rounded-linen-pill px-2 py-0.5 text-[11px] font-semibold uppercase ${style.badge}`}>
          {style.label}
        </span>
      </header>

      {isUpdated && (
        <div className="mt-2 inline-flex rounded-linen-sm border border-[#2563EB]/30 bg-[#2563EB]/10 px-2 py-0.5 text-[11px] font-semibold text-[#60A5FA]">
          Updated
        </div>
      )}

      <div className="mt-3 space-y-0.5">
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

      <footer className="mt-3 flex items-center justify-between gap-2">
        <p className="font-mono text-xs text-[#888888]">
          {order.preparedCountDisplay}/{order.totalQuantityDisplay} prepared
        </p>

        {stage === 'to_cook' && (
          <button
            type="button"
            disabled={busy || !canPromoteToPreparing}
            onClick={(e) => {
              e.stopPropagation();
              onPromote(order);
            }}
            className="rounded-linen bg-[#EF4444] px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-[#DC2626] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Start Preparing
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
            className="rounded-linen bg-[#F59E0B] px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-[#D97706] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Mark Done
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
            className="rounded-linen bg-[#22C55E] px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-[#16A34A] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Served
          </button>
        )}
      </footer>
    </article>
  );
}
