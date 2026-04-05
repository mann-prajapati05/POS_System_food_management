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

function isKitchenItem(item) {
  return item?.is_kitchen_item !== false;
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
  const hasKitchenItems = items.some(isKitchenItem);
  const canAddOrIncrease = ['draft', 'pending', 'to_cook', 'preparing'].includes(order?.status);
  const canDecreaseOrRemove = ['draft', 'pending'].includes(order?.status);
  const canSendToKitchen = ['draft', 'pending'].includes(order?.status) && hasKitchenItems;
  const canProceedPayment = items.length > 0 && (!hasKitchenItems || order?.status === 'completed');

  return (
    <section className="flex gap-0 animate-fade-in" style={{ height: "calc(100vh - 80px)" }}>
      {/* LEFT — Products (60%) */}
      <div className="flex w-[60%] flex-col bg-linen-bg">
        {/* Category tabs + search */}
        <div className="border-b border-linen-border p-4">
          <CategoryTabs
            categories={categories}
            selectedCategoryId={selectedCategoryId}
            onSelect={onSelectCategory}
          />
          <div className="relative mt-3">
            <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-linen-text-muted" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Search products..."
              className="h-10 w-full rounded-linen border border-linen-border bg-white pl-9 pr-3 text-sm text-linen-text-primary outline-none transition-colors placeholder:text-linen-text-muted focus:border-linen-primary"
            />
          </div>
        </div>

        {/* Product grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-3 gap-3">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} onAdd={onAddItem} disabled={!canAddOrIncrease || busy} />
            ))}
          </div>
          {products.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <svg className="h-12 w-12 text-linen-border" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
              </svg>
              <p className="mt-3 text-sm text-linen-text-secondary">No products found</p>
              <p className="mt-1 text-[13px] text-linen-text-muted">Try adjusting your filters</p>
            </div>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="w-px bg-linen-border" />

      {/* RIGHT — Cart + Summary (40%) */}
      <div className="flex w-[40%] flex-col bg-white">
        {/* Cart */}
        <div className="flex-1 overflow-y-auto">
          <CartPanel
            items={items}
            onIncrease={onIncreaseQty}
            onDecrease={onDecreaseQty}
            onRemove={onRemoveItem}
            disableDecreaseRemove={!canDecreaseOrRemove || busy}
          />
        </div>

        {/* Summary footer */}
        <div className="border-t border-linen-border p-4">
          <p className="font-mono text-xs text-linen-text-muted">
            Order #{String(order?.id || "").slice(0, 8)}
          </p>
          {!canDecreaseOrRemove && (
            <p className="mt-1 text-xs font-medium text-linen-amber">
              Order sent to kitchen. You can add items but cannot remove.
            </p>
          )}
          {!hasKitchenItems && items.length > 0 && (
            <p className="mt-1 text-xs font-medium text-linen-text-secondary">
              No items require kitchen preparation
            </p>
          )}

          <div className="mt-3 space-y-1.5 text-[13px]">
            <div className="flex justify-between text-linen-text-secondary">
              <span>Subtotal</span>
              <span className="font-mono font-semibold">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-linen-text-secondary">
              <span>Tax</span>
              <span className="font-mono font-semibold">${discount.toFixed(2)}</span>
            </div>
            <div className="h-px bg-linen-border" />
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-[0.07em] text-linen-text-secondary">
                TOTAL
              </span>
              <span className="font-mono text-2xl font-bold text-linen-text-primary">
                ${finalAmount.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <button
              type="button"
              disabled={busy || items.length === 0 || !canSendToKitchen}
              onClick={onSendKitchen}
              className="h-10 w-full rounded-linen border border-linen-border bg-white text-[13px] font-medium text-linen-text-primary transition-colors hover:border-linen-border-strong hover:bg-linen-surface-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Send to Kitchen
            </button>
            <button
              type="button"
              disabled={busy || !canProceedPayment}
              onClick={onPayment}
              className="h-10 w-full rounded-linen bg-linen-primary text-[13px] font-medium text-white transition-colors hover:bg-linen-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              Proceed to Payment
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
