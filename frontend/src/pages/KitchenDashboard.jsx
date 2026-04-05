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

  /* ---------- DARK THEMED BUTTON CLASSES ---------- */
  const btnDark = "h-9 rounded-linen border border-[#2A2A2A] bg-[#1A1A1A] px-3 text-[13px] font-medium text-[#E5E5E5] transition-colors hover:bg-[#222222] disabled:cursor-not-allowed disabled:opacity-50";

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#0D0D0D]">
        <div className="rounded-linen border border-[#2A2A2A] bg-[#1A1A1A] px-6 py-4 text-sm text-[#888888]">
          Loading kitchen tickets...
        </div>
      </main>
    );
  }

  return (
    <div className="kitchen-dark min-h-screen bg-[#0D0D0D] animate-fade-in">
      <header className="sticky top-0 z-20 border-b border-[#2A2A2A] bg-[#111111]">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-linen-sm bg-white/10 font-mono text-[11px] font-semibold text-white">
              KDS
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-[#555555]">Kitchen Display</p>
              <h1 className="text-[15px] font-semibold text-[#F5F5F5]">Kitchen Board</h1>
            </div>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#555555]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search order or product"
                className="h-9 w-56 rounded-linen border border-[#2A2A2A] bg-[#1A1A1A] pl-9 pr-3 text-[13px] text-[#E5E5E5] outline-none transition-colors placeholder:text-[#555555] focus:border-[#3A3A3A]"
              />
            </div>

            <select
              value={perPage}
              onChange={(e) => setPerPage(Number(e.target.value))}
              className="h-9 rounded-linen border border-[#2A2A2A] bg-[#1A1A1A] px-3 text-[13px] text-[#E5E5E5] outline-none"
            >
              <option value={1}>1 / page</option>
              <option value={2}>2 / page</option>
              <option value={3}>3 / page</option>
            </select>

            <button type="button" onClick={() => loadOrders({ silent: true })} className={btnDark}>
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            <button type="button" onClick={handleEnterSession} disabled={sessionBusy} className={btnDark}>
              {sessionBusy ? 'Checking...' : hasActiveSession ? 'Session Active' : 'Enter Session'}
            </button>
            <button type="button" onClick={handleLogout} className={btnDark}>
              Logout
            </button>
          </div>

          <div className="w-full pt-2">
            <StatusTabs activeTab={activeTab} counts={counts} onChange={setActiveTab} />
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-6 lg:grid-cols-[240px_1fr]">
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
            <p className="text-[13px] font-medium text-[#888888]">
              {paged.length} of {filtered.length} tickets
            </p>
            <p className="font-mono text-xs text-[#555555]">Page {page} / {pageCount}</p>
          </div>

          {!hasActiveSession && (
            <div className="mb-4 rounded-linen border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-4 py-3 text-[13px] font-medium text-[#F59E0B]">
              No active session. Click "Enter Session" to join or create one.
            </div>
          )}

          {paged.length === 0 ? (
            <div className="flex flex-col items-center rounded-linen-lg border border-dashed border-[#2A2A2A] bg-[#1A1A1A] px-6 py-16 text-center">
              <svg className="h-12 w-12 text-[#2A2A2A]" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              <p className="mt-3 text-sm text-[#888888]">No kitchen tickets match your filters</p>
              <p className="mt-1 text-[13px] text-[#555555]">Tickets will appear here when orders are sent from POS</p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
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
              className={btnDark}
            >
              Prev
            </button>
            <button
              type="button"
              disabled={page >= pageCount}
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              className={btnDark}
            >
              Next
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
