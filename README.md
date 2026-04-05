# Odoo POS Cafe

Restaurant POS system for multi-counter operations, kitchen coordination, and admin management. Built for fast service workflows with session-based billing, table tracking, and role-separated access.

## Overview

Odoo POS Cafe is a full-stack restaurant point-of-sale system designed to manage orders, tables, kitchen preparation, and payments from a single workflow.

It solves the common problem of splitting responsibilities across staff, kitchen, and admin teams while keeping all actions tied to the correct POS outlet through `pos_id` isolation. The result is a cleaner restaurant POS experience with fewer order mistakes, better kitchen visibility, and more reliable payment handling.

## Features

### 🔐 Authentication & Roles

- Secure login with JWT-based authentication
- Role-based access for `admin`, `staff`, and `kitchen`
- POS-scoped permissions to keep each outlet isolated

### 🏪 Multi-POS System

- Multi-tenant architecture using `pos_id`
- Separate floors, tables, sessions, users, and orders per POS
- Safe POS switching for admin management

### 🧾 POS Operations (Staff)

- Open and close POS sessions manually
- Floor and table management
- Create orders, add items, update quantities, and manage order lifecycle
- Smart handling for kitchen and non-kitchen items
- Cart badges for direct-serve items

### 🍳 Kitchen Display System

- Live kitchen board for incoming orders
- Order-level and item-level preparation tracking
- Status transitions for kitchen workflow
- Filters, tabs, and order detail views
- Only kitchen-required items are shown to the kitchen

### 💳 Payments

- Cash payment flow
- Razorpay integration for Card and UPI payments
- Payment verification on the backend
- Session-aware payment completion flow

### 🛠️ Admin Panel

- Manage POS outlets, users, floors, tables, categories, and products
- Optional product image upload using Multer disk storage
- Product availability controls
- Product flags for kitchen-required vs direct-serve items

### 📊 Analytics & Reporting

- Session summaries
- Sales reports
- Top product reports
- Payment breakdown support

## System Architecture

### Backend

The backend is built with Node.js and Express.js and uses PostgreSQL for persistence. It exposes REST APIs for authentication, staff operations, kitchen workflows, admin management, and payments.

### Frontend

The frontend is built with React, Vite, and Tailwind CSS. It provides separate interfaces for staff, kitchen, and admin users.

### Database

PostgreSQL stores POS data, users, sessions, orders, items, products, payments, and reporting data.

### Isolation Model

`pos_id` is the primary isolation boundary. Every important entity is scoped to a specific POS so data from one outlet does not leak into another.

## Workflow

1. User logs in.
2. Staff opens an active POS session.
3. Staff selects a table.
4. Staff creates an order and adds items.
5. The system checks which items require kitchen preparation.
6. Staff sends only kitchen items to the KDS.
7. Kitchen prepares and updates item progress.
8. Staff collects payment through cash or Razorpay.
9. The session is closed.
10. Admin views reports and analytics.

## Tech Stack

### Frontend

- React
- Tailwind CSS
- Axios

### Backend

- Node.js
- Express.js
- PostgreSQL
- Multer
- Razorpay

## Installation & Setup

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd odoo_food
```

### 2. Backend setup

```bash
cd backend
npm install
```

Create your backend `.env` file from `.env.example`, then start the server:

```bash
npm start
```

If you prefer hot reload during development, add a `dev` script with `nodemon` and run it from there.

### 3. Frontend setup

```bash
cd ../frontend
npm install
npm run dev
```

## Environment Variables

### Backend

```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=odoo_pos
DB_MAINTENANCE_DB=postgres
FRONTEND_URL=http://localhost:5174
JWT_SECRET=change_me_to_a_strong_secret
JWT_EXPIRES_IN=1d
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
```

### Frontend

```env
VITE_API_URL=http://localhost:3000
VITE_RAZORPAY_KEY_ID=your_key_id
```

## Project Structure

```text
odoo_food/
├── backend/       # Express API, PostgreSQL access, payment and kitchen logic
├── frontend/      # React UI for admin, staff, and kitchen workflows
└── uploads/       # Product image uploads served by the backend
```

## Key Highlights

- Multi-tenant POS system with `pos_id` isolation
- Session-based restaurant workflow with manual open and close
- Kitchen workflow with item-level tracking and partial preparation support
- Smart handling for non-kitchen items so the KDS only shows actionable tasks
- Real payment integration with Cash and Razorpay Card/UPI
- Clean staff, kitchen, and admin UI flows designed for day-to-day restaurant operations

## Future Improvements

- Real-time WebSockets for stronger live synchronization
- Mobile app for staff and kitchen teams
- Advanced analytics dashboards and trend reporting

## Author / Team

- Project Team: Add your team member names here
- Team Lead: Add your lead name here

## Notes

- Product images are stored locally using Multer disk storage and served from the backend `/uploads` path.
- Kitchen-only and direct-serve items are handled without changing the order structure.
- Existing orders remain compatible because new database columns default safely for older records.
