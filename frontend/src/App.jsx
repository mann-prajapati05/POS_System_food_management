import { Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import PosHome from "./pages/PosHome";
import PosTerminal from "./pages/PosTerminal";
import AdminLogin from "./pages/AdminLogin";
import AdminSignup from "./pages/AdminSignup";
import AdminHome from "./pages/AdminHome";
import AdminAnalytics from "./pages/AdminAnalytics";
import AdminRealtimeOrders from "./pages/AdminRealtimeOrders";
import AdminPos from "./pages/AdminPos";
import AdminFloorsTables from "./pages/AdminFloorsTables";
import Categories from "./pages/admin/Categories";
import Products from "./pages/admin/Products";
import KitchenDashboard from "./pages/KitchenDashboard";
import useAuthStore from "./store/authStore";

function defaultRouteForRole(role) {
  if (role === "admin") return "/dashboard";
  if (role === "kitchen") return "/kitchen";
  return "/pos";
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

export default function App() {
  return (
    <>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <PublicRoute>
              <Signup />
            </PublicRoute>
          }
        />

        <Route
          path="/admin/login"
          element={
            <PublicRoute>
              <AdminLogin />
            </PublicRoute>
          }
        />

        <Route
          path="/admin/signup"
          element={
            <PublicRoute>
              <AdminSignup />
            </PublicRoute>
          }
        />

        <Route
          path="/pos"
          element={
            <ProtectedRoute allowedRoles={["staff", "admin"]}>
              <PosHome />
            </ProtectedRoute>
          }
        />

        <Route
          path="/pos/terminal"
          element={
            <ProtectedRoute allowedRoles={["staff", "admin"]}>
              <PosTerminal />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminHome />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/analytics"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminAnalytics />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/realtime-orders"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminRealtimeOrders />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/pos"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminPos />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/floors-tables"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminFloorsTables />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/categories"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <Categories />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/products"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <Products />
            </ProtectedRoute>
          }
        />

        <Route
          path="/kitchen"
          element={
            <ProtectedRoute allowedRoles={["kitchen", "admin"]}>
              <KitchenDashboard />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>

      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            borderRadius: "10px",
            border: "1px solid #E4E2DC",
            background: "#ffffff",
            color: "#1A1A1A",
            fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
            fontSize: "13px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
          },
        }}
      />
    </>
  );
}
