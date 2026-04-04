import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import useAuthStore from "../store/authStore";
import {
  getAdminDashboard,
  getSalesReport,
  getTopProducts,
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

export default function AdminAnalytics() {
  const navigate = useNavigate();
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [filters, setFilters] = useState({
    posId: "",
    sessionId: "",
    fromDate: "",
    toDate: "",
    staffId: "",
    kitchenId: "",
  });

  const [dashboard, setDashboard] = useState(null);
  const [sales, setSales] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [posList, setPosList] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [staffUsers, setStaffUsers] = useState([]);
  const [kitchenUsers, setKitchenUsers] = useState([]);

  const sessionOptions = useMemo(() => {
    if (!filters.sessionId && !filters.posId) return sessions;
    if (!filters.posId) return sessions;
    return sessions;
  }, [sessions, filters.sessionId, filters.posId]);

  const loadInitial = async () => {
    setLoading(true);
    try {
      const [
        dashData,
        posData,
        sessionData,
        staffData,
        kitchenData,
        salesData,
        topData,
      ] = await Promise.all([
        getAdminDashboard(),
        listPos(),
        listSessions(),
        listUsers({ role: "staff", isActive: true }),
        listUsers({ role: "kitchen", isActive: true }),
        getSalesReport(),
        getTopProducts({ limit: 8 }),
      ]);

      setDashboard(dashData);
      setPosList(posData);
      setSessions(sessionData);
      setStaffUsers(staffData);
      setKitchenUsers(kitchenData);
      setSales(salesData);
      setTopProducts(topData);
    } catch (error) {
      toast.error(error?.response?.data?.error || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitial();
  }, []);

  const applyFilters = async (event) => {
    event.preventDefault();
    setApplying(true);

    try {
      const query = {
        fromDate: filters.fromDate || undefined,
        toDate: filters.toDate || undefined,
        sessionId: filters.sessionId || undefined,
        staffId: filters.staffId || undefined,
      };

      const [sessionData, salesData, topData] = await Promise.all([
        listSessions({
          fromDate: filters.fromDate || undefined,
          toDate: filters.toDate || undefined,
          openedBy: filters.staffId || undefined,
        }),
        getSalesReport(query),
        getTopProducts({
          fromDate: filters.fromDate || undefined,
          toDate: filters.toDate || undefined,
          limit: 8,
        }),
      ]);

      setSessions(sessionData);
      setSales(salesData);
      setTopProducts(topData);
      toast.success("Analytics updated");
    } catch (error) {
      toast.error(error?.response?.data?.error || "Failed to apply filters");
    } finally {
      setApplying(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <section className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Admin Insights
              </p>
              <h1 className="mt-2 text-3xl font-bold text-slate-900">
                POS Analytics
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Revenue and operational trends with filter controls.
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
                to="/admin/realtime-orders"
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Real-time Orders
              </Link>
              <Link
                to="/admin/floors-tables"
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Floors & Tables
              </Link>
              <Link
                to="/admin/pos"
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Open POS
              </Link>
              <button
                type="button"
                onClick={() => {
                  clearAuth();
                  navigate("/admin/login", { replace: true });
                }}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        <form
          onSubmit={applyFilters}
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
              onChange={(e) =>
                setFilters((p) => ({ ...p, sessionId: e.target.value }))
              }
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
            >
              <option value="">All Sessions</option>
              {sessionOptions.map((session) => (
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
              Filters are wired to active reporting/session endpoints; kitchen
              and POS filters are prepared in UI for your upcoming API joins.
            </p>
            <button
              type="submit"
              disabled={applying}
              className="rounded-xl bg-gradient-to-r from-sky-500 to-emerald-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-70"
            >
              {applying ? "Applying..." : "Apply Filters"}
            </button>
          </div>
        </form>

        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">
            Loading analytics...
          </div>
        ) : (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs text-slate-500">Paid Revenue</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {formatCurrency(sales?.totals?.total_revenue)}
                </p>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs text-slate-500">Paid Orders</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {sales?.totals?.order_count || 0}
                </p>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs text-slate-500">Average Order</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {formatCurrency(sales?.totals?.avg_order_value)}
                </p>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs text-slate-500">Kitchen Active</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {dashboard?.orders?.kitchen_active || 0}
                </p>
              </article>
            </section>

            <section className="grid gap-6 xl:grid-cols-2">
              <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900">
                  Revenue Timeline
                </h2>
                <div className="mt-4 space-y-2">
                  {(sales?.timeline || []).slice(-10).map((point) => (
                    <div
                      key={String(point.day)}
                      className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm"
                    >
                      <span className="text-slate-600">
                        {formatDate(point.day)}
                      </span>
                      <span className="font-semibold text-slate-800">
                        {formatCurrency(point.revenue)} ({point.order_count}{" "}
                        orders)
                      </span>
                    </div>
                  ))}
                  {(!sales?.timeline || sales.timeline.length === 0) && (
                    <p className="text-sm text-slate-500">
                      No timeline entries for selected filters.
                    </p>
                  )}
                </div>
              </article>

              <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900">
                  Top Products
                </h2>
                <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
                  <table className="w-full border-collapse text-sm">
                    <thead className="bg-slate-50 text-left text-slate-500">
                      <tr>
                        <th className="px-3 py-2">Product</th>
                        <th className="px-3 py-2">Qty</th>
                        <th className="px-3 py-2">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topProducts.map((item) => (
                        <tr
                          key={item.product_id}
                          className="border-t border-slate-100"
                        >
                          <td className="px-3 py-2 text-slate-700">
                            {item.product_name}
                          </td>
                          <td className="px-3 py-2 text-slate-600">
                            {item.quantity_sold}
                          </td>
                          <td className="px-3 py-2 font-semibold text-slate-800">
                            {formatCurrency(item.revenue)}
                          </td>
                        </tr>
                      ))}
                      {topProducts.length === 0 && (
                        <tr>
                          <td
                            colSpan={3}
                            className="px-3 py-6 text-center text-slate-500"
                          >
                            No product sales found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </article>
            </section>
          </>
        )}
      </section>
    </main>
  );
}
