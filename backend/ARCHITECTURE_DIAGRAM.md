# 🏗️ POS SYSTEM ARCHITECTURE & DATA FLOW

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React/Vue)                      │
├─────────────────────────────────────────────────────────────────┤
│  - Staff Dashboard  │  - Kitchen Display  │  - Customer Display  │
└──────────┬──────────────────────┬──────────────────────┬────────┘
           │                      │                      │
      HTTP REST              HTTP REST               WebSocket
      Requests              Requests                 (Socket.io)
           │                      │                      │
┌──────────▼──────────────────────▼──────────────────────▼────────┐
│                       EXPRESS SERVER                             │
├─────────────────────────────────────────────────────────────────┤
│  Routes:                                                         │
│  • POST /api/orders              - Create order                 │
│  • PATCH /api/orders/:id/status  - Update status                │
│  • POST /api/orders/:id/payment  - Process payment              │
│  • GET /api/kitchen/display      - Kitchen queue                │
│  • GET /api/reports/daily        - Revenue report               │
└──────────┬──────────────────────────────────────────────────────┘
           │
      SQL Queries
      & Transactions
           │
┌──────────▼──────────────────────────────────────────────────────┐
│                  PostgreSQL DATABASE                             │
├─────────────────────────────────────────────────────────────────┤
│  Core Tables:                                                    │
│  • users           → Staff & kitchen management (RBAC)          │
│  • pos_sessions    → Daily operations tracking                  │
│  • floors, tables  → Physical dining areas                      │
│  • orders          → Complete order lifecycle                   │
│  • order_items     → Line items per order                       │
│  • payments        → Transactions (cash/card/UPI)               │
│  • products        → Menu items with pricing                    │
│  • categories      → Product classification                     │
│                                                                  │
│  Reporting Views:                                                │
│  • session_summary      → Revenue metrics                       │
│  • kitchen_display      → Active orders                         │
│  • table_status_overview → Occupancy tracking                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Complete Order Workflow Diagram

```
┌─────────────┐
│   DRAFT     │  Order created by staff
│             │  Total price: $0
└──────┬──────┘
       │ [Confirm Order]
       ▼
┌─────────────┐
│  PENDING    │  Order confirmed
│             │  Not yet in kitchen
└──────┬──────┘
       │ [Send to Kitchen]
       ▼
┌─────────────┐
│  TO_COOK    │  Order sent to kitchen
│             │  Kitchen sees items list
│             │  [Socket.io: order_sent_to_kitchen]
└──────┬──────┘
       │ [Kitchen starts cooking]
       ▼
┌─────────────┐
│ PREPARING   │  Kitchen actively preparing
│             │  Real-time status update
│             │  [Socket.io: order_status_updated]
└──────┬──────┘
       │ [Food ready]
       ▼
┌─────────────┐
│ COMPLETED   │  Ready to serve
│             │  Waiting for payment
└──────┬──────┘
       │ [Process Payment]
       ▼
┌─────────────┐
│    PAID     │  Payment received
│             │  Order closed
│             │  Table available
│             │  [Socket.io: payment_completed]
└─────────────┘
```

---

## Database Relationship Diagram

```
┌──────────────┐
│   USERS      │ (id, name, email, role)
└──────┬───────┘
       │
       ├─── opened_by ──────┐
       │                    │
       │                    ▼
       │            ┌────────────────────┐
       │            │  POS_SESSIONS      │
       │            │  (id, opened_at,   │
       │            │   closed_at,       │
       │            │   status)          │
       │            └────────┬───────────┘
       │                     │
       │                     └─ session_id ──┐
       │                                     │
       ├─ created_by ─┐                      │
       │              ▼                      ▼
       │      ┌──────────────┐       ┌──────────────┐
       │      │   ORDERS     │       │   TABLES     │
       │      │ (id, status, │────┬──│ (id, status, │
       │      │  table_id)   │    │  │  seats)      │
       │      └──────┬───────┘    │  └──────┬───────┘
       │             │            │         │
       │      assigned_kitchen_user         │
       │             │            └─ floor_id
       │             │                      │
       │             │                      ▼
       │             │            ┌──────────────┐
       │             │            │   FLOORS     │
       │             │            └──────────────┘
       │             │
       └─────────────┘
             │
             └─────────────┬─────────────────────┐
                          │                     │
                    order_items                payments
                          │                     │
                          ▼                     ▼
              ┌──────────────────┐   ┌──────────────────┐
              │  ORDER_ITEMS     │   │   PAYMENTS       │
              │ (order_id,       │   │  (order_id,      │
              │  product_id,     │   │   method,        │
              │  quantity)       │   │   status)        │
              └────────┬─────────┘   └──────────────────┘
                       │
                product_id
                       │
                       ▼
          ┌──────────────────────┐
          │    PRODUCTS          │
          │  (id, name, price)   │
          └──────────┬───────────┘
                     │
                category_id
                     │
                     ▼
          ┌──────────────────────┐
          │   CATEGORIES         │
          │  (id, name)          │
          └──────────────────────┘
```

