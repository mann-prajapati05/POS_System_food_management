# Restaurant POS System - Database Setup Guide

A production-grade Restaurant Point-of-Sale backend with complete workflow support: Sessions → Tables → Orders → Kitchen → Payment → Reporting.

## 📋 Architecture Overview

```
POS_SESSION (Daily Operations)
├── TABLES (Physical/Virtual)
│   └── ORDERS (Draft → Paid)
│       ├── ORDER_ITEMS (Products ordered)
│       ├── KITCHEN Display (Real-time status)
│       └── PAYMENTS (Cash/Card/UPI)
└── REPORTING (Analytics & Metrics)
```

## 🚀 Quick Setup (5 minutes)

### 1. Create PostgreSQL Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE odoo_pos;
\d  # List databases to verify

# Exit
\q
```

### 2. Setup Environment Variables

```bash
# Copy template
cp backend/.env.example backend/.env

# Edit .env with your PostgreSQL credentials
```

### 3. Initialize Database Schema

```bash
# From backend/ directory
psql -U postgres -d odoo_pos -f schema.sql

# Verify tables created
psql -U postgres -d odoo_pos -c "\dt"
```

### 4. Load Seed Data

```bash
# Insert sample data
psql -U postgres -d odoo_pos -f seed.sql

# Verify data
psql -U postgres -d odoo_pos -c "SELECT * FROM users;"
psql -U postgres -d odoo_pos -c "SELECT * FROM pos_sessions;"
```

### 5. Install Node Dependencies

```bash
cd backend

# Required packages
npm install pg dotenv
npm install --save-dev nodemon  # For development

# For ES modules, ensure package.json has:
# "type": "module"
```

### 6. Run Test Suite

```bash
# Verify complete workflow
node test.js
```

Expected output: ✅ ALL TESTS PASSED!

---

## 📊 Database Schema

### Core Tables

| Table               | Purpose                          | Key Fields                                              |
| ------------------- | -------------------------------- | ------------------------------------------------------- |
| `users`             | Staff, admin, kitchen            | role (admin, staff, kitchen)                            |
| `pos_sessions`      | Daily operations opening/closing | status (open, closed)                                   |
| `floors`            | Physical restaurant areas        | name                                                    |
| `tables`            | Physical/virtual dining areas    | table_number, seats, status                             |
| `orders`            | Complete order lifecycle         | status (draft→pending→to_cook→preparing→completed→paid) |
| `order_items`       | Line items per order             | product_id, quantity, price_at_time                     |
| `payments`          | Transaction records              | method (cash, card, upi), status                        |
| `categories`        | Product groups                   | name                                                    |
| `products`          | Menu items                       | price, is_available                                     |
| `self_order_tokens` | QR table ordering (optional)     | token, expires_at                                       |

### Order Status Flow

```
draft → pending → to_cook → preparing → completed → paid
```

- **draft**: Created but not confirmed
- **pending**: Confirmed, waiting to send to kitchen
- **to_cook**: Sent to kitchen, awaiting preparation
- **preparing**: Kitchen is actively preparing
- **completed**: Ready to serve
- **paid**: Payment received, order closed

---

## 🔌 Integration Points

### db.js API

```javascript
import {
  query,
  beginTransaction,
  commitTransaction,
  rollbackTransaction,
} from "./db.js";

// Simple query
const result = await query("SELECT * FROM users WHERE id = $1", [userId]);

// Transaction example
const client = await beginTransaction();
try {
  await client.query("UPDATE orders SET status = $1 WHERE id = $2", [
    "paid",
    orderId,
  ]);
  await commitTransaction(client);
} catch (err) {
  await rollbackTransaction(client);
}
```

### Real-Time Events (Socket.io)

```javascript
// Backend should emit on:
io.emit("order_created", { orderId, tableId, timestamp });
io.emit("order_sent_to_kitchen", { orderId, items });
io.emit("order_status_updated", { orderId, status, timestamp });
io.emit("payment_completed", { orderId, amount, method });
io.emit("table_status_changed", { tableId, status });
```

---

## 📈 Reporting Queries

### Session Revenue Summary

```sql
SELECT * FROM session_summary WHERE status = 'open';
```

### Kitchen Display (Real-time)

```sql
SELECT * FROM kitchen_display;
```

### Table Status Overview

```sql
SELECT * FROM table_status_overview;
```

### Custom Queries

```sql
-- Revenue by payment method
SELECT method, COUNT(*) as transactions, SUM(amount) as revenue
FROM payments
WHERE status = 'completed'
GROUP BY method
ORDER BY revenue DESC;

