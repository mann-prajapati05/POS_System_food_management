# 🗂️ COMPLETE FOLDER STRUCTURE REFERENCE

## Visual Directory Tree

```
backend/
│
├── src/                                    # Main source code directory
│   ├── index.js                            # ⭐ Entry point (npm start runs this)
│   ├── app.js                              # ⭐ Express app setup & middleware
│   │
│   ├── config/                             # 🔧 Configuration & Setup
│   │   └── db.js                           # PostgreSQL connection pool
│   │                                       # Functions: query, beginTransaction, etc.
│   │                                       # Exports: pool, query, testConnection
│   │
│   ├── controllers/                        # 💼 Business Logic (Request Handlers)
│   │   └── orderController.js              # Order CRUD operations
│   │                                       # Exports: createOrder, addOrderItem, etc.
│   │
│   ├── routes/                             # 🛣️ API Route Definitions
│   │   ├── index.js                        # Main route registry (mounts all routes)
│   │   │                                   # Exports: router with /orders, /auth, /health
│   │   ├── orders.js                       # Order endpoints (/api/orders/...)
│   │   │                                   # Exports: createOrder, getOrder, etc.
│   │   └── auth.js                         # Auth endpoints (/api/auth/...)
│   │                                       # TODO: Implement login, register, logout
│   │
│   ├── middleware/                         # 🛡️ Request Processing
│   │   └── errorHandler.js                 # Global error & 404 handlers
│   │                                       # Exports: errorHandler, notFoundHandler
│   │
│   └── utils/                              # 🔨 Helper Functions (Future)
│       └── [TODO] helpers.js               # Common utility functions
│                                           # Future: Validators, formatters, etc.
│
├── database/                               # 🗄️ Database Files
│   ├── schema.sql                          # PostgreSQL schema (tables, indexes, views)
│   │                                       # 11 tables, 3 views, 20+ indexes
│   └── seed.sql                            # Sample data for testing
│                                           # Users, sessions, products, orders
│
├── tests/                                  # 🧪 Testing
│   └── test.js                             # Full workflow test
│                                           # Tests: order → payment → reporting
│
├── docs/                                   # 📚 Documentation
│   ├── SETUP_GUIDE.md                      # Database setup & troubleshooting
│   ├── ARCHITECTURE_DIAGRAM.md             # System design & complete flows
│   ├── POS_SYSTEM_README.md                # Feature documentation
│   ├── APP_INTEGRATION_GUIDE.md            # Integration examples
│   └── DELIVERY_SUMMARY.md                 # Project summary
│
├── .env.example                            # 📝 Environment template
│   # DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
│
├── package.json                            # 📦 Dependencies & Scripts
│   # "start": "node src/index.js"
│   # "dev": "nodemon src/index.js"
│   # "test": "node tests/test.js"
│
├── README.md                               # 📖 Quick start guide
│
├── RESTRUCTURE_GUIDE.md                    # 📋 Structure explanation
│
├── PROJECT_RESTRUCTURE_SUMMARY.md          # 📊 Complete summary of changes
│
└── RESTRUCTURE_COMPLETE.md                 # ✅ Completion checklist
```

---

## 📍 File Locations Quick Map

### Entry & Setup

| What                    | Where                        |
| ----------------------- | ---------------------------- |
| Application entry point | `src/index.js`               |
| Express configuration   | `src/app.js`                 |
| Database connection     | `src/config/db.js`           |
| Environment variables   | `.env` (from `.env.example`) |

### Controllers & Routes

| What                 | Where                                |
| -------------------- | ------------------------------------ |
| Order business logic | `src/controllers/orderController.js` |
| Order endpoints      | `src/routes/orders.js`               |
| Auth endpoints       | `src/routes/auth.js`                 |
| Route registry       | `src/routes/index.js`                |

### Middleware & Utilities

| What             | Where                            |
| ---------------- | -------------------------------- |
| Error handling   | `src/middleware/errorHandler.js` |
| Helper functions | `src/utils/` (future)            |

### Database & Tests

| What            | Where                 |
| --------------- | --------------------- |
| Database schema | `database/schema.sql` |
| Sample data     | `database/seed.sql`   |
| Test suite      | `tests/test.js`       |

### Documentation

| What            | Where                          |
| --------------- | ------------------------------ |
| Quick start     | `README.md`                    |
| Structure guide | `RESTRUCTURE_GUIDE.md`         |
| Setup guide     | `docs/SETUP_GUIDE.md`          |
| Architecture    | `docs/ARCHITECTURE_DIAGRAM.md` |

---

## 🔄 File Relationships

```
User Request
    │
    ├─→ src/index.js (starts app on port 3000)
    │
    ├─→ src/app.js (Express setup & middleware)
    │    ├─ CORS, JSON parsing
    │    ├─ Request logging
    │    └─ Route mounting
    │
    ├─→ src/routes/index.js (route registry)
    │    ├─→ src/routes/orders.js (POST /api/orders)
    │    │   └─→ src/controllers/orderController.js::createOrder()
    │    │       └─→ src/config/db.js::query()
    │    │
    │    └─→ src/routes/auth.js (POST /api/auth/login)
    │        └─ [TODO: Not implemented yet]
    │
    ├─ If error occurs:
    │    └─→ src/middleware/errorHandler.js (catches & formats)
    │
    └─ Response sent to client
```

---

## 🚀 How to Use Each File

### src/index.js

```javascript
// THIS IS THE ENTRY POINT - run this file with: npm start
// It imports app.js and starts the server
import app, { startServer } from "./app.js";
startServer();
```

### src/app.js

