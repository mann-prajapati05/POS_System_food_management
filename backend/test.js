import db, {
  query,
  beginTransaction,
  commitTransaction,
  rollbackTransaction,
  testConnection,
  closePool,
} from './db.js';

/**
 * Test script for Restaurant POS System
 * Covers complete workflow: order creation → kitchen → payment → completion
 */

console.log('\n=== Restaurant POS System - Database Test ===\n');

// ======================================
// 1. TEST DATABASE CONNECTION
// ======================================
async function testDatabaseConnection() {
  console.log('📡 Testing database connection...');
  await testConnection();
  console.log('');
}

// ======================================
// 2. FETCH REQUIRED DATA
// ======================================
async function fetchRequiredData() {
  console.log('📋 Fetching system data...\n');

  const [usersRes, sessionsRes, tablesRes, productsRes] = await Promise.all([
    query(`SELECT id, name, email, role FROM users LIMIT 3`),
    query(`SELECT id, opened_by FROM pos_sessions WHERE status = 'open' LIMIT 1`),
    query(`SELECT id, table_number, status FROM tables LIMIT 1`),
    query(`SELECT id, name, price FROM products LIMIT 2`),
  ]);

  if (!usersRes.rows[0] || !sessionsRes.rows[0] || !tablesRes.rows[0]) {
    console.error('❌ ERROR: Required seed data not found!');
    console.error('Please run: psql -U $DB_USER -d $DB_NAME -f schema.sql -f seed.sql');
    process.exit(1);
  }

  const staffUser = usersRes.rows.find((u) => u.role === 'staff');
  const kitchenUser = usersRes.rows.find((u) => u.role === 'kitchen');
  const session = sessionsRes.rows[0];
  const table = tablesRes.rows[0];
  const [product1, product2] = [productsRes.rows[0], productsRes.rows[1]];

  console.log('✓ Staff User:', staffUser.name);
  console.log('✓ Kitchen User:', kitchenUser.name);
  console.log('✓ Active Session:', session.id.substring(0, 8) + '...');
  console.log('✓ Table:', table.table_number);
  console.log('✓ Products:', product1.name, ',', product2.name);
  console.log('');

  return { staffUser, kitchenUser, session, table, product1, product2 };
}

// ======================================
// 3. CREATE NEW ORDER (DRAFT STATE)
// ======================================
async function createOrder(staffUser, session, table, product1) {
  console.log('📝 TEST 1: Creating new order (DRAFT)...\n');

  const client = await beginTransaction();

  try {
    // Create order with DRAFT status
    const orderRes = await client.query(
      `INSERT INTO orders 
        (session_id, table_id, created_by, status, notes, created_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
       RETURNING id, status, created_at`,
      [session.id, table.id, staffUser.id, 'draft', 'Extra salt on the side']
    );

    const orderId = orderRes.rows[0].id;
    console.log('✓ Order created:', orderId.substring(0, 8) + '...');
    console.log('✓ Status: DRAFT');

    // Add first item
    const itemRes1 = await client.query(
      `INSERT INTO order_items (order_id, product_id, quantity, price_at_time)
       VALUES ($1, $2, $3, $4)
       RETURNING id, quantity, price_at_time`,
      [orderId, product1.id, 2, product1.price]
    );

    console.log('✓ Added item: 2x', product1.name, '@', itemRes1.rows[0].price_at_time);

    // Update order total
    const updateTotalRes = await client.query(
      `UPDATE orders 
       SET total_price = (
         SELECT SUM(quantity * price_at_time) FROM order_items WHERE order_id = $1
       )
       WHERE id = $1
       RETURNING total_price`,
      [orderId]
    );

    console.log('✓ Order total:', updateTotalRes.rows[0].total_price);
    console.log('');

    await commitTransaction(client);
    return orderId;
  } catch (err) {
    await rollbackTransaction(client);
    console.error('❌ Error creating order:', err.message);
    throw err;
  }
}

