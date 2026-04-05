export default function TableCard({ table, active, onClick }) {
  const occupied = table.status === "occupied";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex w-full flex-col rounded-linen-lg border bg-white p-4 text-left transition-all duration-150 ${
        occupied ? "border-l-[3px] border-l-linen-amber" : ""
      } ${
        active
          ? "border-linen-primary"
          : "border-linen-border hover:border-linen-border-strong"
      }`}
      style={{ aspectRatio: "1 / 1" }}
    >
      <div className="flex w-full items-start justify-between">
        <span className="text-[10px] font-medium uppercase tracking-[0.07em] text-linen-text-muted">
          TABLE
        </span>
        <span className="text-[10px] font-medium uppercase tracking-[0.07em] text-linen-text-muted">
          {table.seats} seats
        </span>
      </div>

      <div className="flex flex-1 items-center justify-center">
        <h3 className="font-mono text-[40px] font-bold text-linen-text-primary">
          {table.table_number}
        </h3>
      </div>

      <div className="flex flex-col items-start gap-1">
        <span
          className={`inline-block rounded-linen-pill px-2.5 py-0.5 text-[11px] font-semibold uppercase ${
            occupied
              ? "bg-[#FEF3C7] text-linen-amber"
              : "bg-[#DCFCE7] text-linen-success"
          }`}
        >
          {occupied ? "Occupied" : "Available"}
        </span>
        {table.active_order_id && (
          <span className="font-mono text-xs font-semibold text-linen-amber">
            Active order
          </span>
        )}
      </div>
    </button>
  );
}
