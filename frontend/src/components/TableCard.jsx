export default function TableCard({ table, active, onClick }) {
  const occupied = table.status === "occupied";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border p-4 text-left transition-all ${
        active
          ? "border-sky-400 bg-sky-50 shadow"
          : "border-slate-200 bg-white hover:border-sky-300 hover:bg-slate-50"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Table
          </p>
          <h3 className="mt-1 text-2xl font-bold text-slate-900">
            #{table.table_number}
          </h3>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${occupied ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}
        >
          {occupied ? "Occupied" : "Available"}
        </span>
      </div>

      <div className="mt-4 text-sm text-slate-600">{table.seats} seats</div>
      {table.active_order_id && (
        <div className="mt-2 text-xs font-semibold text-sky-700">
          Active order attached
        </div>
      )}
    </button>
  );
}
