// check-user-and-order.js
const db = require('./config/database');
require('dotenv').config();

(async () => {
  try {
    // Step 1: Get any user
    console.log('\n👥 Fetching users...');
    const [users] = await db.query(
      'SELECT id, username, email, is_admin FROM users LIMIT 5'
    );
    console.log(`Found ${users.length} users:`);
    users.forEach(u => {
      console.log(`  - User ID: ${u.id}, Email: ${u.email}, Admin: ${u.is_admin}`);
    });
    
    if (users.length === 0) {
      console.log('❌ No users found!');
      process.exit(1);
    }
    
    // Step 2: Get order for that user
    const firstUser = users[0];
    console.log(`\n📋 Fetching orders for user ${firstUser.id}...`);
    const [orders] = await db.query(
      'SELECT order_id, status, user_id, account_details FROM orders WHERE user_id = $1 LIMIT 5',
      [firstUser.id]
    );
    console.log(`Found ${orders.length} orders for user ${firstUser.id}:`);
    orders.forEach(o => {
      const hasDetails = !!o.account_details;
      console.log(`  - Order: ${o.order_id}, Status: ${o.status}, Has Details: ${hasDetails}`);
      if (hasDetails) {
        const details = typeof o.account_details === 'string' ? JSON.parse(o.account_details) : o.account_details;
        console.log(`    Details:`, JSON.stringify(details).substring(0, 100));
      }
    });
    
    // Step 3: Get ANY order (from any user)
    console.log(`\n🔍 Fetching any order with account_details...`);
    const [ordersWithDetails] = await db.query(
      'SELECT order_id, status, user_id, account_details FROM orders WHERE account_details IS NOT NULL AND account_details != \'{}\' LIMIT 3'
    );
    console.log(`Found ${ordersWithDetails.length} orders with account_details:`);
    ordersWithDetails.forEach(o => {
      console.log(`  - Order: ${o.order_id}, Status: ${o.status}, User ID: ${o.user_id}`);
      const details = typeof o.account_details === 'string' ? JSON.parse(o.account_details) : o.account_details;
      console.log(`    Details type: ${typeof details}, is array: ${Array.isArray(details)}`);
      console.log(`    Details:`, JSON.stringify(details).substring(0, 150));
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
