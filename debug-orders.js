const db = require('./config/database');

(async () => {
  try {
    const [orders] = await db.query(
      'SELECT order_id, user_id, status, account_details FROM orders WHERE account_details IS NOT NULL LIMIT 3'
    );
    
    console.log('Orders with account_details:');
    for (const order of orders) {
      console.log(`\nOrder ID: ${order.order_id}`);
      console.log(`User ID: ${order.user_id}`);
      
      if (order.user_id) {
        const [users] = await db.query('SELECT id, email, username FROM users WHERE id = $1', [order.user_id]);
        console.log(`User: ${users[0]?.username} (${users[0]?.email})`);
      }
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
