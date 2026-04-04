-- Enable required UUID extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ======================================
-- 1. USERS TABLE
-- ======================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'staff', 'kitchen')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ======================================
-- 2. POS_SESSIONS TABLE
-- ======================================
CREATE TABLE IF NOT EXISTS pos_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opened_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  opened_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMP,
  status VARCHAR(50) NOT NULL CHECK (status IN ('open', 'closed')) DEFAULT 'open',
  total_sales NUMERIC(12, 2) DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pos_sessions_status ON pos_sessions(status);
CREATE INDEX idx_pos_sessions_opened_at ON pos_sessions(opened_at);
CREATE INDEX idx_pos_sessions_opened_by ON pos_sessions(opened_by);

-- ======================================
-- 3. FLOORS TABLE
-- ======================================
CREATE TABLE IF NOT EXISTS floors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_floors_name ON floors(name);

-- ======================================
-- 4. TABLES TABLE
-- ======================================
CREATE TABLE IF NOT EXISTS tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  floor_id UUID NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
  table_number INTEGER NOT NULL,
  seats INTEGER NOT NULL CHECK (seats > 0),
  status VARCHAR(50) NOT NULL CHECK (status IN ('available', 'occupied')) DEFAULT 'available',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (floor_id, table_number)
);

CREATE INDEX idx_tables_floor_id ON tables(floor_id);
CREATE INDEX idx_tables_status ON tables(status);
CREATE INDEX idx_tables_floor_number ON tables(floor_id, table_number);

-- ======================================
-- 5. CATEGORIES TABLE
-- ======================================
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_categories_name ON categories(name);

-- ======================================
-- 6. PRODUCTS TABLE
-- ======================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  price NUMERIC(10, 2) NOT NULL CHECK (price > 0),
  description TEXT,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_is_available ON products(is_available);

-- ======================================
-- 7. ORDERS TABLE (Core POS workflow)
-- ======================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES pos_sessions(id) ON DELETE RESTRICT,
  table_id UUID NOT NULL REFERENCES tables(id) ON DELETE RESTRICT,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  assigned_kitchen_user UUID REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(50) NOT NULL CHECK (status IN ('draft', 'pending', 'to_cook', 'preparing', 'completed', 'paid')) DEFAULT 'draft',
  total_price NUMERIC(12, 2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  paid_at TIMESTAMP
);

-- Critical indexes for real-time operations
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_session_id ON orders(session_id);
CREATE INDEX idx_orders_table_id ON orders(table_id);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_orders_created_by ON orders(created_by);
CREATE INDEX idx_orders_assigned_kitchen_user ON orders(assigned_kitchen_user);
CREATE INDEX idx_orders_session_status ON orders(session_id, status);

-- ======================================
-- 8. ORDER_ITEMS TABLE
-- ======================================
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  price_at_time NUMERIC(10, 2) NOT NULL CHECK (price_at_time > 0),
  is_prepared BOOLEAN DEFAULT FALSE,
  prepared_at TIMESTAMP,
  prepared_by UUID REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);
CREATE INDEX idx_order_items_order_prepared ON order_items(order_id, is_prepared);

-- ======================================
-- 9. PAYMENTS TABLE
-- ======================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  method VARCHAR(50) NOT NULL CHECK (method IN ('cash', 'card', 'upi')) DEFAULT 'cash',
  status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'completed')) DEFAULT 'pending',
  amount NUMERIC(12, 2) NOT NULL,
  upi_reference VARCHAR(255), -- For QR payments
  change_amount NUMERIC(12, 2) DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_method ON payments(method);

-- ======================================
-- 9.1 PAYMENT_METHOD_SETTINGS TABLE
-- ======================================
CREATE TABLE IF NOT EXISTS payment_method_settings (
  method VARCHAR(50) PRIMARY KEY CHECK (method IN ('cash', 'card', 'upi')),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  upi_id VARCHAR(255),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO payment_method_settings (method, enabled)
VALUES ('cash', TRUE), ('card', TRUE), ('upi', TRUE)
ON CONFLICT (method) DO NOTHING;

-- ======================================
-- 10. SELF_ORDER_TOKENS TABLE (Optional - for QR table ordering)
-- ======================================
CREATE TABLE IF NOT EXISTS self_order_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES pos_sessions(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  is_used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_self_order_tokens_table_id ON self_order_tokens(table_id);
CREATE INDEX idx_self_order_tokens_session_id ON self_order_tokens(session_id);
CREATE INDEX idx_self_order_tokens_token ON self_order_tokens(token);
CREATE INDEX idx_self_order_tokens_expires_at ON self_order_tokens(expires_at);

-- ======================================
-- AUDIT TABLE (Optional - for compliance/reporting)
-- ======================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL,
  changes JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- ======================================
-- VIEWS FOR REPORTING
-- ======================================

-- Daily sales summary per session
CREATE OR REPLACE VIEW session_summary AS
SELECT
  ps.id,
  ps.opened_by,
  u.name as opened_by_name,
  ps.opened_at,
  ps.closed_at,
  ps.status,
  ps.total_sales,
  ps.total_orders,
  COUNT(DISTINCT o.id) as order_count,
  SUM(o.total_price) as session_revenue,
  AVG(o.total_price) as avg_order_value
FROM pos_sessions ps
LEFT JOIN users u ON ps.opened_by = u.id
LEFT JOIN orders o ON ps.id = o.session_id
GROUP BY ps.id, ps.opened_by, u.name, ps.opened_at, ps.closed_at, ps.status, ps.total_sales, ps.total_orders;

-- Real-time kitchen display
CREATE OR REPLACE VIEW kitchen_display AS
SELECT
  o.id,
  o.table_id,
  t.table_number,
  f.name as floor_name,
  o.status,
  o.created_at,
  o.started_at,
  u.name as created_by_name,
  STRING_AGG(p.name || ' x' || oi.quantity, ', ') as items
FROM orders o
LEFT JOIN tables t ON o.table_id = t.id
LEFT JOIN floors f ON t.floor_id = f.id
LEFT JOIN users u ON o.created_by = u.id
LEFT JOIN order_items oi ON o.id = oi.order_id
LEFT JOIN products p ON oi.product_id = p.id
WHERE o.status IN ('to_cook', 'preparing')
GROUP BY o.id, o.table_id, t.table_number, f.name, o.status, o.created_at, o.started_at, u.name;

-- Table status overview
CREATE OR REPLACE VIEW table_status_overview AS
SELECT
  t.id,
  t.table_number,
  t.seats,
  f.name as floor_name,
  t.status,
  o.id as current_order_id,
  o.status as order_status,
  COUNT(oi.id) as item_count,
  EXTRACT(MINUTE FROM (CURRENT_TIMESTAMP - o.created_at)) as order_duration_minutes
FROM tables t
LEFT JOIN floors f ON t.floor_id = f.id
LEFT JOIN orders o ON t.id = o.table_id AND o.status != 'paid'
LEFT JOIN order_items oi ON o.id = oi.order_id
GROUP BY t.id, t.table_number, t.seats, f.name, t.status, o.id, o.status, o.created_at;
