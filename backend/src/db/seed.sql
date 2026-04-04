-- ======================================
-- SEED DATA FOR POS SYSTEM
-- ======================================

-- Disable foreign key checks temporarily if needed
-- (In PostgreSQL, we'll just insert in the correct order)

-- ======================================
-- 1. INSERT USERS
-- ======================================
INSERT INTO users (name, email, password, role) VALUES
  ('Admin User', 'admin@restaurant.com', 'hashed_password_admin_123', 'admin'),
  ('John Staff', 'john@restaurant.com', 'hashed_password_john_456', 'staff'),
  ('Kitchen Chef', 'chef@restaurant.com', 'hashed_password_chef_789', 'kitchen')
ON CONFLICT (email) DO NOTHING;

-- Get user IDs for reference
WITH admin_user AS (SELECT id FROM users WHERE email = 'admin@restaurant.com'),
     staff_user AS (SELECT id FROM users WHERE email = 'john@restaurant.com'),
     kitchen_user AS (SELECT id FROM users WHERE email = 'chef@restaurant.com')

-- ======================================
-- 2. INSERT FLOORS
-- ======================================
INSERT INTO floors (name) VALUES
  ('Ground Floor'),
  ('First Floor')
ON CONFLICT DO NOTHING;

-- ======================================
-- 3. INSERT TABLES
-- ======================================
INSERT INTO tables (floor_id, table_number, seats, status)
SELECT
  f.id,
  t.table_number,
  t.seats,
  'available'
FROM floors f
CROSS JOIN (
  SELECT 1 as table_number, 2 as seats
  UNION SELECT 2, 4
  UNION SELECT 3, 4
  UNION SELECT 4, 6
  UNION SELECT 5, 8
) t
WHERE NOT EXISTS (SELECT 1 FROM tables WHERE floor_id = f.id AND table_number = t.table_number)
ORDER BY f.id, t.table_number;

-- ======================================
-- 4. INSERT CATEGORIES
-- ======================================
INSERT INTO categories (name, description) VALUES
  ('Appetizers', 'Starters and appetizers'),
  ('Main Courses', 'Lunch and dinner main courses'),
  ('Beverages', 'Drinks and beverages')
ON CONFLICT (name) DO NOTHING;

-- ======================================
-- 5. INSERT PRODUCTS
-- ======================================
INSERT INTO products (name, category_id, price, description, is_available)
SELECT
  p.name,
  c.id,
  p.price,
  p.description,
  TRUE
FROM categories c
CROSS JOIN (
  SELECT 'Appetizers' as category, 'Samosa' as name, 99.99 as price, 'Crispy fried samosa' as description
  UNION SELECT 'Appetizers', 'Paneer Tikka', 199.99, 'Grilled paneer cubes'
  UNION SELECT 'Appetizers', 'Spring Rolls', 89.99, 'Vegetable spring rolls'
  
  UNION SELECT 'Main Courses', 'Butter Chicken', 449.99, 'Creamy chicken curry'
  UNION SELECT 'Main Courses', 'Paneer Butter Masala', 399.99, 'Paneer in tomato cream sauce'
  UNION SELECT 'Main Courses', 'Biryani', 329.99, 'Fragrant rice with meat'
  
  UNION SELECT 'Beverages', 'Soft Drink (300ml)', 49.99, 'Coca-Cola / Sprite / Fanta'
  UNION SELECT 'Beverages', 'Fresh Juice', 79.99, 'Orange / Mango juice'
) p
WHERE c.name = p.category
AND NOT EXISTS (
  SELECT 1 FROM products
  WHERE name = p.name
);

-- ======================================
-- 6. INSERT ACTIVE POS SESSION
-- ======================================
WITH admin_user AS (SELECT id FROM users WHERE email = 'admin@restaurant.com')
INSERT INTO pos_sessions (opened_by, status)
SELECT id, 'open' FROM admin_user
WHERE NOT EXISTS (SELECT 1 FROM pos_sessions WHERE status = 'open')
ON CONFLICT DO NOTHING;

-- ======================================
-- 7. INSERT SAMPLE ORDERS WITH ITEMS
-- ======================================
-- Get required IDs
WITH ids AS (
  SELECT
    u_staff.id as staff_id,
    u_kitchen.id as kitchen_id,
    ps.id as session_id,
    t1.id as table_1_id,
    t2.id as table_2_id,
    cat_appetizer.id as appetizer_cat_id,
    cat_main.id as main_cat_id,
    p_samosa.id as samosa_id,
    p_paneer_tikka.id as paneer_tikka_id,
    p_butter_chicken.id as butter_chicken_id
  FROM 
    users u_staff,
    users u_kitchen,
    pos_sessions ps,
    tables t1,
    tables t2,
    categories cat_appetizer,
    categories cat_main,
    products p_samosa,
    products p_paneer_tikka,
    products p_butter_chicken
  WHERE u_staff.email = 'john@restaurant.com'
    AND u_kitchen.email = 'chef@restaurant.com'
    AND ps.status = 'open'
    AND t1.table_number = 1
    AND t2.table_number = 2
    AND cat_appetizer.name = 'Appetizers'
    AND cat_main.name = 'Main Courses'
    AND p_samosa.name = 'Samosa'
    AND p_paneer_tikka.name = 'Paneer Tikka'
    AND p_butter_chicken.name = 'Butter Chicken'
)

-- Insert Order 1 (Draft state - just created)
INSERT INTO orders (session_id, table_id, created_by, assigned_kitchen_user, status, notes, created_at)
SELECT session_id, table_1_id, staff_id, NULL, 'draft', 'No onion please', CURRENT_TIMESTAMP - INTERVAL '15 minutes'
FROM ids
WHERE NOT EXISTS (SELECT 1 FROM orders WHERE table_id = (SELECT id FROM tables WHERE table_number = 1) AND status = 'draft')
RETURNING id INTO TEMP temp_order_1;

-- Insert items for Order 1
WITH order_1 AS (SELECT id FROM orders WHERE table_id = (SELECT id FROM tables WHERE table_number = 1) AND status = 'draft' LIMIT 1),
ids2 AS (SELECT samosa_id, paneer_tikka_id FROM ids)
INSERT INTO order_items (order_id, product_id, quantity, price_at_time)
SELECT o.id, samosa_id, 2, 99.99 FROM order_1 o, ids2 WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE product_id = samosa_id AND order_id = o.id);

