function lineTotal(item) {
  return Number(item.quantity || 0) * Number(item.price_at_time || 0);
}

export default function CartPanel({ items, onIncrease, onDecrease, onRemove, disableDecreaseRemove = false }) {
  return (
    <section className="flex flex-col rounded-linen-lg border border-linen-border bg-white">
      <div className="flex items-center justify-between border-b border-linen-border px-4 py-3">
        <h3 className="text-[13px] font-semibold text-linen-text-primary">Order Summary</h3>
        {items.length > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-linen-pill bg-linen-surface-2 px-1.5 font-mono text-[11px] font-semibold text-linen-text-secondary">
            {items.length}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
            <svg className="h-12 w-12 text-linen-border" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
            </svg>
            <p className="mt-3 text-sm text-linen-text-secondary">No items added</p>
            <p className="mt-1 text-[13px] text-linen-text-muted">Select products from the left</p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex h-14 items-center border-b border-linen-surface-2 px-4"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-linen-text-primary">{item.product_name}</p>
              </div>

              <div className="flex items-center gap-1.5 px-3">
                <button
                  type="button"
                  disabled={disableDecreaseRemove}
                  onClick={() => onDecrease(item)}
                  className="flex h-7 w-7 items-center justify-center rounded-linen-sm border border-linen-border bg-white text-sm text-linen-text-primary transition-colors hover:bg-linen-surface-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  −
                </button>
                <span className="w-7 text-center font-mono text-sm font-semibold text-linen-text-primary">
                  {item.quantity}
                </span>
                <button
                  type="button"
                  onClick={() => onIncrease(item)}
                  className="flex h-7 w-7 items-center justify-center rounded-linen-sm border border-linen-border bg-white text-sm text-linen-text-primary transition-colors hover:bg-linen-surface-2"
                >
                  +
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-mono text-[13px] font-semibold text-linen-text-primary">
                  ${lineTotal(item).toFixed(2)}
                </span>
                <button
                  type="button"
                  disabled={disableDecreaseRemove}
                  onClick={() => onRemove(item)}
                  className="text-xs font-medium text-linen-text-muted transition-colors hover:text-linen-danger disabled:cursor-not-allowed disabled:opacity-50"
                >
                  ✕
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
