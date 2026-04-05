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
        <span className="rounded-linen-pill bg-linen-surface-2 px-3 py-1 text-[11px] font-semibold uppercase text-linen-text-secondary">
          No Active Session
        </span>
      );
    }

    return (
      <span className="rounded-linen-pill bg-[#DCFCE7] px-3 py-1 text-[11px] font-semibold uppercase text-linen-success">
        Session Active
      </span>
    );
  }, [isActive]);

  return (
    <div className="relative rounded-linen-lg border border-linen-border bg-white p-6 sm:p-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.07em] text-linen-text-muted">
            POS Dashboard
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-linen-text-primary sm:text-3xl">
            {posName}
          </h2>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="flex h-9 w-9 items-center justify-center rounded-linen border border-linen-border text-xl leading-none text-linen-text-muted transition-colors hover:bg-linen-surface-2"
          >
            ⋯
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-44 rounded-linen-lg border border-linen-border bg-white p-1 shadow-linen-modal">
              <button className="w-full rounded-linen px-3 py-2 text-left text-[13px] text-linen-text-secondary transition-colors hover:bg-linen-surface-2">
                Settings
              </button>
              <button className="w-full rounded-linen px-3 py-2 text-left text-[13px] text-linen-text-secondary transition-colors hover:bg-linen-surface-2">
                Kitchen Display
              </button>
              <button className="w-full rounded-linen px-3 py-2 text-left text-[13px] text-linen-text-secondary transition-colors hover:bg-linen-surface-2">
                Customer Display
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-linen-lg border border-linen-border bg-linen-surface-2 p-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.07em] text-linen-text-muted">
            Last Open Session
          </p>
          <p className="mt-2 text-sm font-medium text-linen-text-primary">
            {formatDate(lastOpenDate)}
          </p>
        </div>

        <div className="rounded-linen-lg border border-linen-border bg-linen-surface-2 p-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.07em] text-linen-text-muted">
            Last Closing Sale
          </p>
          <p className="mt-2 font-mono text-sm font-semibold text-linen-text-primary">
            {formatCurrency(lastClosingSale)}
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {badge}
        {isActive && session?.opened_at && (
          <span className="text-sm text-linen-text-secondary">
            Opened {formatDate(session.opened_at)}
          </span>
        )}
      </div>

      <button
        type="button"
        disabled={isActive || opening}
        onClick={onOpenSession}
        className="mt-8 inline-flex h-11 items-center justify-center gap-2 rounded-linen bg-linen-primary px-6 text-sm font-medium text-white transition-colors hover:bg-linen-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {opening && (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
        )}
        {isActive ? "Session Already Active" : "Open Session"}
      </button>

      {!session && (
        <p className="mt-4 text-sm text-linen-text-secondary">
          No session history yet. Open your first session to start taking
          orders.
        </p>
      )}
    </div>
  );
}