-- Average table duration
SELECT AVG(EXTRACT(MINUTE FROM (completed_at - created_at))) as avg_minutes
FROM orders
WHERE status = 'paid'
  AND completed_at IS NOT NULL;

-- Peak hours
SELECT EXTRACT(HOUR FROM created_at) as hour, COUNT(*) as orders
FROM orders
GROUP BY hour
ORDER BY hour;
```

---

## 🔒 Security Considerations

- **Password Hashing**: Use bcrypt before inserting into users table
- **Role-Based Access Control**: Validate `role` in middleware (admin, staff, kitchen)
- **Foreign Key Constraints**: Prevent orphaned records
- **Transaction Safety**: All multi-step operations wrapped in transactions
- **Environment Variables**: Never commit `.env` file
- **Input Validation**: Validate all user inputs before database operations
- **Connection Pooling**: Prevents connection exhaustion

---

## 🛠️ Development Workflow

### Watch Mode

```bash
nodemon test.js
```

### Create New Order (from Node script)

```javascript
import {
  query,
  beginTransaction,
  commitTransaction,
  rollbackTransaction,
} from "./db.js";

async function createOrder(sessionId, tableId, staffId) {
  const client = await beginTransaction();
  try {
    const result = await client.query(
      "INSERT INTO orders (session_id, table_id, created_by, status) VALUES ($1, $2, $3, $4) RETURNING *",
      [sessionId, tableId, staffId, "draft"],
    );
    await commitTransaction(client);
    return result.rows[0];
  } catch (err) {
    await rollbackTransaction(client);
    throw err;
  }
}
```

### Query Execution Time

Queries taking >1 second are automatically logged to console.

---

## 🧪 Testing

The `test.js` script validates:

1. ✅ Database connection
2. ✅ Order creation (DRAFT state)
3. ✅ Order workflow (PENDING → TO_COOK → PREPARING → COMPLETED)
4. ✅ Kitchen assignment & updates
5. ✅ Payment processing
6. ✅ Table status transitions
7. ✅ Reporting views

Run: `node test.js`

---

## 📋 Troubleshooting

### Connection Failed

```
Error: connect ECONNREFUSED
```

**Solution**: Ensure PostgreSQL is running

```bash
# Windows
net start PostgreSQL

# macOS
brew services start postgresql

# Linux
sudo service postgresql start
```

### Database Already Exists

```
ERROR: database "odoo_pos" already exists
```

**Solution**: Drop and recreate

```bash
psql -U postgres -c "DROP DATABASE IF EXISTS odoo_pos;"
psql -U postgres -c "CREATE DATABASE odoo_pos;"
```

### Foreign Key Violation

```
ERROR: insert or update on table violates foreign key constraint
```

**Solution**: Ensure parent records exist

```bash
-- Verify user exists
SELECT id FROM users WHERE id = 'uuid-here';

-- Verify session exists
SELECT id FROM pos_sessions WHERE id = 'uuid-here';
```

### Module Import Error

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module 'pg'
```

**Solution**: Install dependencies

```bash
npm install pg dotenv
```

### UUID Extension Error

```
ERROR: function gen_random_uuid() does not exist
```

**Solution**: Extension not loaded. Schema setup script should handle it, but verify:

```sql
psql -U postgres -d odoo_pos -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"
```

---

## 📦 File Structure

```
backend/
├── db.js                 # Database connection & query utilities
├── schema.sql            # PostgreSQL schema (tables, indexes, views)
├── seed.sql              # Sample data (users, products, orders)
├── test.js               # Workflow verification script
├── .env.example          # Environment template
└── package.json          # Dependencies (pg, dotenv)
```

---

## 🎯 Next Steps

1. **Implement REST API Routes** → Controllers in `controller/authController.js`
2. **Add Socket.io** → Real-time order/payment updates
3. **Authentication** → JWT middleware for protected routes
4. **Business Logic** → Order management, table management, reports
5. **Frontend** → React/Vue dashboard for POS interactions

---

## 📞 Support

For issues:

1. Check PostgreSQL is running
2. Verify `.env` credentials
3. Review console error messages
4. Check seed.sql inserts completed successfully
5. Review schema.sql for table structure

---

**Version**: 1.0  
**Last Updated**: 2026-04-04  
**Tech Stack**: Node.js + PostgreSQL + Socket.io
