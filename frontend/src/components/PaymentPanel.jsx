import { useMemo, useState } from "react";

const OPTIONS = [
  { value: "cash", label: "Cash", icon: "💵" },
  { value: "card", label: "Card / Bank", icon: "💳" },
  { value: "upi", label: "UPI", icon: "📱" },
];

export default function PaymentPanel({
  order,
  onConfirm,
  onCancel,
  processing,
}) {
  const total = Number(order?.total_price || 0);
  const [method, setMethod] = useState("cash");
  const [amount, setAmount] = useState(total.toFixed(2));

  const amountNumber = Number(amount || 0);
  const isRazorpayMethod = method === "card" || method === "upi";
  const change = useMemo(
    () => Math.max(0, amountNumber - total),
    [amountNumber, total],
  );

  return (
    <section className="rounded-linen-xl border border-linen-border bg-white p-6 animate-fade-in">
      <h3 className="text-[13px] font-semibold text-linen-text-primary">Order Summary</h3>
      <p className="mt-0.5 font-mono text-xs text-linen-text-muted">
        #{String(order?.id || "").slice(0, 8)}
      </p>

      {/* Items compact list */}
      <div className="mt-4 border-b border-linen-surface-2 pb-3">
        {(order?.items || []).map((item) => (
          <div key={item.id} className="flex h-9 items-center justify-between text-[13px]">
            <span className="text-linen-text-primary">{item.product_name || item.name}</span>
            <div className="flex items-center gap-4">
              <span className="text-linen-text-muted">×{item.quantity}</span>
              <span className="font-mono font-semibold text-linen-text-primary">
                ${(Number(item.quantity || 0) * Number(item.price_at_time || item.price || 0)).toFixed(2)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Total due */}
      <div className="py-6 text-center">
        <p className="text-[11px] font-medium uppercase tracking-[0.07em] text-linen-text-secondary">
          TOTAL DUE
        </p>
        <p className="mt-2 font-mono text-[52px] font-bold leading-none text-linen-text-primary">
          ${total.toFixed(2)}
        </p>
      </div>

      {/* Payment method */}
      <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.07em] text-linen-text-secondary">
        SELECT PAYMENT METHOD
      </p>
      <div className="grid grid-cols-3 gap-3">
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => {
              setMethod(option.value);
              if (option.value === "card" || option.value === "upi") {
                setAmount(total.toFixed(2));
              }
            }}
            className={`flex flex-col items-center rounded-linen-lg border p-5 transition-all duration-150 ${
              method === option.value
                ? "border-linen-primary bg-linen-bg text-linen-text-primary"
                : "border-linen-border bg-white text-linen-text-secondary hover:border-linen-border-strong"
            }`}
          >
            <span className="text-2xl">{option.icon}</span>
            <span className="mt-2 text-[13px] font-medium">{option.label}</span>
          </button>
        ))}
      </div>

      {/* Amount input (for cash) */}
      {!isRazorpayMethod && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.07em] text-linen-text-secondary">
              Amount
            </span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-10 w-full rounded-linen border border-linen-border bg-white px-3 font-mono text-sm outline-none transition-colors focus:border-linen-primary"
            />
          </label>
          <div className="rounded-linen-lg border border-linen-border p-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.07em] text-linen-text-muted">Change</p>
            <p className="mt-1 font-mono text-xl font-bold text-linen-text-primary">
              ${change.toFixed(2)}
            </p>
          </div>
        </div>
      )}

      {method === "upi" && (
        <p className="mt-4 text-sm text-linen-text-secondary">
          UPI QR / app intent will open in Razorpay Checkout.
        </p>
      )}

      {/* Action buttons */}
      <div className="mt-6 space-y-2">
        <button
          type="button"
          disabled={processing}
          onClick={() =>
            onConfirm({
              method,
              amount: Number(amount || 0),
            })
          }
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-linen bg-linen-primary text-sm font-medium text-white transition-colors hover:bg-linen-primary-hover disabled:cursor-not-allowed disabled:opacity-70"
        >
          {processing ? "Processing..." : isRazorpayMethod ? "Pay with Razorpay" : "Confirm Payment"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="h-10 w-full rounded-linen border border-linen-border bg-white text-[13px] font-medium text-linen-text-primary transition-colors hover:border-linen-border-strong hover:bg-linen-surface-2"
        >
          Cancel
        </button>
      </div>
    </section>
  );
}
