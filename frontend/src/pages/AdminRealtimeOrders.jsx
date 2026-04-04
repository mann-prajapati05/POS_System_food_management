import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  getSessionSummary,
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

  const liveRows = useMemo(() => sessions.slice(0, 20), [sessions]);

  const fetchSummaryFor = async (sessionId) => {
    if (!sessionId) {
      setSelectedSummary(null);
      return;
    }

    try {
      const summary = await getSessionSummary(sessionId);
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
          fromDate: filters.fromDate || undefined,
          toDate: filters.toDate || undefined,
          openedBy: filters.staffId || undefined,
        }),
      ]);

      setPosList(posData);
      setStaffUsers(staffData);
      setKitchenUsers(kitchenData);
      setSessions(sessionData);

      const sessionIdToLoad = filters.sessionId || sessionData[0]?.id;
      if (!filters.sessionId && sessionData[0]?.id) {
        setFilters((prev) => ({ ...prev, sessionId: sessionData[0].id }));
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
  }, [filters.fromDate, filters.toDate, filters.staffId, filters.sessionId]);

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
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <section className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Admin Operations
              </p>
              <h1 className="mt-2 text-3xl font-bold text-slate-900">
                Real-Time Order Details
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Polling every 15 seconds using session/order summary APIs.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                to="/dashboard"
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Console
              </Link>
              <Link
                to="/admin/analytics"
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Analytics
              </Link>
              <Link
                to="/admin/pos"
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Open POS
              </Link>
            </div>
          </div>
        </header>

        <form
          onSubmit={onApplyFilters}
          className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            <select
              value={filters.posId}
              onChange={(e) =>
                setFilters((p) => ({ ...p, posId: e.target.value }))
              }
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
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
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
            >
              <option value="">All Sessions</option>
              {sessions.map((session) => (
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
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
            />
            <input
              type="date"
              value={filters.toDate}
              onChange={(e) =>
                setFilters((p) => ({ ...p, toDate: e.target.value }))
              }
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
            />

            <select
              value={filters.staffId}
              onChange={(e) =>
                setFilters((p) => ({ ...p, staffId: e.target.value }))
              }
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
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
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
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
            <p className="text-xs text-slate-500">
              Last refresh updates automatically. Kitchen and POS filter
              controls are ready for your extended join APIs.
            </p>
            <button
              type="submit"
              disabled={loading || refreshing}
              className="rounded-xl bg-gradient-to-r from-sky-500 to-emerald-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-70"
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
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Live Sessions</h2>
            <div className="mt-4 space-y-2">
              {loading ? (
                <p className="text-sm text-slate-500">Loading sessions...</p>
              ) : liveRows.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No sessions found for selected filters.
                </p>
              ) : (
                liveRows.map((session) => (
                  <button
                    type="button"
                    key={session.id}
                    onClick={() => onSessionChange(session.id)}
                    className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-left text-sm hover:bg-slate-50"
                  >
                    <span className="text-slate-700">
                      {session.id.slice(0, 8)} • {session.opened_by_name}
                    </span>
                    <span className="font-semibold text-slate-800">
                      {formatCurrency(session.calculated_revenue)}
                    </span>
                  </button>
                ))
              )}
            </div>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">
              Session Order Detail
            </h2>
            {!selectedSummary ? (
              <p className="mt-4 text-sm text-slate-500">
                Select a session to inspect live order detail.
              </p>
            ) : (
              <div className="mt-4 space-y-3 text-sm">
                <div className="rounded-xl bg-slate-50 px-3 py-2 text-slate-700">
                  Session: {selectedSummary.session?.id}
                </div>
                <div className="rounded-xl bg-slate-50 px-3 py-2 text-slate-700">
                  Opened by: {selectedSummary.session?.opened_by_name}
                </div>
                <div className="rounded-xl bg-slate-50 px-3 py-2 text-slate-700">
                  Opened at: {formatDate(selectedSummary.session?.opened_at)}
                </div>
                <div className="rounded-xl bg-slate-50 px-3 py-2 text-slate-700">
                  Total orders: {selectedSummary.summary?.total_orders || 0}
                </div>
                <div className="rounded-xl bg-slate-50 px-3 py-2 text-slate-700">
                  Paid orders: {selectedSummary.summary?.paid_orders || 0}
                </div>
                <div className="rounded-xl bg-slate-50 px-3 py-2 text-slate-700">
                  Revenue: {formatCurrency(selectedSummary.summary?.revenue)}
                </div>

                <div className="rounded-2xl border border-slate-200">
                  <table className="w-full border-collapse text-sm">
                    <thead className="bg-slate-50 text-left text-slate-500">
                      <tr>
                        <th className="px-3 py-2">Payment</th>
                        <th className="px-3 py-2">Count</th>
                        <th className="px-3 py-2">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedSummary.paymentBreakdown || []).map((row) => (
                        <tr
                          key={row.method}
                          className="border-t border-slate-100"
                        >
                          <td className="px-3 py-2 text-slate-700">
                            {row.method}
                          </td>
                          <td className="px-3 py-2 text-slate-600">
                            {row.count}
                          </td>
                          <td className="px-3 py-2 font-semibold text-slate-800">
                            {formatCurrency(row.total)}
                          </td>
                        </tr>
                      ))}
                      {(selectedSummary.paymentBreakdown || []).length ===
                        0 && (
                        <tr>
                          <td
                            colSpan={3}
                            className="px-3 py-6 text-center text-slate-500"
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
