import { useMemo, useState } from "react";

function formatCurrency(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function formatDate(value) {
  if (!value) return "No session yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No session yet";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function PosCard({
  posName,
  lastOpenDate,
  lastClosingSale,
  isActive,
  session,
  opening,
  onOpenSession,
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const badge = useMemo(() => {
    if (!isActive) {
      return (
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          No Active Session
        </span>
      );
    }

    return (
      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
        Session Active
      </span>
    );
  }, [isActive]);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_16px_50px_-25px_rgba(2,132,199,0.35)] sm:p-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.08),transparent_42%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.08),transparent_45%)]" />

      <div className="relative">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
              POS Dashboard
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
              {posName}
            </h2>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-xl leading-none text-slate-500 transition-all duration-200 hover:bg-slate-50"
            >
              ...
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-44 rounded-2xl border border-slate-200 bg-white p-1 shadow-lg">
                <button className="w-full rounded-xl px-3 py-2 text-left text-sm text-slate-600 transition-colors hover:bg-slate-100">
                  Settings
                </button>
                <button className="w-full rounded-xl px-3 py-2 text-left text-sm text-slate-600 transition-colors hover:bg-slate-100">
                  Kitchen Display
                </button>
                <button className="w-full rounded-xl px-3 py-2 text-left text-sm text-slate-600 transition-colors hover:bg-slate-100">
                  Customer Display
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Last Open Session
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-700">
              {formatDate(lastOpenDate)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Last Closing Sale
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-700">
              {formatCurrency(lastClosingSale)}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {badge}
          {isActive && session?.opened_at && (
            <span className="text-sm text-slate-600">
              Opened {formatDate(session.opened_at)}
            </span>
          )}
        </div>

        <button
          type="button"
          disabled={isActive || opening}
          onClick={onOpenSession}
          className="mt-8 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-emerald-500 px-6 py-3 text-sm font-bold text-white shadow-md transition-all duration-200 hover:scale-[1.01] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
        >
          {opening && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          )}
          {isActive ? "Session Already Active" : "Open Session"}
        </button>

        {!session && (
          <p className="mt-4 text-sm text-slate-500">
            No session history yet. Open your first session to start taking
            orders.
          </p>
        )}
      </div>
    </div>
  );
}
