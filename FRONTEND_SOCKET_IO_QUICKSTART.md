## Frontend Socket.IO Quick Start

### 1. Install Socket.IO Client

```bash
npm install socket.io-client
```

### 2. After Login - Connect & Authenticate

```javascript
import { initStaffDashboard } from "@/services/socketIOClient";

// After successful login
const { userId, sessionId } = loginResponse;
const userRole = "staff"; // or 'kitchen'

initStaffDashboard(userId, sessionId);
// OR for kitchen
initKitchenDisplay(userId, sessionId);
```

### 3. Staff Dashboard - Listen for Orders

```javascript
import socket from "@/services/socketIOClient";

export default function StaffDashboard() {
  const [orders, setOrders] = useState([]);
  const [tables, setTables] = useState([]);

  useEffect(() => {
    // New order created
    socket.on("order_created", (data) => {
      console.log("📝 New order:", data);
      setOrders((prev) => [...prev, data]);
    });

    // Order status updated
    socket.on("order_status_updated", (data) => {
      console.log("🔄 Order updated:", data);
      setOrders((prev) =>
        prev.map((o) =>
          o.orderId === data.orderId ? { ...o, status: data.status } : o,
        ),
      );
    });

    // Table status changed
    socket.on("table_status_changed", (data) => {
      console.log("📍 Table status:", data);
      setTables((prev) =>
        prev.map((t) =>
          t.tableId === data.tableId ? { ...t, status: data.status } : t,
        ),
      );
    });

    // Payment completed
    socket.on("payment_completed", (data) => {
      console.log("💳 Payment:", data);
      // Remove from active orders
      // Update revenue total
    });

    return () => {
      socket.off("order_created");
      socket.off("order_status_updated");
      socket.off("table_status_changed");
      socket.off("payment_completed");
    };
  }, []);

  return (
    <div>
      {/* Display tables with real-time status */}
      {tables.map((table) => (
        <TableCard
          key={table.id}
          table={table}
          status={table.status} // Updates automatically
        />
      ))}

      {/* Display active orders */}
      {orders.map((order) => (
        <OrderCard
          key={order.orderId}
          order={order}
          status={order.status} // Updates automatically
        />
      ))}
    </div>
  );
}
```

### 4. Kitchen Display - Monitor Orders

```javascript
import socket from "@/services/socketIOClient";

export default function KitchenDisplay() {
  const [ordersTooCook, setOrdersTooCook] = useState([]);
  const [ordersPreparing, setOrdersPreparing] = useState([]);
  const [ordersCompleted, setOrdersCompleted] = useState([]);

  useEffect(() => {
    // New order arrives in kitchen
    socket.on("order_sent_to_kitchen", (data) => {
      console.log("🆕 New order in kitchen:", data);
      setOrdersTooCook((prev) => [
        ...prev,
        {
          orderId: data.orderId,
          items: data.items,
          timestamp: data.timestamp,
        },
      ]);
      playNotificationSound(); // Alert kitchen
    });

    // Order status updated
    socket.on("order_status_updated", (data) => {
      console.log("🔄 Kitchen order updated:", data);
      if (data.status === "preparing") {
        moveOrder(data.orderId, "to_cook", "preparing");
      } else if (data.status === "completed") {
        moveOrder(data.orderId, "preparing", "completed");
      }
    });

    return () => {
      socket.off("order_sent_to_kitchen");
      socket.off("order_status_updated");
    };
  }, []);

  const moveOrder = (orderId, fromState, toState) => {
    if (fromState === "to_cook") {
      setOrdersTooCook((prev) => prev.filter((o) => o.orderId !== orderId));
      setOrdersPreparing((prev) => [...prev, findOrder(orderId)]);
    }
    if (fromState === "preparing") {
      setOrdersPreparing((prev) => prev.filter((o) => o.orderId !== orderId));
      setOrdersCompleted((prev) => [...prev, findOrder(orderId)]);
    }
  };

  return (
    <div className="kitchen-display">
      <div className="column">
        <h2>To Cook ({ordersTooCook.length})</h2>
        {ordersTooCook.map((order) => (
          <OrderCard
            key={order.orderId}
            order={order}
            onMarkPreparing={() => {
              socket.emit("kitchen_update", {
                orderId: order.orderId,
                status: "preparing",
              });
            }}
          />
        ))}
      </div>

      <div className="column">
        <h2>Preparing ({ordersPreparing.length})</h2>
        {ordersPreparing.map((order) => (
          <OrderCard
            key={order.orderId}
            order={order}
            onMarkComplete={() => {
              socket.emit("kitchen_update", {
                orderId: order.orderId,
                status: "completed",
              });
            }}
          />
        ))}
      </div>

      <div className="column">
        <h2>Ready ({ordersCompleted.length})</h2>
        {ordersCompleted.map((order) => (
          <OrderCard key={order.orderId} order={order} />
        ))}
      </div>
    </div>
  );
}
```

