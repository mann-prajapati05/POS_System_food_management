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
import {
  createRazorpayOrder,
  ensureRazorpayLoaded,
  processOrderPayment,
  verifyRazorpayPayment,
} from '../services/paymentService';
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
        setActiveOrder({
          id: null,
          table_id: table.id,
          table_number: table.table_number,
          status: 'draft',
          total_price: 0,
          items: [],
        });
        setCartItems([]);
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
    if (!activeOrder) return;

    setBusy(true);
    try {
      let orderId = activeOrder.id;

      if (!orderId) {
        const created = await createOrder({ tableId: activeOrder.table_id });
        orderId = created.id;
      }

      await addOrderItem(orderId, { productId: product.id, quantity: 1 });
      await reloadOrder(orderId);
      await loadFloors();
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
      let result;

      if (payload.method === 'cash') {
        result = await processOrderPayment(activeOrder.id, {
          method: 'cash',
          amount: Number(activeOrder.total_price || 0),
        });
      } else {
        await ensureRazorpayLoaded();

        const razorOrder = await createRazorpayOrder({
          order_id: activeOrder.id,
          amount: Number(payload.amount || 0),
          payment_type: payload.method,
        });

        const checkoutResponse = await new Promise((resolve, reject) => {
          const key = razorOrder.key_id || import.meta.env.VITE_RAZORPAY_KEY_ID;
          if (!key) {
            reject(new Error('Razorpay key is missing'));
            return;
          }

          const options = {
            key,
            amount: razorOrder.amount,
            currency: razorOrder.currency || 'INR',
            name: 'Odoo POS',
            description: `Order ${String(activeOrder.id || '').slice(0, 8)}`,
            order_id: razorOrder.razorpay_order_id,
            method: payload.method === 'upi'
              ? {
                upi: true,
                card: false,
                netbanking: false,
                wallet: false,
                paylater: false,
                emi: false,
              }
              : {
                upi: false,
                card: true,
                netbanking: true,
                wallet: true,
                paylater: false,
                emi: false,
              },
            prefill: {
              name: user?.name || undefined,
              email: user?.email || undefined,
            },
            modal: {
              ondismiss: () => reject(new Error('Payment cancelled by user')),
            },
            handler: (response) => resolve(response),
          };

          const checkout = new window.Razorpay(options);
          checkout.on('payment.failed', (response) => {
            reject(new Error(response?.error?.description || 'Razorpay payment failed'));
          });
          checkout.open();
        });

        result = await verifyRazorpayPayment({
          razorpay_order_id: checkoutResponse.razorpay_order_id,
          razorpay_payment_id: checkoutResponse.razorpay_payment_id,
          razorpay_signature: checkoutResponse.razorpay_signature,
        });
      }

      setActiveOrder((prev) => ({ ...prev, ...(result.order || {}) }));
      toast.success('Payment completed');
      await Promise.all([loadOrders(session?.id), loadFloors()]);
      setScreen('floor');
      setTab('table');
      setSelectedTable(null);
      setActiveOrder(null);
      setCartItems([]);
    } catch (error) {
      toast.error(error?.response?.data?.error || error?.message || 'Payment failed. Please retry.');
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

  const tabBase = "h-8 rounded-linen-pill border px-4 text-[13px] font-medium transition-all duration-150";
  const tabActive = "border-linen-primary bg-linen-primary text-white";
  const tabInactive = "border-linen-border bg-white text-linen-text-secondary hover:border-linen-border-strong hover:bg-linen-surface-2";

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-linen-bg">
        <div className="rounded-linen-lg border border-linen-border bg-white px-6 py-4 text-sm text-linen-text-secondary">
          Loading POS terminal...
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-linen-bg animate-fade-in">
      <header className="sticky top-0 z-20 h-14 border-b border-linen-border bg-white">
        <div className="mx-auto flex h-full w-full max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-linen-sm bg-linen-primary font-mono text-[11px] font-semibold text-white">
              POS
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.07em] text-linen-text-muted">Staff POS</p>
              <h1 className="text-[15px] font-semibold text-linen-text-primary">Terminal</h1>
            </div>
          </div>

          <nav className="flex flex-wrap gap-1.5">
            <button type="button" onClick={() => { setTab('table'); setScreen('floor'); }} className={`${tabBase} ${tab === 'table' ? tabActive : tabInactive}`}>Table</button>
            <button type="button" onClick={() => { setTab('register'); if (activeOrder) setScreen('order'); }} disabled={!activeOrder} className={`${tabBase} ${tab === 'register' ? tabActive : tabInactive} disabled:opacity-50`}>Register</button>
            <button type="button" onClick={() => { setTab('orders'); setScreen('floor'); loadOrders(session?.id); }} className={`${tabBase} ${tab === 'orders' ? tabActive : tabInactive}`}>Orders</button>
          </nav>

          <div className="flex gap-2">
            <button type="button" onClick={handleCloseSession} disabled={busy} className="h-9 rounded-linen border border-linen-border px-3 text-[13px] font-medium text-linen-text-primary transition-colors hover:bg-linen-surface-2 disabled:opacity-60">Close Session</button>
            <button type="button" onClick={onLogout} className="h-9 rounded-linen border border-linen-border px-3 text-[13px] font-medium text-linen-text-primary transition-colors hover:bg-linen-surface-2">Logout</button>
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
          <section className="rounded-linen-lg border border-linen-border bg-white p-4">
            <h2 className="text-base font-semibold text-linen-text-primary">Orders</h2>
            <div className="mt-4 space-y-2">
              {orders.length === 0 ? (
                <div className="flex flex-col items-center py-10 text-center">
                  <svg className="h-12 w-12 text-linen-border" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  <p className="mt-3 text-sm text-linen-text-secondary">No orders for current session</p>
                </div>
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
                    className="w-full rounded-linen-lg border border-linen-border p-3 text-left transition-colors hover:bg-linen-bg"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[13px] font-medium text-linen-text-primary">Table #{order.table_number}</p>
                      <span className={`rounded-linen-pill px-2 py-0.5 text-[11px] font-semibold uppercase ${
                        order.status === 'completed' ? 'bg-[#DCFCE7] text-linen-success' :
                        order.status === 'preparing' || order.status === 'to_cook' ? 'bg-[#FEF3C7] text-linen-amber' :
                        'bg-linen-surface-2 text-linen-text-secondary'
                      }`}>{order.status}</span>
                    </div>
                    <p className="mt-1 text-xs text-linen-text-muted">Payment: {order.payment_status}</p>
                    <p className="mt-1 text-xs text-linen-text-secondary">{(order.items || []).map((i) => `${i.name} ×${i.quantity}`).join(', ') || 'No items'}</p>
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