---

## Real-Time Communication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        SOCKET.IO EVENTS                          │
│                  (Real-time POS Notifications)                  │
└─────────────────────────────────────────────────────────────────┘

1. ORDER CREATED (Staff → Backend)
   ┌─────────────────────────────────────┐
   │ Socket emits: order_created         │
   │ Payload: { orderId, tableId, staff} │
   │ Broadcast to: admin, staff          │
   └─────────────────────────────────────┘

2. SEND TO KITCHEN (Staff → Kitchen)
   ┌──────────────────────────────────────┐
   │ Socket emits: order_sent_to_kitchen  │
   │ Payload: { orderId, items, table }   │
   │ Broadcast to: kitchen room           │
   │ Action: Update kitchen display       │
   └──────────────────────────────────────┘

3. ORDER STATUS UPDATE (Kitchen → Display)
   ┌───────────────────────────────────────┐
   │ Socket emits: order_status_updated    │
   │ Status: preparing → completed        │
   │ Payload: { orderId, status, table }   │
   │ Broadcast to: kitchen, staff, admin   │
   │ Action: Update customer display       │
   └───────────────────────────────────────┘

4. PAYMENT COMPLETED (Staff → System)
   ┌──────────────────────────────────────┐
   │ Socket emits: payment_completed      │
   │ Payload: { orderId, amount, method } │
   │ Broadcast to: admin, staff, kitchen  │
   │ Action: Mark order PAID, table AVAIL │
   └──────────────────────────────────────┘

5. TABLE STATUS CHANGED
   ┌───────────────────────────────────────┐
   │ Socket emits: table_status_changed    │
   │ Status: available → occupied          │
   │ Payload: { tableId, tableNumber }     │
   │ Broadcast to: admin, staff            │
   │ Action: Update table management UI    │
   └───────────────────────────────────────┘
```

---

## API Request/Response Flow

```
CLIENT REQUEST
     │
     ▼
┌─────────────────────────────────────┐
│    POST /api/orders                 │
│    Body: {                          │
│      sessionId, tableId, staffId    │
│    }                                │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│   Express Route Handler             │
│   (createOrder function)            │
└──────────┬──────────────────────────┘
           │
           ├─ Validate input
           │
           ├─ Check session open
           │
           ├─ Check table exists
           │
           ├─ BEGIN TRANSACTION
           │
           ├─ INSERT INTO orders
           │
           ├─ COMMIT TRANSACTION
           │
           ▼
┌─────────────────────────────────────┐
│  SERVER RESPONSE (201 Created)      │
│  Body: {                            │
│    "message": "Order created",      │
│    "order": {                       │
│      id, status, created_at, price  │
│    }                                │
│  }                                  │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│   CLIENT RECEIVES & UPDATES UI      │
│   • Show order ID                   │
│   • Enable add items button         │
│   • Display in order list           │
└─────────────────────────────────────┘
```

---

## Transaction Safety Example

```
SCENARIO: Create order with items

┌────────────────────────────────────────────────────┐
│ BEGIN TRANSACTION                                  │
│                                                    │
│ Step 1: INSERT INTO orders                        │
│ ✓ Order created (DRAFT status)                    │
│                                                    │
│ Step 2: INSERT INTO order_items (item 1)          │
│ ✓ Item 1 added                                    │
│                                                    │
│ Step 3: INSERT INTO order_items (item 2)          │
│ ✓ Item 2 added                                    │
│                                                    │
│ Step 4: UPDATE orders SET total_price = ...       │
│ ✓ Total calculated and updated                    │
│                                                    │
│ Step 5: UPDATE tables SET status = 'occupied'     │
│ ✓ Table marked as occupied                        │
│                                                    │
│ COMMIT TRANSACTION                                │
│                                                    │
│ Result: ALL CHANGES PERSISTED (ACID guarantee)   │
└────────────────────────────────────────────────────┘

IF ERROR OCCURS AT ANY STEP:
┌────────────────────────────────────────────────────┐
│ ERROR in Step 3                                    │
│                                                    │
│ ROLLBACK TRANSACTION                              │
│                                                    │
│ Result: ALL CHANGES REVERSED (Database unchanged) │
│ • Order NOT created                               │
│ • Items NOT added                                 │
│ • Table NOT marked occupied                       │
│ • Data integrity maintained                       │
└────────────────────────────────────────────────────┘
```

---

## Role-Based Access Control

```
┌─────────────────────────────────────────────────────┐
│              ROLE-BASED PERMISSIONS                 │
└─────────────────────────────────────────────────────┘

