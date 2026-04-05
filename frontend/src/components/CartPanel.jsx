function lineTotal(item) {
  return Number(item.quantity || 0) * Number(item.price_at_time || 0);
}

export default function CartPanel({ items, onIncrease, onDecrease, onRemove, disableDecreaseRemove = false }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <h3 className="text-lg font-bold text-slate-900">Order Cart</h3>

      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-slate-500">No items added yet.</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{item.product_name}</p>
                  <p className="text-xs text-slate-500">${Number(item.price_at_time || 0).toFixed(2)} each</p>
                </div>
                <button
                  type="button"
                  disabled={disableDecreaseRemove}
                  onClick={() => onRemove(item)}
                  className="text-xs font-semibold text-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Remove
                </button>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <div className="inline-flex items-center gap-2">
                  <button
                    type="button"
                    disabled={disableDecreaseRemove}
                    onClick={() => onDecrease(item)}
                    className="h-8 w-8 rounded-lg border border-slate-200 bg-white text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    -
                  </button>
                  <span className="w-8 text-center text-sm font-semibold text-slate-900">{item.quantity}</span>
                  <button type="button" onClick={() => onIncrease(item)} className="h-8 w-8 rounded-lg border border-slate-200 bg-white text-slate-700">+</button>
                </div>
                <p className="text-sm font-bold text-slate-900">${lineTotal(item).toFixed(2)}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
