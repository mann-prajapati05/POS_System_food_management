import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  getAdminSessionSummary,
  listPos,
  listSessions,
  listUsers,
} from "../services/adminService";

function formatCurrency(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function formatDate(value) {
  if (!value) return "--";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "--";
  return d.toLocaleString();
}

const btnNav =
  "h-9 rounded-linen border border-linen-border px-4 text-[13px] font-medium text-linen-text-primary transition-colors hover:bg-linen-surface-2";
const selectClass =
  "h-9 rounded-linen border border-linen-border bg-white px-3 text-[13px] text-linen-text-primary outline-none transition-colors focus:border-linen-primary";
const dateClass =
  "h-9 rounded-linen border border-linen-border bg-white px-3 text-[13px] text-linen-text-primary outline-none transition-colors focus:border-linen-primary";

export default function AdminRealtimeOrders() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [filters, setFilters] = useState({
    posId: "",
    sessionId: "",
    fromDate: "",
    toDate: "",
    staffId: "",
    kitchenId: "",
  });

  const [posList, setPosList] = useState([]);
  const [staffUsers, setStaffUsers] = useState([]);
  const [kitchenUsers, setKitchenUsers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [selectedSummary, setSelectedSummary] = useState(null);

  const liveRows = useMemo(() => {
    const base = filters.posId
      ? sessions.filter((session) => session.pos_id === filters.posId)
      : sessions;
    return base.slice(0, 20);
  }, [sessions, filters.posId]);

  const fetchSummaryFor = async (sessionId) => {
    if (!sessionId) {
      setSelectedSummary(null);
      return;
    }

    try {
      const summary = await getAdminSessionSummary(sessionId, {
        posId: filters.posId || undefined,
      });
      setSelectedSummary(summary);
    } catch (error) {
      setSelectedSummary(null);
      toast.error(
        error?.response?.data?.error || "Failed to load session details",
      );
    }
  };

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    if (silent) setRefreshing(true);

    try {
      const [posData, staffData, kitchenData, sessionData] = await Promise.all([
        listPos(),
        listUsers({ role: "staff", isActive: true }),
        listUsers({ role: "kitchen", isActive: true }),
        listSessions({
          posId: filters.posId || undefined,
          fromDate: filters.fromDate || undefined,
          toDate: filters.toDate || undefined,
          openedBy: filters.staffId || undefined,
          kitchenId: filters.kitchenId || undefined,
        }),
      ]);

      setPosList(posData);
      setStaffUsers(staffData);
      setKitchenUsers(kitchenData);
      setSessions(sessionData);

      const filteredSessions = filters.posId
        ? sessionData.filter((session) => session.pos_id === filters.posId)
        : sessionData;

      const sessionIdToLoad = filters.sessionId || filteredSessions[0]?.id;
      if (!filters.sessionId && filteredSessions[0]?.id) {
        setFilters((prev) => ({ ...prev, sessionId: filteredSessions[0].id }));
      }
      await fetchSummaryFor(sessionIdToLoad);
    } catch (error) {
      toast.error(
        error?.response?.data?.error || "Failed to load real-time orders view",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData(false);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      loadData(true);
    }, 15000);

    return () => clearInterval(interval);
  }, [
    filters.posId,
    filters.fromDate,
    filters.toDate,
    filters.staffId,
    filters.kitchenId,
    filters.sessionId,
  ]);

  const onApplyFilters = async (event) => {
    event.preventDefault();
    await loadData(false);
    toast.success("Live view refreshed");
  };

  const onSessionChange = async (value) => {
    setFilters((prev) => ({ ...prev, sessionId: value }));
    await fetchSummaryFor(value);
  };

  return (
    <main className="min-h-screen bg-linen-bg px-4 py-8 animate-fade-in">
      <section className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-linen-lg border border-linen-border bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.07em] text-linen-text-muted">
                Admin Operations
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-linen-text-primary">
                Real-Time Order Details
              </h1>
              <p className="mt-1 text-sm text-linen-text-secondary">
                Polling every 15 seconds using session/order summary APIs.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/dashboard" className={btnNav}>
                Console
              </Link>
              <Link to="/admin/analytics" className={btnNav}>
                Analytics
              </Link>
              <Link to="/admin/floors-tables" className={btnNav}>
                Floors & Tables
              </Link>
              <Link to="/admin/pos" className={btnNav}>
                Open POS
              </Link>
            </div>
          </div>
        </header>

        <form
          onSubmit={onApplyFilters}
          className="rounded-linen-lg border border-linen-border bg-white p-6"
        >
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            <select
              value={filters.posId}
              onChange={(e) =>
                setFilters((p) => ({ ...p, posId: e.target.value }))
              }
              className={selectClass}
            >
              <option value="">All POS</option>
              {posList.map((pos) => (
                <option key={pos.id} value={pos.id}>
                  {pos.name}
                </option>
              ))}
            </select>

            <select
              value={filters.sessionId}
              onChange={(e) => onSessionChange(e.target.value)}
              className={selectClass}
            >
              <option value="">All Sessions</option>
              {(filters.posId
                ? sessions.filter((session) => session.pos_id === filters.posId)
                : sessions
              ).map((session) => (
                <option key={session.id} value={session.id}>
                  {session.id.slice(0, 8)} • {session.status}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={filters.fromDate}
              onChange={(e) =>
                setFilters((p) => ({ ...p, fromDate: e.target.value }))
              }
              className={dateClass}
            />
            <input
              type="date"
              value={filters.toDate}
              onChange={(e) =>
                setFilters((p) => ({ ...p, toDate: e.target.value }))
              }
              className={dateClass}
            />

            <select
              value={filters.staffId}
              onChange={(e) =>
                setFilters((p) => ({ ...p, staffId: e.target.value }))
              }
              className={selectClass}
            >
              <option value="">All Staff</option>
              {staffUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>

            <select
              value={filters.kitchenId}
              onChange={(e) =>
                setFilters((p) => ({ ...p, kitchenId: e.target.value }))
              }
              className={selectClass}
            >
              <option value="">All Kitchen</option>
              {kitchenUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-linen-text-muted">
              Last refresh updates automatically.
            </p>
            <button
              type="submit"
              disabled={loading || refreshing}
              className="h-9 rounded-linen bg-linen-primary px-4 text-[13px] font-medium text-white transition-colors hover:bg-linen-primary-hover disabled:opacity-70"
            >
              {loading
                ? "Loading..."
                : refreshing
                  ? "Refreshing..."
                  : "Refresh Now"}
            </button>
          </div>
        </form>

        <section className="grid gap-6 xl:grid-cols-2">
          <article className="rounded-linen-lg border border-linen-border bg-white p-6">
            <h2 className="text-base font-semibold text-linen-text-primary">
              Live Sessions
            </h2>
            <div className="mt-4 space-y-2">
              {loading ? (
                <p className="text-sm text-linen-text-secondary">
                  Loading sessions...
                </p>
              ) : liveRows.length === 0 ? (
                <p className="text-sm text-linen-text-secondary">
                  No sessions found for selected filters.
                </p>
              ) : (
                liveRows.map((session) => (
                  <button
                    type="button"
                    key={session.id}
                    onClick={() => onSessionChange(session.id)}
                    className="flex w-full items-center justify-between rounded-linen border border-linen-border px-3 py-2 text-left text-[13px] transition-colors hover:bg-linen-bg"
                  >
                    <span className="text-linen-text-primary">
                      <span className="font-mono">
                        {session.id.slice(0, 8)}
                      </span>{" "}
                      • {session.opened_by_name}
                    </span>
                    <span className="font-mono font-semibold text-linen-text-primary">
                      {formatCurrency(session.calculated_revenue)}
                    </span>
                  </button>
                ))
              )}
            </div>
          </article>

          <article className="rounded-linen-lg border border-linen-border bg-white p-6">
            <h2 className="text-base font-semibold text-linen-text-primary">
              Session Order Detail
            </h2>
            {!selectedSummary ? (
              <p className="mt-4 text-sm text-linen-text-secondary">
                Select a session to inspect live order detail.
              </p>
            ) : (
              <div className="mt-4 space-y-2 text-[13px]">
                <div className="rounded-linen bg-linen-surface-2 px-3 py-2 text-linen-text-primary">
                  Session:{" "}
                  <span className="font-mono">
                    {selectedSummary.session?.id}
                  </span>
                </div>
                <div className="rounded-linen bg-linen-surface-2 px-3 py-2 text-linen-text-primary">
                  Opened by: {selectedSummary.session?.opened_by_name}
                </div>
                <div className="rounded-linen bg-linen-surface-2 px-3 py-2 text-linen-text-primary">
                  Opened at: {formatDate(selectedSummary.session?.opened_at)}
                </div>
                <div className="rounded-linen bg-linen-surface-2 px-3 py-2 text-linen-text-primary">
                  Total orders:{" "}
                  <span className="font-mono font-semibold">
                    {selectedSummary.summary?.total_orders || 0}
                  </span>
                </div>
                <div className="rounded-linen bg-linen-surface-2 px-3 py-2 text-linen-text-primary">
                  Paid orders:{" "}
                  <span className="font-mono font-semibold">
                    {selectedSummary.summary?.paid_orders || 0}
                  </span>
                </div>
                <div className="rounded-linen bg-linen-surface-2 px-3 py-2 text-linen-text-primary">
                  Revenue:{" "}
                  <span className="font-mono font-semibold">
                    {formatCurrency(selectedSummary.summary?.revenue)}
                  </span>
                </div>

                <div className="overflow-hidden rounded-linen-lg border border-linen-border">
                  <table className="w-full border-collapse text-[13px]">
                    <thead>
                      <tr className="border-b border-linen-border bg-linen-surface-2">
                        <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-[0.07em] text-linen-text-secondary">
                          Payment
                        </th>
                        <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-[0.07em] text-linen-text-secondary">
                          Count
                        </th>
                        <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-[0.07em] text-linen-text-secondary">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedSummary.paymentBreakdown || []).map((row) => (
                        <tr
                          key={row.method}
                          className="border-t border-linen-surface-2"
                        >
                          <td className="px-3 py-2 text-linen-text-primary">
                            {row.method}
                          </td>
                          <td className="px-3 py-2 font-mono text-linen-text-secondary">
                            {row.count}
                          </td>
                          <td className="px-3 py-2 font-mono font-semibold text-linen-text-primary">
                            {formatCurrency(row.total)}
                          </td>
                        </tr>
                      ))}
                      {(selectedSummary.paymentBreakdown || []).length ===
                        0 && (
                        <tr>
                          <td
                            colSpan={3}
                            className="px-3 py-6 text-center text-linen-text-secondary"
                          >
                            No payment breakdown yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </article>
        </section>
      </section>
    </main>
  );
}
