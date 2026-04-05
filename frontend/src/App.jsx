import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Login from './pages/Login';
import Signup from './pages/Signup';
import PosHome from './pages/PosHome';
import PosTerminal from './pages/PosTerminal';
import AdminLogin from './pages/AdminLogin';
import AdminSignup from './pages/AdminSignup';
import AdminHome from './pages/AdminHome';
import AdminAnalytics from './pages/AdminAnalytics';
import AdminRealtimeOrders from './pages/AdminRealtimeOrders';
import AdminPos from './pages/AdminPos';
import AdminFloorsTables from './pages/AdminFloorsTables';
import Categories from './pages/admin/Categories';
import Products from './pages/admin/Products';
import useAuthStore from './store/authStore';

function defaultRouteForRole(role) {
  if (role === 'admin') return '/dashboard';
  if (role === 'kitchen') return '/kitchen';
  return '/pos';
}

function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles?.length && !allowedRoles.includes(user?.role)) {
    return <Navigate to={defaultRouteForRole(user?.role)} replace />;
  }

  return children;
}

function PublicRoute({ children }) {
  const { isAuthenticated, user } = useAuthStore();

  if (isAuthenticated) {
    return <Navigate to={defaultRouteForRole(user?.role)} replace />;
  }

  return children;
}

function KitchenPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <section className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Kitchen Dashboard</h1>
        <p className="mt-2 text-slate-600">
          Signed in as {user?.name || 'Kitchen User'}. Kitchen board and live tickets can be added here.
        </p>
        <button
          type="button"
          onClick={() => {
            clearAuth();
            navigate('/login', { replace: true });
          }}
          className="mt-6 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-100"
        >
          Logout
        </button>
      </section>
    </main>
  );
}

export default function App() {
  return (
    <>
      <Routes>
        <Route
          path="/login"
          element={(
            <PublicRoute>
              <Login />
            </PublicRoute>
          )}
        />
        <Route
          path="/signup"
          element={(
            <PublicRoute>
              <Signup />
            </PublicRoute>
          )}
        />

        <Route
          path="/admin/login"
          element={(
            <PublicRoute>
              <AdminLogin />
            </PublicRoute>
          )}
        />

        <Route
          path="/admin/signup"
          element={(
            <PublicRoute>
              <AdminSignup />
            </PublicRoute>
          )}
        />

        <Route
          path="/pos"
          element={(
            <ProtectedRoute allowedRoles={['staff', 'admin']}>
              <PosHome />
            </ProtectedRoute>
          )}
        />

        <Route
          path="/pos/terminal"
          element={(
            <ProtectedRoute allowedRoles={['staff', 'admin']}>
              <PosTerminal />
            </ProtectedRoute>
          )}
        />

        <Route
          path="/dashboard"
          element={(
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminHome />
            </ProtectedRoute>
          )}
        />

        <Route
          path="/admin/analytics"
          element={(
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminAnalytics />
            </ProtectedRoute>
          )}
        />

        <Route
          path="/admin/realtime-orders"
          element={(
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminRealtimeOrders />
            </ProtectedRoute>
          )}
        />

        <Route
          path="/admin/pos"
          element={(
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminPos />
            </ProtectedRoute>
          )}
        />

        <Route
          path="/admin/floors-tables"
          element={(
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminFloorsTables />
            </ProtectedRoute>
          )}
        />

        <Route
          path="/admin/categories"
          element={(
            <ProtectedRoute allowedRoles={['admin']}>
              <Categories />
            </ProtectedRoute>
          )}
        />

        <Route
          path="/admin/products"
          element={(
            <ProtectedRoute allowedRoles={['admin']}>
              <Products />
            </ProtectedRoute>
          )}
        />

        <Route
          path="/kitchen"
          element={(
            <ProtectedRoute allowedRoles={['kitchen']}>
              <KitchenPage />
            </ProtectedRoute>
          )}
        />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>

      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            background: '#ffffff',
            color: '#0f172a',
          },
        }}
      />
    </>
  );
}
