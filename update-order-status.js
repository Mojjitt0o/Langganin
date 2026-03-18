// update-order-status.js
const db = require('./config/database');
require('dotenv').config();

(async () => {
  try {
    const orderId = 'RBHN-20260318-C63CFA';
    
    console.log(`\n🔄 Updating order status to 'done'...`);
    
    const [result] = await db.query(
      `UPDATE orders SET status = 'done' WHERE order_id = $1 RETURNING *`,
      [orderId]
    );
    
    if (result.length === 0) {
      console.log('❌ Order not found');
      process.exit(1);
    }
    
    const order = result[0];
    console.log(`✅ Order status updated!`);
    console.log(`   Order ID: ${order.order_id}`);
    console.log(`   New Status: ${order.status}`);
    console.log(`   Has Account Details: ${!!order.account_details}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
