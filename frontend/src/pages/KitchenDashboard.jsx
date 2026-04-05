import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import FilterSidebar from '../components/kitchen/FilterSidebar';
import StatusTabs from '../components/kitchen/StatusTabs';
import TicketCard from '../components/kitchen/TicketCard';
import {
  getOrdersByStatus,
  KITCHEN_STATUS,
  updateItemStatus,
  updateOrderStatus,
} from '../services/kitchenService';
import { getActiveSession, openSession } from '../services/sessionService';
import useAuthStore from '../store/authStore';

const POLL_INTERVAL_MS = 6000;
const UPDATED_BADGE_MS = 8000;

function ticketLabel(orderId) {
  return `#${String(orderId || '').replace(/-/g, '').slice(-4).toUpperCase()}`;
}

function stageOrders(orders) {
  return {
    to_cook: orders.filter((order) => order.status === KITCHEN_STATUS.TO_COOK),
    preparing: orders.filter((order) => order.status === KITCHEN_STATUS.PREPARING),
    completed: orders.filter((order) => order.status === KITCHEN_STATUS.COMPLETED),
  };
}

function collectCategoryName(item) {
  if (item?.categoryName) return item.categoryName;
  if (item?.category_name) return item.category_name;
  if (item?.category) return item.category;
  return '';
}

function normalizeOrders(orders, stagedPrepared) {
  return orders.map((order) => {
    const stagedMap = stagedPrepared[order.id] || {};

    const items = (order.items || []).map((item) => {
      const quantity = Number(item.quantity || 0);
      const basePrepared = Number(item.quantityPrepared ?? (item.isPrepared ? quantity : 0));
      const staged = Number(stagedMap[item.itemId] || 0);
      const effectivePrepared = Math.min(quantity, basePrepared + staged);

      return {
        ...item,
        quantity,
        quantityPreparedBase: Math.min(quantity, basePrepared),
        stagedPrepared: staged,
        quantityPreparedEffective: effectivePrepared,
      };
    });

    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    const preparedQuantity = items.reduce((sum, item) => sum + item.quantityPreparedEffective, 0);

    return {
      ...order,
      ticketLabel: ticketLabel(order.id),
      items,
      totalQuantityDisplay: totalQuantity,
      preparedCountDisplay: preparedQuantity,
      isAllPrepared: totalQuantity > 0 && preparedQuantity >= totalQuantity,
    };
  });
}

function orderSignature(order) {
  const parts = [`status:${order.status}`];
  (order.items || []).forEach((item) => {
    parts.push(`${item.itemId}:${item.quantity}:${item.quantityPrepared || 0}`);
  });
  return parts.join('|');
}