### 5. Connection Status Indicator

```javascript
import socket from "@/services/socketIOClient";
import { useState, useEffect } from "react";

export function ConnectionStatus() {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    socket.on("connect", () => {
      console.log("✅ Connected to server");
      setIsConnected(true);
    });

    socket.on("disconnect", () => {
      console.log("❌ Disconnected from server");
      setIsConnected(false);
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
    };
  }, []);

  return (
    <div className="connection-status">
      <span className={isConnected ? "green" : "red"}>
        {isConnected ? "🟢 Connected" : "🔴 Offline"}
      </span>
    </div>
  );
}
```

### 6. Error Handling & Reconnection

```javascript
import socket from "@/services/socketIOClient";

socket.on("error", (error) => {
  console.error("Socket error:", error);
  // Show error toast to user
  Toast.error("Connection lost. Reconnecting...");
});

socket.on("connect_error", (error) => {
  console.error("Connection error:", error);
  if (error.data?.content) {
    Toast.error(error.data.content);
  }
});

// Socket.IO automatically reconnects with backoff
// No manual reconnection needed
```

### 7. Cleanup on Logout

```javascript
import socket from "@/services/socketIOClient";
import { disconnectSocket } from "@/services/socketIOClient";

export function handleLogout() {
  // Stop listening to events
  socket.off();

  // Disconnect socket
  disconnectSocket();

  // Redirect to login
  navigate("/login");
}
```

### Complete Example: Staff Dashboard Component

```javascript
import React, { useEffect, useState } from "react";
import socket, { initStaffDashboard } from "@/services/socketIOClient";

export default function StaffDashboard() {
  const [activeOrders, setActiveOrders] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    // Get user info from localStorage or auth context
    const user = JSON.parse(localStorage.getItem("user"));
    setUserInfo(user);

    // Initialize Socket.IO connection
    initStaffDashboard(user.id, user.sessionId);

    // Connection events
    socket.on("connect", () => {
      setIsConnected(true);
      console.log("✅ Connected to server");
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
      console.log("❌ Disconnected");
    });

    // Order events
    socket.on("order_created", (data) => {
      setActiveOrders((prev) => [
        {
          id: data.orderId,
          tableId: data.tableId,
          status: "draft",
          total: data.total,
          createdAt: data.createdAt,
        },
        ...prev,
      ]);
    });

    socket.on("order_status_updated", (data) => {
      setActiveOrders((prev) =>
        prev.map((o) =>
          o.id === data.orderId ? { ...o, status: data.status } : o,
        ),
      );
    });

    socket.on("payment_completed", (data) => {
      setActiveOrders((prev) => prev.filter((o) => o.id !== data.orderId));
    });

    return () => {
      socket.off();
    };
  }, []);

  return (
    <div className="staff-dashboard">
      <header>
        <h1>Staff Dashboard</h1>
        <div
          className={`connection ${isConnected ? "connected" : "disconnected"}`}
        >
          {isConnected ? "🟢 Online" : "🔴 Offline"}
        </div>
      </header>

      <div className="active-orders">
        <h2>Active Orders ({activeOrders.length})</h2>
        {activeOrders.map((order) => (
          <div key={order.id} className="order-card">
            <p>Table {order.tableId}</p>
            <p>Status: {order.status}</p>
            <p>Total: ${order.total}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Testing in Browser Console

```javascript
// Check if connected
console.log(socket.connected);

// Check rooms
console.log(socket.rooms);

// Listen to a specific event
socket.on("order_created", (data) => console.log("Order:", data));

// Test emitting event
socket.emit("user_authenticated", {
  userId: "test-user",
  role: "staff",
  sessionId: "test-session",
});
```

### Common Issues

| Issue                               | Solution                                                 |
| ----------------------------------- | -------------------------------------------------------- |
| Events not received                 | Check: `socket.connected` is true, room matches          |
| Connection failed                   | Check: CORS settings on backend, frontend URL in backend |
| Orders not updating                 | Check: Are you calling `initStaffDashboard()`?           |
| Console warnings about memory leaks | Always call `socket.off()` in useEffect cleanup          |

---

**Ready to build your real-time POS dashboard! 🚀**