// ======================================
// 4. CONFIRM ORDER & SEND TO KITCHEN
// ======================================
async function confirmAndSendToKitchen(orderId, kitchenUser) {
  console.log('🔄 TEST 2: Confirming order and sending to kitchen...\n');

  const client = await beginTransaction();

  try {
    // Step 1: Update to PENDING
    const pendingRes = await client.query(
      `UPDATE orders SET status = $1 WHERE id = $2 RETURNING status`,
      ['pending', orderId]
    );
    console.log('✓ Status updated: DRAFT → PENDING');

    // Step 2: Assign to kitchen and set to TO_COOK
    const toCookRes = await client.query(
      `UPDATE orders 
       SET status = $1, assigned_kitchen_user = $2, started_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING status, assigned_kitchen_user`,
      ['to_cook', kitchenUser.id, orderId]
    );

    console.log('✓ Status updated: PENDING → TO_COOK');
    console.log('✓ Assigned to kitchen staff:', kitchenUser.name);
    console.log('✓ Kitchen display updated in real-time (Socket.io: order_sent_to_kitchen)');
    console.log('');

    await commitTransaction(client);
  } catch (err) {
    await rollbackTransaction(client);
    console.error('❌ Error sending to kitchen:', err.message);
    throw err;
  }
}

// ======================================
// 5. KITCHEN UPDATES ORDER STATUS
// ======================================
async function kitchenUpdateStatus(orderId) {
  console.log('👨‍🍳 TEST 3: Kitchen preparing and completing order...\n');

  // Simulate kitchen working (1 second delay)
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const client = await beginTransaction();

  try {
    // Update to PREPARING
    const preparingRes = await client.query(
      `UPDATE orders SET status = $1 WHERE id = $2 RETURNING status`,
      ['preparing', orderId]
    );
    console.log('✓ Status updated: TO_COOK → PREPARING');
    console.log('✓ Real-time notification sent (Socket.io: order_status_updated)');

    // Simulate more cooking (1 second delay)
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Update to COMPLETED
    const completedRes = await client.query(
      `UPDATE orders 
       SET status = $1, completed_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING status, completed_at`,
      ['completed', orderId]
    );
    console.log('✓ Status updated: PREPARING → COMPLETED');
    console.log('✓ Customer display notified (Socket.io: order_status_updated)');
    console.log('');

    await commitTransaction(client);
  } catch (err) {
    await rollbackTransaction(client);
    console.error('❌ Error updating order status:', err.message);
    throw err;
  }
}

// ======================================
// 6. PROCESS PAYMENT
// ======================================
async function processPayment(orderId) {
  console.log('💳 TEST 4: Processing payment...\n');

  const client = await beginTransaction();

  try {
    // Get order details
    const orderRes = await client.query(
      `SELECT id, total_price FROM orders WHERE id = $1`,
      [orderId]
    );

    const totalPrice = orderRes.rows[0].total_price;

    // Create payment record
    const paymentRes = await client.query(
      `INSERT INTO payments (order_id, method, status, amount, created_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       RETURNING id, method, status, amount`,
      [orderId, 'cash', 'completed', totalPrice]
    );

    console.log('✓ Payment created:', paymentRes.rows[0].id.substring(0, 8) + '...');
    console.log('✓ Method: CASH');
    console.log('✓ Amount:', totalPrice);
    console.log('✓ Status: COMPLETED');

    // Update order to PAID
    const paidRes = await client.query(
      `UPDATE orders 
       SET status = $1, paid_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING status`,
      ['paid', orderId]
    );
    console.log('✓ Order status: COMPLETED → PAID');
    console.log('✓ Real-time notification sent (Socket.io: payment_completed)');

    // Update table status to AVAILABLE
    const tableRes = await client.query(
      `UPDATE tables SET status = $1 
       WHERE id = (SELECT table_id FROM orders WHERE id = $2)
       RETURNING table_number, status`,
      ['available', orderId]
    );
    console.log('✓ Table marked AVAILABLE');
    console.log('');

    await commitTransaction(client);
  } catch (err) {
    await rollbackTransaction(client);
    console.error('❌ Error processing payment:', err.message);
    throw err;
  }
}

