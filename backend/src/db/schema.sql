CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS pos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO pos (name, code)
VALUES ('Main POS', 'MAIN')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pos_id UUID NOT NULL REFERENCES pos(id) ON DELETE RESTRICT,
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
CREATE INDEX idx_users_pos_id ON users(pos_id);
CREATE INDEX idx_users_pos_role ON users(pos_id, role);

CREATE TABLE IF NOT EXISTS user_pos_access (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pos_id UUID NOT NULL REFERENCES pos(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, pos_id)
);

CREATE TABLE IF NOT EXISTS floors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pos_id UUID NOT NULL REFERENCES pos(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (pos_id, name)
);

CREATE INDEX idx_floors_pos_id ON floors(pos_id);

CREATE TABLE IF NOT EXISTS tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pos_id UUID NOT NULL REFERENCES pos(id) ON DELETE CASCADE,
  floor_id UUID NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
  table_number INTEGER NOT NULL,
  seats INTEGER NOT NULL CHECK (seats > 0),
  status VARCHAR(50) NOT NULL CHECK (status IN ('available', 'occupied')) DEFAULT 'available',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (pos_id, floor_id, table_number)
);

CREATE INDEX idx_tables_floor_id ON tables(floor_id);
CREATE INDEX idx_tables_status ON tables(status);
CREATE INDEX idx_tables_pos_id ON tables(pos_id);

CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pos_id UUID NOT NULL REFERENCES pos(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (pos_id, name)
);

CREATE INDEX idx_categories_pos_id ON categories(pos_id);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pos_id UUID NOT NULL REFERENCES pos(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  price NUMERIC(10, 2) NOT NULL CHECK (price > 0),
  description TEXT,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_products_pos_id ON products(pos_id);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_is_available ON products(is_available);

CREATE TABLE IF NOT EXISTS pos_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pos_id UUID NOT NULL REFERENCES pos(id) ON DELETE CASCADE,
  opened_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  closed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  opened_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMP,
  status VARCHAR(50) NOT NULL CHECK (status IN ('open', 'active', 'closed')) DEFAULT 'active',
  total_sales NUMERIC(12, 2) DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pos_sessions_status ON pos_sessions(status);
CREATE INDEX idx_pos_sessions_pos_id ON pos_sessions(pos_id);
CREATE UNIQUE INDEX ux_pos_sessions_one_active_per_pos
  ON pos_sessions(pos_id)
  WHERE status = 'active';

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pos_id UUID NOT NULL REFERENCES pos(id) ON DELETE CASCADE,
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

CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_pos_id ON orders(pos_id);
CREATE INDEX idx_orders_session_id ON orders(session_id);
CREATE INDEX idx_orders_table_id ON orders(table_id);
CREATE INDEX idx_orders_created_by ON orders(created_by);
CREATE INDEX idx_orders_assigned_kitchen_user ON orders(assigned_kitchen_user);
CREATE UNIQUE INDEX ux_orders_one_open_per_table
  ON orders(pos_id, table_id)
  WHERE status != 'paid';

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

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pos_id UUID NOT NULL REFERENCES pos(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  method VARCHAR(50) NOT NULL CHECK (method IN ('cash', 'card', 'upi')) DEFAULT 'cash',
  payment_type VARCHAR(50) CHECK (payment_type IN ('cash', 'card', 'upi')),
  status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'completed')) DEFAULT 'pending',
  amount NUMERIC(12, 2) NOT NULL,
  transaction_id VARCHAR(255),
  razorpay_payment_id VARCHAR(255),
  razorpay_order_id VARCHAR(255),
  upi_reference VARCHAR(255),
  change_amount NUMERIC(12, 2) DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payments_pos_id ON payments(pos_id);
CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_razorpay_order_id ON payments(razorpay_order_id);
CREATE INDEX idx_payments_razorpay_payment_id ON payments(razorpay_payment_id);
CREATE UNIQUE INDEX ux_payments_one_completed_per_order
  ON payments(order_id)
  WHERE status = 'completed';

CREATE TABLE IF NOT EXISTS payment_method_settings (
  pos_id UUID NOT NULL REFERENCES pos(id) ON DELETE CASCADE,
  method VARCHAR(50) NOT NULL CHECK (method IN ('cash', 'card', 'upi')),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  upi_id VARCHAR(255),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (pos_id, method)
);

<<<<<<< HEAD
INSERT INTO payment_method_settings (pos_id, method, enabled)
SELECT p.id, m.method, TRUE
FROM pos p
CROSS JOIN (VALUES ('cash'), ('card'), ('upi')) AS m(method)
ON CONFLICT (pos_id, method) DO NOTHING;
=======
INSERT INTO payment_method_settings (method, enabled)
SELECT seed.method, TRUE
FROM (VALUES ('cash'), ('card'), ('upi')) AS seed(method)
WHERE NOT EXISTS (
  SELECT 1
  FROM payment_method_settings pms
  WHERE pms.method = seed.method
);
>>>>>>> mann/frontend

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

CREATE OR REPLACE VIEW session_summary AS
SELECT
  ps.id,
  ps.pos_id,
  ps.opened_by,
  u.name AS opened_by_name,
  ps.opened_at,
  ps.closed_at,
  ps.status,
  ps.total_sales,
  ps.total_orders,
  COUNT(DISTINCT o.id) AS order_count,
  COALESCE(SUM(o.total_price), 0) AS session_revenue,
  COALESCE(AVG(o.total_price), 0) AS avg_order_value
FROM pos_sessions ps
LEFT JOIN users u ON ps.opened_by = u.id
LEFT JOIN orders o ON ps.id = o.session_id
GROUP BY ps.id, ps.pos_id, ps.opened_by, u.name, ps.opened_at, ps.closed_at, ps.status, ps.total_sales, ps.total_orders;

CREATE OR REPLACE VIEW kitchen_display AS
SELECT
  o.id,
  o.pos_id,
  o.table_id,
  t.table_number,
  f.name AS floor_name,
  o.status,
  o.created_at,
  o.started_at,
  u.name AS created_by_name,
  STRING_AGG(p.name || ' x' || oi.quantity, ', ') AS items
FROM orders o
LEFT JOIN tables t ON o.table_id = t.id
LEFT JOIN floors f ON t.floor_id = f.id
LEFT JOIN users u ON o.created_by = u.id
LEFT JOIN order_items oi ON o.id = oi.order_id
LEFT JOIN products p ON oi.product_id = p.id
WHERE o.status IN ('to_cook', 'preparing')
GROUP BY o.id, o.pos_id, o.table_id, t.table_number, f.name, o.status, o.created_at, o.started_at, u.name;

CREATE OR REPLACE VIEW table_status_overview AS
SELECT
  t.id,
  t.pos_id,
  t.table_number,
  t.seats,
  f.name AS floor_name,
  t.status,
  o.id AS current_order_id,
  o.status AS order_status,
  COUNT(oi.id) AS item_count,
  EXTRACT(MINUTE FROM (CURRENT_TIMESTAMP - o.created_at)) AS order_duration_minutes
FROM tables t
LEFT JOIN floors f ON t.floor_id = f.id
LEFT JOIN orders o ON t.id = o.table_id AND o.status != 'paid'
LEFT JOIN order_items oi ON o.id = oi.order_id
GROUP BY t.id, t.pos_id, t.table_number, t.seats, f.name, t.status, o.id, o.status, o.created_at;
