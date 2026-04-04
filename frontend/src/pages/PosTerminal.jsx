import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import FloorView from './FloorView';
import OrderScreen from './OrderScreen';
import PaymentScreen from './PaymentScreen';
import { getCategories, getProducts } from '../services/productService';
import {
  addOrderItem,
  createOrder,
  getOrder,
  getSessionOrders,
  removeOrderItem,
  sendOrderToKitchen,
  updateOrderItem,
} from '../services/orderService';
import { processOrderPayment } from '../services/paymentService';
import { closeSession, getActiveSession } from '../services/sessionService';
import { getFloorsAndTables } from '../services/tableService';

function toMapByProduct(items = []) {
  return items.map((item) => ({ ...item }));
}

export default function PosTerminal() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [paying, setPaying] = useState(false);

  const [session, setSession] = useState(null);
  const [tab, setTab] = useState('table');
  const [screen, setScreen] = useState('floor');

  const [floors, setFloors] = useState([]);
  const [selectedFloorId, setSelectedFloorId] = useState('');
  const [selectedTable, setSelectedTable] = useState(null);

  const [activeOrder, setActiveOrder] = useState(null);
  const [cartItems, setCartItems] = useState([]);

  const [orders, setOrders] = useState([]);

  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState([]);

  const selectedFloor = useMemo(
    () => floors.find((f) => f.id === selectedFloorId) || floors[0] || null,
    [floors, selectedFloorId],
  );

  const selectedTableId = selectedTable?.id || null;

  const loadFloors = async () => {
    const data = await getFloorsAndTables();
    setFloors(data);
    if (!selectedFloorId && data[0]?.id) {
      setSelectedFloorId(data[0].id);
    }
  };

  const loadProducts = async (opts = {}) => {
    const list = await getProducts({
      categoryId: (opts.categoryId ?? selectedCategoryId) || undefined,
      q: (opts.search ?? search) || undefined,
    });
    setProducts(list);
  };

  const loadOrders = async (sessionId) => {
    const data = await getSessionOrders(sessionId);
    setOrders(data.orders || []);
  };

  const loadBootstrap = async () => {
    setLoading(true);
    try {
      const currentSession = await getActiveSession();
      if (!currentSession || currentSession.status !== 'active') {
        toast.error('No active session. Open session first.');
        navigate('/pos', { replace: true });
        return;
      }
      setSession(currentSession);

      const [categoryList] = await Promise.all([getCategories(), loadFloors()]);
      setCategories(categoryList);
      await Promise.all([loadProducts({ categoryId: '', search: '' }), loadOrders(currentSession.id)]);
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to load POS terminal');
      navigate('/pos', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBootstrap();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadProducts();
    }, 220);

    return () => clearTimeout(timer);
  }, [selectedCategoryId, search]);

  const reloadOrder = async (orderId) => {
    const order = await getOrder(orderId);
    setActiveOrder(order);
    setCartItems(toMapByProduct(order.items || []));
    return order;
  };

  const handleSelectTable = async (table) => {
    setBusy(true);
    try {
      setSelectedTable(table);

      if (table.active_order_id) {
        await reloadOrder(table.active_order_id);
      } else {
        try {
          const order = await createOrder({ tableId: table.id });
          await reloadOrder(order.id);
          await loadFloors();
        } catch (error) {
          if (error?.response?.status === 409) {
            await loadFloors();
            const floor = floors.find((f) => f.id === (selectedFloor?.id || selectedFloorId));
            const reloadedTable = floor?.tables?.find((t) => t.id === table.id);
            if (reloadedTable?.active_order_id) {
              await reloadOrder(reloadedTable.active_order_id);
            } else {
              throw error;
            }
          } else {
            throw error;
          }
        }
      }

      setTab('register');
      setScreen('order');
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to load table order');
    } finally {
      setBusy(false);
    }
  };

  const handleAddProduct = async (product) => {
    if (!activeOrder?.id) return;

    setBusy(true);
    try {
      await addOrderItem(activeOrder.id, { productId: product.id, quantity: 1 });
      await reloadOrder(activeOrder.id);
      await loadOrders(session?.id);
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to add item');
    } finally {
      setBusy(false);
    }
  };

  const handleIncreaseQty = async (item) => {
    if (!activeOrder?.id) return;
    setBusy(true);
    try {
      await updateOrderItem(activeOrder.id, item.id, { quantity: Number(item.quantity) + 1 });
      await reloadOrder(activeOrder.id);
      await loadOrders(session?.id);
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to update item');
    } finally {
      setBusy(false);
    }
  };

  const handleDecreaseQty = async (item) => {
    if (!activeOrder?.id) return;

    if (Number(item.quantity) <= 1) {
      await handleRemoveItem(item);
      return;
    }

    setBusy(true);
    try {
      await updateOrderItem(activeOrder.id, item.id, { quantity: Number(item.quantity) - 1 });
      await reloadOrder(activeOrder.id);
      await loadOrders(session?.id);
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to update item');
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveItem = async (item) => {
    if (!activeOrder?.id) return;
    setBusy(true);
    try {
      await removeOrderItem(activeOrder.id, item.id);
      await reloadOrder(activeOrder.id);
      await loadOrders(session?.id);
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to remove item');
    } finally {
      setBusy(false);
    }
  };

  const handleSendKitchen = async () => {
    if (!activeOrder?.id) return;
    setBusy(true);
    try {
      const updated = await sendOrderToKitchen(activeOrder.id);
      setActiveOrder((prev) => ({ ...prev, ...updated }));
      toast.success('Order sent to kitchen');
      await Promise.all([loadOrders(session?.id), loadFloors()]);
      setTab('orders');
      setScreen('floor');
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to send order to kitchen');
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmPayment = async (payload) => {
    if (!activeOrder?.id) return;
    setPaying(true);
    try {
      const result = await processOrderPayment(activeOrder.id, payload);
      setActiveOrder((prev) => ({ ...prev, ...(result.order || {}) }));
      toast.success('Payment completed');
      await Promise.all([loadOrders(session?.id), loadFloors()]);
      setScreen('floor');
      setTab('table');
      setSelectedTable(null);
      setActiveOrder(null);
      setCartItems([]);
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Payment failed');
    } finally {
      setPaying(false);
    }
  };

  const handleCloseSession = async () => {
    setBusy(true);
    try {
      await closeSession();
      toast.success('Session closed');
      navigate('/pos', { replace: true });
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Unable to close session');
    } finally {
      setBusy(false);
    }
  };

  const onLogout = () => {
    clearAuth();
    navigate('/login', { replace: true });
  };

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm text-slate-600 shadow-sm">Loading POS terminal...</div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Staff POS</p>
            <h1 className="text-xl font-bold text-slate-900">Terminal</h1>
          </div>

          <nav className="flex flex-wrap gap-2">
            <button type="button" onClick={() => { setTab('table'); setScreen('floor'); }} className={`rounded-xl border px-4 py-2 text-sm font-semibold ${tab === 'table' ? 'border-sky-300 bg-sky-50 text-sky-700' : 'border-slate-200 text-slate-700 hover:bg-slate-100'}`}>Table</button>
            <button type="button" onClick={() => { setTab('register'); if (activeOrder) setScreen('order'); }} disabled={!activeOrder} className={`rounded-xl border px-4 py-2 text-sm font-semibold ${tab === 'register' ? 'border-sky-300 bg-sky-50 text-sky-700' : 'border-slate-200 text-slate-700 hover:bg-slate-100'} disabled:opacity-50`}>Register</button>
            <button type="button" onClick={() => { setTab('orders'); setScreen('floor'); loadOrders(session?.id); }} className={`rounded-xl border px-4 py-2 text-sm font-semibold ${tab === 'orders' ? 'border-sky-300 bg-sky-50 text-sky-700' : 'border-slate-200 text-slate-700 hover:bg-slate-100'}`}>Orders</button>
          </nav>

          <div className="flex gap-2">
            <button type="button" onClick={handleCloseSession} disabled={busy} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60">Close Session</button>
            <button type="button" onClick={onLogout} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">Logout</button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-6">
        {tab === 'table' && (
          <FloorView
            floors={floors}
            selectedFloorId={selectedFloor?.id || selectedFloorId}
            onSelectFloor={setSelectedFloorId}
            selectedTableId={selectedTableId}
            onSelectTable={handleSelectTable}
          />
        )}

        {tab === 'register' && activeOrder && screen === 'order' && (
          <OrderScreen
            order={activeOrder}
            items={cartItems}
            categories={categories}
            products={products}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={setSelectedCategoryId}
            search={search}
            onSearch={setSearch}
            onAddItem={handleAddProduct}
            onIncreaseQty={handleIncreaseQty}
            onDecreaseQty={handleDecreaseQty}
            onRemoveItem={handleRemoveItem}
            onSendKitchen={handleSendKitchen}
            onPayment={() => setScreen('payment')}
            busy={busy}
          />
        )}

        {tab === 'register' && activeOrder && screen === 'payment' && (
          <PaymentScreen order={activeOrder} processing={paying} onConfirm={handleConfirmPayment} onBack={() => setScreen('order')} />
        )}

        {tab === 'orders' && (
          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="text-xl font-bold text-slate-900">Orders</h2>
            <div className="mt-4 space-y-3">
              {orders.length === 0 ? (
                <p className="text-sm text-slate-500">No orders for current session.</p>
              ) : (
                orders.map((order) => (
                  <button
                    key={order.id}
                    type="button"
                    onClick={async () => {
                      await reloadOrder(order.id);
                      setSelectedTable({ id: order.table_id });
                      setTab('register');
                      setScreen('order');
                    }}
                    className="w-full rounded-xl border border-slate-200 p-3 text-left hover:bg-slate-50"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900">Table #{order.table_number}</p>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{order.status}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">Payment: {order.payment_status}</p>
                    <p className="mt-1 text-xs text-slate-600">Items: {(order.items || []).map((i) => `${i.name} x${i.quantity}`).join(', ') || 'No items'}</p>
                  </button>
                ))
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