WITH order_1 AS (SELECT id FROM orders WHERE table_id = (SELECT id FROM tables WHERE table_number = 1) AND status = 'draft' LIMIT 1),
ids2 AS (SELECT paneer_tikka_id FROM ids)
INSERT INTO order_items (order_id, product_id, quantity, price_at_time)
SELECT o.id, paneer_tikka_id, 1, 199.99 FROM order_1 o, ids2 WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE product_id = paneer_tikka_id AND order_id = o.id);

-- Update Order 1 total price
UPDATE orders SET total_price = 399.97 WHERE table_id = (SELECT id FROM tables WHERE table_number = 1) AND status = 'draft';

-- Insert Order 2 (In preparation - being cooked)
INSERT INTO orders (session_id, table_id, created_by, assigned_kitchen_user, status, created_at, started_at)
SELECT session_id, table_2_id, staff_id, kitchen_id, 'preparing', CURRENT_TIMESTAMP - INTERVAL '25 minutes', CURRENT_TIMESTAMP - INTERVAL '10 minutes'
FROM ids
WHERE NOT EXISTS (SELECT 1 FROM orders WHERE table_id = (SELECT id FROM tables WHERE table_number = 2) AND status = 'preparing')
RETURNING id INTO TEMP temp_order_2;

-- Insert items for Order 2
WITH order_2 AS (SELECT id FROM orders WHERE table_id = (SELECT id FROM tables WHERE table_number = 2) AND status = 'preparing' LIMIT 1),
ids2 AS (SELECT butter_chicken_id FROM ids)
INSERT INTO order_items (order_id, product_id, quantity, price_at_time)
SELECT o.id, butter_chicken_id, 1, 449.99 FROM order_2 o, ids2 WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE product_id = butter_chicken_id AND order_id = o.id);

-- Update Order 2 total price
UPDATE orders SET total_price = 449.99 WHERE table_id = (SELECT id FROM tables WHERE table_number = 2) AND status = 'preparing';

-- Update table statuses
UPDATE tables SET status = 'occupied' WHERE table_number IN (1, 2);

-- ======================================
-- 8. VERIFY DATA INSERTION
-- ======================================
SELECT 'Users inserted' as check_item, COUNT(*) as count FROM users
UNION ALL
SELECT 'Floors inserted', COUNT(*) FROM floors
UNION ALL
SELECT 'Tables inserted', COUNT(*) FROM tables
UNION ALL
SELECT 'Categories inserted', COUNT(*) FROM categories
UNION ALL
SELECT 'Products inserted', COUNT(*) FROM products
UNION ALL
SELECT 'Sessions created', COUNT(*) FROM pos_sessions
UNION ALL
SELECT 'Orders created', COUNT(*) FROM orders
UNION ALL
SELECT 'Order items created', COUNT(*) FROM order_items;