```javascript
// THIS CONFIGURES EXPRESS
// - Middleware setup (CORS, JSON, logging)
// - Route mounting
// - Error handling
import apiRoutes from "./routes/index.js";
app.use("/api", apiRoutes);
```

### src/config/db.js

```javascript
// THIS CONNECTS TO DATABASE
// - Connection pooling
// - Query execution
// - Transaction support
import { query } from "./config/db.js";
const result = await query("SELECT * FROM users WHERE id = $1", [userId]);
```

### src/routes/index.js

```javascript
// THIS REGISTERS ALL ROUTES
import ordersRouter from "./orders.js";
router.use("/orders", ordersRouter);
// Result: GET /api/orders/:id works
```

### src/routes/orders.js

```javascript
// THIS DEFINES ORDER ENDPOINTS
import { createOrder } from "../controllers/orderController.js";
router.post("/", createOrder);
// Result: POST /api/orders calls createOrder()
```

### src/controllers/orderController.js

```javascript
// THIS HAS BUSINESS LOGIC
import { query, beginTransaction } from "../../config/db.js";
export const createOrder = async (req, res) => {
  const result = await query("INSERT INTO orders...");
  res.json(result);
};
```

### src/middleware/errorHandler.js

```javascript
// THIS CATCHES ALL ERRORS
export const errorHandler = (err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message });
};
// Registered once in app.js
```

---

## 📊 Import Chain Example

### From Route to Database

```typescript
// 1. Route receives request
POST /api/orders

// 2. Routed to handler in src/routes/orders.js
import { createOrder } from '../controllers/orderController.js';
router.post('/', createOrder);

// 3. Handler imports business logic from controller
// File: src/controllers/orderController.js
import { query } from '../../config/db.js';

export const createOrder = async (req, res) => {
  // 4. Controller calls database query
  const result = await query(
    'INSERT INTO orders (session_id, table_id, ...) VALUES ($1, $2, ...)',
    [sessionId, tableId, ...]
  );

  // 5. Return response
  res.json(result.rows[0]);
};

// 6. Database connection module handles query execution
// File: src/config/db.js
export async function query(queryText, values = []) {
  const result = await pool.query(queryText, values);
  return result;
}
```

---

## 🔍 Finding Your Way Around

### I want to...

**Add a new API endpoint**

1. Create controller in `src/controllers/`
2. Create or update route in `src/routes/`
3. Register in `src/routes/index.js`

**Fix a bug**

1. Check `src/routes/` for endpoint
2. Look at controller in `src/controllers/`
3. Check database query in controller

**Add authentication**

1. Create `src/middleware/auth.js`
2. Import in `src/app.js`
3. Use with `router.use(auth)` in routes

**Debug database issue**

1. Check `src/config/db.js`
2. Look at controller query
3. Check `database/schema.sql` for table structure

**View API response**

1. Check `src/routes/` for endpoint definition
2. Check controller for response formatting
3. Verify error handling in `src/middleware/errorHandler.js`

---

## 📦 Dependencies Location

### In src/app.js

```javascript
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
```

### In src/config/db.js

```javascript
import pg from "pg";
import dotenv from "dotenv";
```

### In src/controllers/orderController.js

```javascript
// No external dependencies - uses internal db.js
import { query, beginTransaction } from "../../config/db.js";
```

---

## 🎯 Typical Development Workflow

### 1. Development Setup

```bash
cd backend
npm install
cp .env.example .env
npm run db:init
npm run db:seed
```

### 2. Start Developing

```bash
npm run dev
# Watches src/ for changes, restarts on save
```

### 3. Create New Feature

```javascript
// Step 1: Add controller in src/controllers/
export const newFeature = async (req, res) => { ... }

// Step 2: Add route in src/routes/
import { newFeature } from '../controllers/...';
router.post('/new', newFeature);

// Step 3: Register in src/routes/index.js
router.use('/feature', featureRouter);
```

### 4. Test

```bash
npm test
# Or test individual endpoint:
curl http://localhost:3000/api/feature/new
```

### 5. Commit Changes

```bash
git add .
git commit -m "Add new feature"
```

---

## ✅ Quick Verification

### File exists?

```bash
ls -la src/index.js              # Should exist
ls -la src/config/db.js          # Should exist
ls -la src/routes/index.js       # Should exist
```

### Imports work?

```bash
node -c src/index.js             # No output = success
```

### Start server?

```bash
npm start                        # Should print "Server running on port 3000"
```

### Test health?

```bash
curl http://localhost:3000/health  # Should return JSON
```

---

## 📚 Documentation Cross-Reference

| To Learn About      | Read This                        |
| ------------------- | -------------------------------- |
| Quick start         | `README.md`                      |
| Why restructured    | `PROJECT_RESTRUCTURE_SUMMARY.md` |
| How files organized | `RESTRUCTURE_GUIDE.md`           |
| File tree           | This file                        |
| Database setup      | `docs/SETUP_GUIDE.md`            |
| System design       | `docs/ARCHITECTURE_DIAGRAM.md`   |
| API examples        | `docs/APP_INTEGRATION_GUIDE.md`  |

---

## 🎉 You Now Have

✅ **Clean Folder Structure** — Everything organized by purpose  
✅ **Production-Ready** — Error handling, logging, health checks  
✅ **Scalable** — Easy to add features without cluttering  
✅ **Well-Documented** — Code comments and guides  
✅ **npm Scripts Ready** — Simple commands to manage project  
✅ **Modular Design** — Each folder has single responsibility  
✅ **Ready to Deploy** — Database pooling, graceful shutdown

---

**Date:** April 4, 2026  
**Status:** ✅ Complete  
**Version:** 1.0
