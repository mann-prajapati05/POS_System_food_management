import CategoryTabs from "../components/CategoryTabs";
import ProductCard from "../components/ProductCard";
import CartPanel from "../components/CartPanel";

function orderTotal(items) {
  return items.reduce(
    (sum, item) =>
      sum + Number(item.quantity || 0) * Number(item.price_at_time || 0),
    0,
  );
}

export default function OrderScreen({
  order,
  items,
  categories,
  products,
  selectedCategoryId,
  onSelectCategory,
  search,
  onSearch,
  onAddItem,
  onIncreaseQty,
  onDecreaseQty,
  onRemoveItem,
  onSendKitchen,
  onPayment,
  busy,
}) {
  const subtotal = orderTotal(items);
  const discount = 0;
  const finalAmount = Math.max(0, subtotal - discount);
  const canAddOrIncrease = ['draft', 'pending', 'to_cook', 'preparing'].includes(order?.status);
  const canDecreaseOrRemove = ['draft', 'pending'].includes(order?.status);
  const canSendToKitchen = ['draft', 'pending'].includes(order?.status);

  return (
    <section className="grid gap-4 xl:grid-cols-[1.1fr_1.3fr_0.9fr]">
      <div className="space-y-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="text-lg font-bold text-slate-900">Categories</h3>
          <div className="mt-3">
            <CategoryTabs
              categories={categories}
              selectedCategoryId={selectedCategoryId}
              onSelect={onSelectCategory}
            />
          </div>

          <label className="mt-4 block text-sm font-semibold text-slate-700">
            Search products
            <input
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Search product"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
            />
          </label>
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} onAdd={onAddItem} disabled={!canAddOrIncrease || busy} />
          ))}
          {products.length === 0 && (
            <p className="text-sm text-slate-500">
              No products found for this filter.
            </p>
          )}
        </section>
      </div>

      <CartPanel
        items={items}
        onIncrease={onIncreaseQty}
        onDecrease={onDecreaseQty}
        onRemove={onRemoveItem}
        disableDecreaseRemove={!canDecreaseOrRemove || busy}
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="text-lg font-bold text-slate-900">Summary</h3>
        <p className="mt-1 text-xs text-slate-500">
          Order #{String(order?.id || "").slice(0, 8)}
        </p>
        {!canDecreaseOrRemove && (
          <p className="mt-2 text-xs font-medium text-amber-700">
            Order already sent to kitchen. You can add or increase items, but cannot decrease or remove.
          </p>
        )}

        <div className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Discount</span>
            <span>${discount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-900">
            <span>Payable</span>
            <span>${finalAmount.toFixed(2)}</span>
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <button
            type="button"
            disabled={busy || items.length === 0 || !canSendToKitchen}
            onClick={onSendKitchen}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
          >
            Send to Kitchen
          </button>
          <button
            type="button"
            disabled={busy || items.length === 0}
            onClick={onPayment}
            className="w-full rounded-xl bg-gradient-to-r from-sky-500 to-emerald-500 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            Payment
          </button>
        </div>
      </section>
    </section>
  );
}