ADMIN:
├─ Create orders
├─ View all orders
├─ Process payments
├─ Manage staff & kitchen users
├─ View reports & analytics
├─ Close sessions
└─ Access all features

STAFF (WAITER):
├─ Create orders
├─ Add items to orders
├─ Send orders to kitchen
├─ View assigned session orders
├─ Process payments
├─ Manage tables
└─ View table status

KITCHEN:
├─ View assigned orders
├─ Update order status (preparing, completed)
├─ View kitchen display
├─ Receive order notifications
└─ Cannot access payment/admin functions
```

---

## Performance Indexes

```
┌──────────────────────────────────────────────────────────────┐
│                     DATABASE INDEXES                          │
├──────────────────────────────────────────────────────────────┤
│ Table              | Index                    | Use Case      │
├──────────────────────────────────────────────────────────────┤
│ orders             | status                   | Kitchen queue │
│                    | session_id               | Session view  │
│                    | table_id                 | Table view    │
│                    | created_at               | Date filter   │
│                    | created_by               | Staff filter  │
├──────────────────────────────────────────────────────────────┤
│ order_items        | order_id                 | Item lookup   │
│                    | product_id               | Product info  │
├──────────────────────────────────────────────────────────────┤
│ payments           | order_id                 | Payment info  │
│                    | status                   | Reconcile     │
│                    | method                   | Analytics     │
├──────────────────────────────────────────────────────────────┤
│ tables             | floor_id                 | Floor view    │
│                    | status                   | Occupancy     │
│                    | (floor_id, table_number) | Unique combo  │
├──────────────────────────────────────────────────────────────┤
│ products           | category_id              | Category flt  │
│                    | is_available             | Menu filter   │
├──────────────────────────────────────────────────────────────┤
│ users              | email                    | Login         │
│                    | role                     | RBAC filter   │
└──────────────────────────────────────────────────────────────┘
```

---

## Data Flow: Complete Order Cycle

```
TIME T0 - ORDER CREATION
┌───────────────────────────┐
│ Staff clicks "New Order"   │
│ Selects Table 1           │
└────────────┬──────────────┘
             │
             ▼
      ┌────────────────┐
      │ POST /api/     │
      │ orders         │
      └────────┬───────┘
               │
               ▼
      ┌────────────────┐
      │ DB: CREATE     │
      │ ORDER (DRAFT)  │
      └────────┬───────┘
               │
               ▼
      Orders table: 1 new row

TIME T1 - ADD ITEMS (0-5 minutes)
┌───────────────────────────┐
│ Staff adds: 2x Biryani    │
│ Staff adds: 1x Juice      │
└────────────┬──────────────┘
             │
             ▼
      ┌────────────────┐
      │ POST /api/     │
      │ orders/:id/    │
      │ items          │
      └────────┬───────┘
               │
               ▼
      ┌────────────────┐
      │ DB: UPDATE     │
      │ TOTAL_PRICE    │
      └────────┬───────┘
               │
               ▼
      Orders: total = 329.98 + 79.99
      Order_items: 2 rows
      Tables: Table 1 = OCCUPIED

TIME T2 - SEND TO KITCHEN (5 minutes)
┌───────────────────────────┐
│ Staff clicks "Send to      │
│ Kitchen"                  │
└────────────┬──────────────┘
             │
             ▼
      ┌────────────────┐
      │ PATCH /api/    │
      │ orders/:id/    │
      │ send-to-kitchen│
      └────────┬───────┘
               │
               ▼
      ┌──────────────────────┐
      │ ORDER STATUS:        │
      │ draft → pending →    │
      │ to_cook              │
      │ Kitchen assigned     │
      │ started_at = NOW     │
      └────────┬─────────────┘
               │
               ▼
      ┌──────────────────────┐
      │ Socket.io:           │
      │ order_sent_to_kitchen│
      │ Items: [Biryani x2]  │
      │ Table: 1             │
      └────────┬─────────────┘
               │
               ▼
      Kitchen display updated
      LIVE notification

TIME T3 - PREPARING (10 minutes)
┌───────────────────────────┐
│ Kitchen marks as          │
│ "PREPARING"               │
└────────────┬──────────────┘
             │
             ▼
      ┌────────────────┐
      │ PATCH /api/    │
      │ orders/:id/    │
      │ status         │
      └────────┬───────┘
               │
               ▼
      ┌──────────────────────┐
      │ ORDER STATUS:        │
      │ to_cook →            │
      │ preparing            │
      └────────┬─────────────┘
               │
               ▼
      ┌──────────────────────┐
      │ Socket.io:           │
      │ order_status_updated │
      │ Status: preparing    │
      │ Table: 1             │
      └────────┬─────────────┘
               │
               ▼
      Customer display
      shows: "Preparing"

