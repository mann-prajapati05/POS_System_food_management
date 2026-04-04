import { useMemo, useState } from "react";

const OPTIONS = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card / Bank" },
  { value: "upi", label: "UPI" },
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
  const [upiReference, setUpiReference] = useState("");

  const amountNumber = Number(amount || 0);
  const change = useMemo(
    () => Math.max(0, amountNumber - total),
    [amountNumber, total],
  );

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <h3 className="text-xl font-bold text-slate-900">Payment</h3>
      <p className="mt-1 text-sm text-slate-500">
        Order #{String(order?.id || "").slice(0, 8)}
      </p>

      <div className="mt-5 rounded-xl bg-slate-50 p-4">
        <p className="text-xs text-slate-500">Total amount</p>
        <p className="mt-1 text-3xl font-bold text-slate-900">
          ${total.toFixed(2)}
        </p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setMethod(option.value)}
            className={`rounded-xl border px-3 py-2 text-sm font-semibold ${method === option.value ? "border-sky-300 bg-sky-50 text-sky-700" : "border-slate-200 text-slate-700 hover:bg-slate-100"}`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-semibold text-slate-700">
          Amount
          <input
            type="number"
            min={0}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
          />
        </label>

        <div className="rounded-xl border border-slate-200 p-3">
          <p className="text-xs text-slate-500">Change</p>
          <p className="mt-1 text-xl font-bold text-slate-900">
            ${change.toFixed(2)}
          </p>
        </div>
      </div>

      {method === "upi" && (
        <label className="mt-4 block text-sm font-semibold text-slate-700">
          UPI Reference
          <input
            value={upiReference}
            onChange={(e) => setUpiReference(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
            placeholder="UPI transaction reference"
          />
        </label>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={processing}
          onClick={() =>
            onConfirm({
              method,
              amount: Number(amount || 0),
              upiReference: upiReference || undefined,
            })
          }
          className="rounded-xl bg-gradient-to-r from-sky-500 to-emerald-500 px-5 py-2 text-sm font-semibold text-white disabled:opacity-70"
        >
          {processing ? "Processing..." : "Pay Now"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
        >
          Pay Later
        </button>
      </div>
    </section>
  );
}