export default function KitchenDashboard() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyOrderId, setBusyOrderId] = useState('');
  const [sessionBusy, setSessionBusy] = useState(false);
  const [activeSession, setActiveSession] = useState(null);

  const [orders, setOrders] = useState([]);
  const [stagedPrepared, setStagedPrepared] = useState({});
  const [dismissedCompleted, setDismissedCompleted] = useState({});
  const [updatedOrders, setUpdatedOrders] = useState({});

  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(3);

  const hasActiveSession = activeSession?.status === 'active';

  const loadSession = async () => {
    try {
      const current = await getActiveSession('kitchen');
      if (current?.status === 'active') {
        setActiveSession(current);
      } else {
        setActiveSession(null);
      }
    } catch {
      setActiveSession(null);
    }
  };

  const loadOrders = async ({ silent = false } = {}) => {
    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const list = await getOrdersByStatus([
        KITCHEN_STATUS.TO_COOK,
        KITCHEN_STATUS.PREPARING,
        KITCHEN_STATUS.COMPLETED,
      ]);

      setOrders((prev) => {
        const prevById = new Map(prev.map((order) => [order.id, orderSignature(order)]));
        const now = Date.now();
        setUpdatedOrders((current) => {
          const next = { ...current };

          list.forEach((order) => {
            const prevSig = prevById.get(order.id);
            const nextSig = orderSignature(order);
            if (prevSig && prevSig !== nextSig) {
              next[order.id] = now;
            }
          });

          Object.keys(next).forEach((orderId) => {
            if (now - next[orderId] > UPDATED_BADGE_MS) {
              delete next[orderId];
            }
          });

          return next;
        });

        return list;
      });

      setStagedPrepared((prev) => {
        const next = {};
        list.forEach((order) => {
          if (prev[order.id]) {
            next[order.id] = prev[order.id];
          }
        });
        return next;
      });
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to load kitchen orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadOrders();
    loadSession();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      loadOrders({ silent: true });
    }, POLL_INTERVAL_MS);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [activeTab, search, selectedProduct, selectedCategory, perPage]);

  const normalized = useMemo(() => normalizeOrders(orders, stagedPrepared), [orders, stagedPrepared]);
  const staged = useMemo(() => stageOrders(normalized), [normalized]);

  const productOptions = useMemo(() => {
    const names = new Set();
    normalized.forEach((order) => {
      order.items.forEach((item) => names.add(item.name));
    });
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [normalized]);

  const categoryOptions = useMemo(() => {
    const categories = new Set();
    normalized.forEach((order) => {
      order.items.forEach((item) => {
        const category = collectCategoryName(item);
        if (category) categories.add(category);
      });
    });
    return [...categories].sort((a, b) => a.localeCompare(b));
  }, [normalized]);

  const filtered = useMemo(() => {
    const base = activeTab === 'all'
      ? normalized
      : normalized.filter((order) => order.status === activeTab);

    const q = search.trim().toLowerCase();

    return base.filter((order) => {
      if (order.status === KITCHEN_STATUS.COMPLETED && dismissedCompleted[order.id]) {
        return false;
      }

      const orderMatch = !q ||
        order.ticketLabel.toLowerCase().includes(q) ||
        String(order.id).toLowerCase().includes(q);

      const productMatch = !q || order.items.some((item) => item.name.toLowerCase().includes(q));

      if (!orderMatch && !productMatch) {
        return false;
      }

      if (selectedProduct && !order.items.some((item) => item.name === selectedProduct)) {
        return false;
      }

      if (selectedCategory && !order.items.some((item) => collectCategoryName(item) === selectedCategory)) {
        return false;
      }

      return true;
    });
  }, [activeTab, dismissedCompleted, normalized, search, selectedCategory, selectedProduct]);

  const paged = useMemo(() => {
    const start = (page - 1) * perPage;
    const end = start + perPage;
    return filtered.slice(start, end);
  }, [filtered, page, perPage]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / perPage));

  const counts = useMemo(() => ({
    all: normalized.filter((o) => !(o.status === KITCHEN_STATUS.COMPLETED && dismissedCompleted[o.id])).length,
    to_cook: staged.to_cook.length,
    preparing: staged.preparing.length,
    completed: staged.completed.filter((o) => !dismissedCompleted[o.id]).length,
  }), [dismissedCompleted, normalized, staged.completed, staged.preparing, staged.to_cook]);

  const toggleItem = (order, item) => {
    if (order.status !== KITCHEN_STATUS.TO_COOK) return;

    const remaining = Math.max(0, item.quantity - item.quantityPreparedBase);
    if (remaining === 0) return;

    setStagedPrepared((prev) => {
      const orderMap = prev[order.id] || {};
      const current = Number(orderMap[item.itemId] || 0);
      const nextValue = current > 0 ? 0 : remaining;

      return {
        ...prev,
        [order.id]: {
          ...orderMap,
          [item.itemId]: nextValue,
        },
      };
    });
  };

  const promoteToPreparing = async (order) => {
    if (!hasActiveSession) {
      toast.error('Enter an active session first');
      return;
    }

    if (!order.isAllPrepared) {
      toast.error('Mark all item quantities before moving to Preparing');
      return;
    }

    const stageMap = stagedPrepared[order.id] || {};
    setBusyOrderId(order.id);
    try {
      for (const item of order.items) {
        const stagedQuantity = Number(stageMap[item.itemId] || 0);
        for (let i = 0; i < stagedQuantity; i += 1) {
          await updateItemStatus(order.id, item.itemId);
        }
      }

      await updateOrderStatus(order.id, KITCHEN_STATUS.PREPARING);
      toast.success(`${order.ticketLabel} moved to Preparing`);
      await loadOrders({ silent: true });
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to move order to preparing');
    } finally {
      setBusyOrderId('');
    }
  };

  const moveToCompleted = async (order) => {
    if (!hasActiveSession) {
      toast.error('Enter an active session first');
      return;
    }

    setBusyOrderId(order.id);
    try {
      await updateOrderStatus(order.id, KITCHEN_STATUS.COMPLETED);
      toast.success(`${order.ticketLabel} marked Completed`);
      await loadOrders({ silent: true });
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to complete order');
    } finally {
      setBusyOrderId('');
    }
  };

  const serveCompleted = (order) => {
    setDismissedCompleted((prev) => ({ ...prev, [order.id]: true }));
    toast.success(`${order.ticketLabel} removed from board`);
  };

  const handleEnterSession = async () => {
    setSessionBusy(true);
    try {
      const current = await getActiveSession('kitchen');
      if (current?.status === 'active') {
        setActiveSession(current);
        toast.success('Active session found. Entered current session.');
        return;
      }

      const created = await openSession({ notes: 'Opened from kitchen dashboard' }, 'kitchen');
      setActiveSession(created);
      toast.success('New session created and entered.');
    } catch (error) {
      if (error?.response?.status === 409 && error?.response?.data?.session) {
        setActiveSession(error.response.data.session);
        toast.success('Active session already exists. Entered current session.');
        return;
      }
      toast.error(error?.response?.data?.error || 'Unable to enter session');
    } finally {
      setSessionBusy(false);
    }
  };

  const handleLogout = () => {
    clearAuth();
    navigate('/login', { replace: true });
  };

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 px-4">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm text-slate-600 shadow-sm">
          Loading kitchen tickets...
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Kitchen Display System</p>
            <h1 className="text-xl font-bold text-slate-900">Kitchen Board</h1>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search order # or product"
              className="w-64 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
            />

            <select
              value={perPage}
              onChange={(e) => setPerPage(Number(e.target.value))}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
            >
              <option value={1}>1 / page</option>
              <option value={2}>2 / page</option>
              <option value={3}>3 / page</option>
            </select>

            <button
              type="button"
              onClick={() => loadOrders({ silent: true })}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            <button
              type="button"
              onClick={handleEnterSession}
              disabled={sessionBusy}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sessionBusy ? 'Checking Session...' : hasActiveSession ? 'Enter Active Session' : 'Create / Enter Session'}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Logout
            </button>
          </div>

          <div className="w-full">
            <StatusTabs activeTab={activeTab} counts={counts} onChange={setActiveTab} />
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-6 lg:grid-cols-[280px_1fr]">
        <FilterSidebar
          products={productOptions}
          categories={categoryOptions}
          selectedProduct={selectedProduct}
          selectedCategory={selectedCategory}
          onProductChange={setSelectedProduct}
          onCategoryChange={setSelectedCategory}
          onReset={() => {
            setSelectedProduct('');
            setSelectedCategory('');
          }}
        />

        <section>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-600">
              Showing {paged.length} of {filtered.length} tickets • POS {user?.pos_id || user?.posId || '-'}
            </p>
            <p className="text-xs text-slate-500">Page {page} / {pageCount}</p>
          </div>

          {!hasActiveSession && (
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
              No active session selected. Click "Create / Enter Session" to join current session or open a new one.
            </div>
          )}

          {paged.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
              No kitchen tickets match your filters.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {paged.map((order) => (
                <TicketCard
                  key={order.id}
                  order={order}
                  stage={order.status}
                  stagedPreparedMap={stagedPrepared[order.id] || {}}
                  canPromoteToPreparing={order.isAllPrepared}
                  onToggleItem={toggleItem}
                  onPromote={promoteToPreparing}
                  onComplete={moveToCompleted}
                  onServe={serveCompleted}
                  busy={busyOrderId === order.id}
                  isUpdated={Boolean(updatedOrders[order.id])}
                />
              ))}
            </div>
          )}

          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Prev
            </button>
            <button
              type="button"
              disabled={page >= pageCount}
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