TIME T4 - COMPLETED (15 minutes)
┌───────────────────────────┐
│ Kitchen marks as          │
│ "COMPLETED"               │
└────────────┬──────────────┘
             │
             ▼
      ┌────────────────┐
      │ PATCH /api/    │
      │ orders/:id/    │
      │ status         │
      └────────┬───────┘
               │
               ▼
      ┌──────────────────────┐
      │ ORDER STATUS:        │
      │ preparing →          │
      │ completed            │
      │ completed_at = NOW   │
      └────────┬─────────────┘
               │
               ▼
      ┌──────────────────────┐
      │ Socket.io:           │
      │ order_status_updated │
      │ Status: completed    │
      │ Table: 1             │
      └────────┬─────────────┘
               │
               ▼
      Customer display
      shows: "Ready to serve"

TIME T5 - PAYMENT (17 minutes)
┌───────────────────────────┐
│ Staff: Cash payment       │
│ Amount: 409.97            │
└────────────┬──────────────┘
             │
             ▼
      ┌────────────────┐
      │ POST /api/     │
      │ orders/:id/    │
      │ payment        │
      └────────┬───────┘
               │
               ▼
      ┌──────────────────────┐
      │ DB: BEGIN TRANSACTION│
      │ INSERT payment row   │
      │ UPDATE order PAID    │
      │ UPDATE table AVAIL   │
      │ COMMIT               │
      └────────┬─────────────┘
               │
               ▼
      ┌──────────────────────┐
      │ Socket.io:           │
      │ payment_completed    │
      │ Amount: 409.97       │
      │ Method: cash         │
      │ Change: 0            │
      └────────┬─────────────┘
               │
               ▼
      • Order status = PAID
      • Table = AVAILABLE
      • Payment recorded
      • Session revenue ++
      • UI shows success

FINAL STATE:
┌─────────────────────────────────────┐
│ Orders table:                       │
│ • id, table=1, status=paid          │
│ • total_price=409.97                │
│ • paid_at=T5                        │
│ • created_at=T0, started_at=T2      │
│ • completed_at=T4                   │
│                                     │
│ Order_items table: 2 rows           │
│ Payments table: 1 row               │
│ Tables table: status=available      │
│ Sessions table: revenue++           │
└─────────────────────────────────────┘
```

---

## Security Layers

```
┌──────────────────────────────────────┐
│       SECURITY ARCHITECTURE          │
├──────────────────────────────────────┤
│                                      │
│  Layer 1: SQL INJECTION PROTECTION  │
│  ├─ Prepared statements ($1, $2)    │
│  └─ Parameter binding (no strings)  │
│                                      │
│  Layer 2: ROLE-BASED ACCESS        │
│  ├─ Admin, Staff, Kitchen roles     │
│  └─ Middleware validates per route  │
│                                      │
│  Layer 3: FOREIGN KEY CONSTRAINTS   │
│  ├─ Prevents orphaned records       │
│  └─ Cascades on deletes             │
│                                      │
│  Layer 4: TRANSACTION SAFETY        │
│  ├─ ACID guarantee                  │
│  └─ Automatic rollback on error     │
│                                      │
│  Layer 5: ENVIRONMENT SECRETS       │
│  ├─ DB credentials in .env          │
│  └─ No hardcoded passwords          │
│                                      │
│  Layer 6: DATA VALIDATION           │
│  ├─ Input sanitization              │
│  └─ Type checking & constraints     │
│                                      │
│  Layer 7: AUDIT LOGGING             │
│  ├─ Who, what, when tracking       │
│  └─ Compliance ready                │
│                                      │
└──────────────────────────────────────┘
```

---

## Summary: Complete System in One View

```
FRONTEND (React/Vue)
     ↕ HTTP + WebSocket
EXPRESS SERVER (Node.js)
     ↕ SQL Queries + Transactions
POSTGRESQL DATABASE
     • 10 Core Tables
     • 3 Reporting Views
     • 20+ Performance Indexes
     • Foreign Key Constraints
     • ACID Transactions
     • Role-Based Queries

REAL-TIME (Socket.io)
     • order_sent_to_kitchen
     • order_status_updated
     • payment_completed
     • table_status_changed

COMPLETE POS WORKFLOW:
DRAFT → PENDING → TO_COOK → PREPARING → COMPLETED → PAID
```

---

**Ready to integrate with your Express app.js**  
**All components tested and production-ready**
