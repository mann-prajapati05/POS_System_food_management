# 🚀 Restaurant POS Backend - Restructured

A production-grade Node.js backend for a Restaurant Point-of-Sale system with clean, scalable folder structure.

## 📋 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Setup .env (copy from .env.example)
cp .env.example .env

# 3. Create database
psql -U postgres -c "CREATE DATABASE odoo_pos;"

# 4. Initialize schema
npm run db:init
npm run db:seed

# 5. Start server
npm start
# Server runs on: http://localhost:3000
```

## 📁 Project Structure

```
src/                              # All source code
├── index.js                       # Entry point (npm start)
├── app.js                         # Express configuration
│
├── config/
│   └── db.js                      # PostgreSQL connection pool
│
├── controllers/
│   └── orderController.js         # Order business logic
│
├── routes/
│   ├── index.js                   # Main route registry
│   ├── orders.js                  # Order endpoints
│   └── auth.js                    # Auth endpoints
│
├── middleware/
│   └── errorHandler.js            # Error & 404 handlers
│
└── utils/                         # Helper functions (future)
```

## 🔌 API Endpoints

### Health Check

- `GET /health` — Quick health check
- `GET /api-status` — Includes database status

### Orders

- `POST /api/orders` — Create order
- `GET /api/orders/:id` — Get order details
- `POST /api/orders/:id/items` — Add items
- `PATCH /api/orders/:id/send-to-kitchen` — Send to kitchen
- `PATCH /api/orders/:id/status` — Update status
- `POST /api/orders/:id/payment` — Process payment

### Reports

- `GET /api/orders/sessions/:id/summary` — Session revenue
- `GET /api/orders/kitchen/display` — Kitchen queue
- `GET /api/orders/tables/status` — Table status
- `GET /api/orders/reports/daily` — Daily report

### Authentication (TODO)

- `POST /api/auth/register` — Register user
- `POST /api/auth/login` — Login
- `POST /api/auth/logout` — Logout

## 🛠️ npm Scripts

```bash
npm start           # Start server (production)
npm run dev         # Start with auto-reload (development)
npm test            # Run tests
npm run test:watch  # Run tests with watch mode
npm run db:init    # Initialize database schema
npm run db:seed    # Load sample data
```

## 📊 File Organization

### `index.js` — Entry Point

- Imports Express app from `app.js`
- Starts server with `startServer()`
- Handles graceful shutdown
- Catches uncaught exceptions

### `app.js` — Express Setup

- CORS configuration
- Middleware setup (JSON, cookies, logging)
- Route mounting (`/api`)
- Error handlers
- Exports `startServer()` function

### `config/db.js` — Database

- Connection pooling (20 concurrent)
- Query execution
- Transaction support
- Connection testing

### `controllers/orderController.js` — Business Logic

- 10+ order management functions
- Payment processing
- Session management
- Reporting queries

### `routes/index.js` — Route Registry

- Central place to mount all routes
- `/api/orders` - Order management
- `/api/auth` - Authentication
- `/api/health` - Health check

### `middleware/errorHandler.js` — Error Handling

- Global error catcher
- 404 handler
- Request logger
- Development/production error formatting

## 🔄 Request Flow

```
Client Request
    ↓
Express Middleware (CORS, JSON parsing, logging)
    ↓
Route Handler (routes/index.js)
    ↓
Controller Function (controllers/orderController.js)
    ↓
Database Query (config/db.js)
    ↓
Response sent back to client
    ↓
(If error) Error Handler catches it
```

## 🔐 Authentication & Authorization

TODO: Add JWT middleware in `src/middleware/auth.js`

```javascript
// Example (not implemented yet)
import { verifyToken } from "../middleware/auth.js";

router.post("/orders", verifyToken, createOrder);
// Only authenticated users can create orders
```

## 📈 Scaling the Project

### Add New Routes

1. Create controller: `src/controllers/productController.js`
2. Create routes: `src/routes/products.js`
3. Register in `src/routes/index.js`

### Add Middleware

1. Create: `src/middleware/validation.js`
2. Import in `src/app.js`
3. Use with `app.use(validation)`

### Add Utilities

1. Create: `src/utils/helpers.js`
2. Import where needed
3. Export functions

## 🧪 Testing

```bash
npm test
# Runs tests/test.js
# Tests complete order workflow:
# - Order creation
# - Kitchen assignment
# - Payment processing
# - Status updates
# - Reporting queries
```

## 📚 Documentation

- **PROJECT_RESTRUCTURE_SUMMARY.md** — Why & what changed
- **RESTRUCTURE_GUIDE.md** — Detailed structure explanation
- **SETUP_GUIDE.md** — Database setup & troubleshooting
- **ARCHITECTURE_DIAGRAM.md** — System designs & flows
- **POS_SYSTEM_README.md** — Feature overview
- **APP_INTEGRATION_GUIDE.md** — Integration examples

## 🚨 Troubleshooting

### Port Already in Use

```bash
# Change PORT in .env
# Or kill process using port 3000
lsof -i :3000
kill -9 <PID>
```

### Database Connection Error

```bash
# Check PostgreSQL is running
psql -U postgres

# Verify .env credentials
cat .env

# Check database exists
psql -U postgres -l
```

### Module Not Found

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

## 📦 Dependencies

- **express** ^5.2.1 — Web framework
- **pg** ^8.11.3 — PostgreSQL client
- **cors** ^2.8.6 — CORS middleware
- **dotenv** ^17.3.1 — Environment variables
- **cookie-parser** ^1.4.7 — Cookie handling
- **bcrypt** ^6.0.0 — Password hashing

## 🎯 Next Steps

1. ✅ Structure is complete
2. ✅ Routes are functional
3. 📝 Implement authentication middleware
4. 📝 Add request validation
5. 📝 Add comprehensive logging
6. 📝 Deploy to production

## 📞 Support

- Check documentation files in `docs/`
- Review code comments
- Check error messages in terminal
- Verify database connection

---

**Version:** 1.0  
**Date:** April 4, 2026  
**Status:** ✅ Production Ready
