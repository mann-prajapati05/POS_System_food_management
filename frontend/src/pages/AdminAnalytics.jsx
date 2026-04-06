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

const btnNav =
  "h-9 rounded-linen border border-linen-border px-4 text-[13px] font-medium text-linen-text-primary transition-colors hover:bg-linen-surface-2";
const selectClass =
  "h-9 rounded-linen border border-linen-border bg-white px-3 text-[13px] text-linen-text-primary outline-none transition-colors focus:border-linen-primary";

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
    if (!filters.posId) return sessions;
    return sessions.filter((session) => session.pos_id === filters.posId);
  }, [sessions, filters.posId]);

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
        posId: filters.posId || undefined,
        fromDate: filters.fromDate || undefined,
        toDate: filters.toDate || undefined,
        sessionId: filters.sessionId || undefined,
        staffId: filters.staffId || undefined,
        kitchenId: filters.kitchenId || undefined,
      };

      const [dashData, sessionData, salesData, topData] = await Promise.all([
        getAdminDashboard({ posId: filters.posId || undefined }),
        listSessions({
          posId: filters.posId || undefined,
          fromDate: filters.fromDate || undefined,
          toDate: filters.toDate || undefined,
          openedBy: filters.staffId || undefined,
          kitchenId: filters.kitchenId || undefined,
        }),
        getSalesReport(query),
        getTopProducts({
          posId: filters.posId || undefined,
          sessionId: filters.sessionId || undefined,
          staffId: filters.staffId || undefined,
          kitchenId: filters.kitchenId || undefined,
          fromDate: filters.fromDate || undefined,
          toDate: filters.toDate || undefined,
          limit: 8,
        }),
      ]);

      setDashboard(dashData);
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
    <main className="min-h-screen bg-linen-bg px-4 py-8 animate-fade-in">
      <section className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-linen-lg border border-linen-border bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.07em] text-linen-text-muted">
                Admin Insights
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-linen-text-primary">
                POS Analytics
              </h1>
              <p className="mt-1 text-sm text-linen-text-secondary">
                Revenue and operational trends with filter controls.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/dashboard" className={btnNav}>
                Console
              </Link>
              <Link to="/admin/realtime-orders" className={btnNav}>
                Real-time Orders
              </Link>
              <Link to="/admin/floors-tables" className={btnNav}>
                Floors & Tables
              </Link>
              <Link to="/admin/pos" className={btnNav}>
                Open POS
              </Link>
              <button
                type="button"
                onClick={() => {
                  clearAuth();
                  navigate("/admin/login", { replace: true });
                }}
                className={btnNav}
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        <form
          onSubmit={applyFilters}
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
              onChange={(e) =>
                setFilters((p) => ({ ...p, sessionId: e.target.value }))
              }
              className={selectClass}
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
              className={selectClass}
            />
            <input
              type="date"
              value={filters.toDate}
              onChange={(e) =>
                setFilters((p) => ({ ...p, toDate: e.target.value }))
              }
              className={selectClass}
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
              Filters are wired to active reporting/session endpoints.
            </p>
            <button
              type="submit"
              disabled={applying}
              className="h-9 rounded-linen bg-linen-primary px-4 text-[13px] font-medium text-white transition-colors hover:bg-linen-primary-hover disabled:opacity-70"
            >
              {applying ? "Applying..." : "Apply Filters"}
            </button>
          </div>
        </form>

        {loading ? (
          <div className="rounded-linen-lg border border-linen-border bg-white p-8 text-sm text-linen-text-secondary">
            Loading analytics...
          </div>
        ) : (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  label: "Paid Revenue",
                  value: formatCurrency(sales?.totals?.total_revenue),
                },
                {
                  label: "Paid Orders",
                  value: sales?.totals?.order_count || 0,
                },
                {
                  label: "Average Order",
                  value: formatCurrency(sales?.totals?.avg_order_value),
                },
                {
                  label: "Kitchen Active",
                  value: dashboard?.orders?.kitchen_active || 0,
                },
              ].map((stat) => (
                <article
                  key={stat.label}
                  className="rounded-linen-lg border border-linen-border bg-white p-5"
                >
                  <p className="text-[11px] font-medium uppercase tracking-[0.07em] text-linen-text-secondary">
                    {stat.label}
                  </p>
                  <p className="mt-2 font-mono text-2xl font-bold text-linen-text-primary">
                    {stat.value}
                  </p>
                </article>
              ))}
            </section>

            <section className="grid gap-6 xl:grid-cols-2">
              <article className="rounded-linen-lg border border-linen-border bg-white p-6">
                <h2 className="text-base font-semibold text-linen-text-primary">
                  Revenue Timeline
                </h2>
                <div className="mt-4 space-y-2">
                  {(sales?.timeline || []).slice(-10).map((point) => (
                    <div
                      key={String(point.day)}
                      className="flex items-center justify-between rounded-linen bg-linen-surface-2 px-3 py-2 text-[13px]"
                    >
                      <span className="text-linen-text-secondary">
                        {formatDate(point.day)}
                      </span>
                      <span className="font-mono font-semibold text-linen-text-primary">
                        {formatCurrency(point.revenue)} ({point.order_count}{" "}
                        orders)
                      </span>
                    </div>
                  ))}
                  {(!sales?.timeline || sales.timeline.length === 0) && (
                    <p className="text-sm text-linen-text-secondary">
                      No timeline entries for selected filters.
                    </p>
                  )}
                </div>
              </article>

              <article className="rounded-linen-lg border border-linen-border bg-white p-6">
                <h2 className="text-base font-semibold text-linen-text-primary">
                  Top Products
                </h2>
                <div className="mt-4 overflow-hidden rounded-linen-lg border border-linen-border">
                  <table className="w-full border-collapse text-[13px]">
                    <thead>
                      <tr className="border-b border-linen-border bg-linen-surface-2">
                        <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-[0.07em] text-linen-text-secondary">
                          Product
                        </th>
                        <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-[0.07em] text-linen-text-secondary">
                          Qty
                        </th>
                        <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-[0.07em] text-linen-text-secondary">
                          Revenue
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {topProducts.map((item) => (
                        <tr
                          key={item.product_id}
                          className="border-t border-linen-surface-2"
                        >
                          <td className="px-3 py-2 text-linen-text-primary">
                            {item.product_name}
                          </td>
                          <td className="px-3 py-2 font-mono text-linen-text-secondary">
                            {item.quantity_sold}
                          </td>
                          <td className="px-3 py-2 font-mono font-semibold text-linen-text-primary">
                            {formatCurrency(item.revenue)}
                          </td>
                        </tr>
                      ))}
                      {topProducts.length === 0 && (
                        <tr>
                          <td
                            colSpan={3}
                            className="px-3 py-6 text-center text-linen-text-secondary"
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
