// debug-order-creation.js
const db = require('./config/database');
const axios = require('axios');
require('dotenv').config();

(async () => {
  try {
    const orderId = 'RBHN-20260318-C63CFA';
    
    // Step 1: Check order in our database
    console.log(`\n📋 Step 1: Check order ${orderId} in our DB...`);
    const [orders] = await db.query(
      'SELECT * FROM orders WHERE order_id = $1',
      [orderId]
    );
    
    if (orders.length === 0) {
      console.log('❌ Order not found in our database!');
      process.exit(1);
    }
    
    const order = orders[0];
    console.log('✅ Order found in DB:');
    console.log(`   - Status: ${order.status}`);
    console.log(`   - WR Order ID: ${order.wr_order_id}`);
    console.log(`   - Created: ${order.created_at}`);
    console.log(`   - Account Details: ${order.account_details ? 'YES' : 'NO'}`);
    console.log(`   - WR Response: ${order.wr_response ? 'YES' : 'NO'}`);
    
    // Step 2: Check what WR ID we used
    if (!order.wr_order_id) {
      console.log('\n⚠️  WARNING: No WR Order ID stored! Order might not have been sent to WR.');
      console.log('   Checking WR Response field...');
      if (order.wr_response) {
        try {
          const wrData = typeof order.wr_response === 'string' ? JSON.parse(order.wr_response) : order.wr_response;
          console.log('   WR Response:', JSON.stringify(wrData, null, 2));
        } catch (e) {
          console.log('   Raw WR Response:', order.wr_response);
        }
      }
    }
    
    // Step 3: Try querying WR's /transactions endpoint
    console.log(`\n🔄 Step 2: Query WR /transactions endpoint...`);
    try {
      const wrRes = await axios.post(`${process.env.WR_API_URL}/transactions`, {
        api_key: process.env.WR_API_KEY
      }, { timeout: 10000 });
      
      console.log(`✅ Got WR transactions list`);
      console.log(`   Total transactions: ${wrRes.data.data?.length || 0}`);
      
      // Find our order in WR's list
      const ourOrder = wrRes.data.data?.find(t => 
        t.order_id === orderId || 
        t.order_id === order.wr_order_id
      );
      
      if (ourOrder) {
        console.log(`\n✅ Found order in WR system!`);
        console.log('   Status:', ourOrder.status);
        console.log('   Account Details:', !!ourOrder.account_details ? 'YES' : 'NO');
        if (ourOrder.account_details) {
          console.log('   Details:', JSON.stringify(ourOrder.account_details).substring(0, 200));
        }
      } else {
        console.log(`\n⚠️  Order ${orderId} NOT found in WR's transaction list!`);
        console.log('   This means order was not successfully sent to WR or created there.');
      }
    } catch (err) {
      console.log(`❌ Error querying WR /transactions: ${err.message}`);
    }
    
    // Step 4: Try querying WR's /order/detail endpoint directly
    console.log(`\n🔍 Step 3: Query WR /order/detail endpoint...`);
    try {
      const wrDetail = await axios.post(`${process.env.WR_API_URL}/order/detail`, {
        api_key: process.env.WR_API_KEY,
        order_id: orderId
      }, { timeout: 10000 });
      
      console.log(`✅ WR /order/detail response:`, JSON.stringify(wrDetail.data, null, 2));
    } catch (err) {
      console.log(`❌ WR /order/detail error: ${err.response?.status || err.code}`);
      console.log(`   Message: ${err.response?.data?.message || err.message}`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