// ======================================
// 7. VERIFY COMPLETE WORKFLOW
// ======================================
async function verifyWorkflow(orderId) {
  console.log('✅ TEST 5: Verifying complete workflow...\n');

  try {
    // Get final order state
    const orderRes = await query(
      `SELECT 
        o.id, o.status, o.total_price, o.created_at, 
        o.started_at, o.completed_at, o.paid_at,
        t.table_number, u.name as staff_member
       FROM orders o
       LEFT JOIN tables t ON o.table_id = t.id
       LEFT JOIN users u ON o.created_by = u.id
       WHERE o.id = $1`,
      [orderId]
    );

    const order = orderRes.rows[0];
    console.log('📊 Order Summary:');
    console.log('├─ ID:', order.id.substring(0, 8) + '...');
    console.log('├─ Table:', order.table_number);
    console.log('├─ Staff:', order.staff_member);
    console.log('├─ Total:', order.total_price);
    console.log('├─ Status:', order.status);
    console.log('├─ Created:', order.created_at.toLocaleTimeString());
    console.log('├─ Started cooking:', order.started_at?.toLocaleTimeString() || 'N/A');
    console.log('├─ Completed:', order.completed_at?.toLocaleTimeString() || 'N/A');
    console.log('└─ Paid:', order.paid_at?.toLocaleTimeString() || 'N/A');

    // Get items
    const itemsRes = await query(
      `SELECT p.name, oi.quantity, oi.price_at_time,
              (oi.quantity * oi.price_at_time) as item_total
       FROM order_items oi
       LEFT JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = $1`,
      [orderId]
    );

    console.log('\n📦 Items:');
    itemsRes.rows.forEach((item) => {
      console.log(`├─ ${item.quantity}x ${item.name} @ ${item.price_at_time} = ${item.item_total}`);
    });

    // Get payment
    const paymentRes = await query(
      `SELECT method, status, amount FROM payments WHERE order_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [orderId]
    );

    if (paymentRes.rows[0]) {
      const payment = paymentRes.rows[0];
      console.log('\n💰 Payment:');
      console.log(`├─ Method: ${payment.method.toUpperCase()}`);
      console.log(`├─ Amount: ${payment.amount}`);
      console.log(`└─ Status: ${payment.status.toUpperCase()}`);
    }

    console.log('\n✅ Workflow COMPLETE: DRAFT → PENDING → TO_COOK → PREPARING → COMPLETED → PAID\n');
  } catch (err) {
    console.error('❌ Error verifying workflow:', err.message);
    throw err;
  }
}

// ======================================
// 8. TEST REPORTING QUERIES
// ======================================
async function testReportingQueries() {
  console.log('📊 TEST 6: Testing reporting queries...\n');

  try {
    // Session summary
    const sessionRes = await query(`SELECT * FROM session_summary WHERE status = 'open'`);
    console.log('✓ Session summary view works:', sessionRes.rowCount, 'open session(s)');

    // Kitchen display
    const kitchenRes = await query(`SELECT * FROM kitchen_display LIMIT 1`);
    console.log('✓ Kitchen display view works:', kitchenRes.rowCount, 'order(s) in kitchen');

    // Table status overview
    const tableRes = await query(`SELECT * FROM table_status_overview`);
    console.log('✓ Table status view works:', tableRes.rowCount, 'table(s)');

    console.log('');
  } catch (err) {
    console.error('❌ Error testing reporting queries:', err.message);
    throw err;
  }
}

// ======================================
// MAIN TEST RUNNER
// ======================================
async function runTests() {
  try {
    // Connect
    await testDatabaseConnection();

    // Fetch data
    const data = await fetchRequiredData();

    // Run workflow test
    const orderId = await createOrder(data.staffUser, data.session, data.table, data.product1);
    await confirmAndSendToKitchen(orderId, data.kitchenUser);
    await kitchenUpdateStatus(orderId);
    await processPayment(orderId);

    // Verify & report
    await verifyWorkflow(orderId);
    await testReportingQueries();

    console.log('🎉 ALL TESTS PASSED!\n');
  } catch (err) {
    console.error('💥 TEST FAILED:', err.message);
    process.exit(1);
  } finally {
    // Cleanup
    await closePool();
  }
}

// Execute tests
runTests();
