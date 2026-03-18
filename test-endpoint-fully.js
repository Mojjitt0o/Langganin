// test-endpoint-fully.js
const axios = require('axios');
const db = require('./config/database');
require('dotenv').config();

(async () => {
  try {
    // Step 1: Get user and create password for testing
    console.log('\n👤 Getting user credentials...');
    const [users] = await db.query('SELECT id, email FROM users WHERE id = 2 LIMIT 1');
    const user = users[0];
    
    if (!user) {
      console.log('❌ User not found!');
      process.exit(1);
    }
    
    console.log(`✅ Found user: ${user.email} (ID: ${user.id})`);
    
    // Step 2: Create a token directly (bypass password check)
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET);
    console.log(`✅ Generated token: ${token.slice(0, 20)}...`);
    
    // Step 3: Get one of their orders
    console.log('\n📋 Getting order for this user...');
    const [orders] = await db.query(
      'SELECT order_id FROM orders WHERE user_id = $1 LIMIT 1',
      [user.id]
    );
    const orderId = orders[0]?.order_id;
    
    if (!orderId) {
      console.log('❌ No orders found for this user!');
      process.exit(1);
    }
    
    console.log(`✅ Order ID: ${orderId}`);
    
    // Step 4: Test the endpoint
    console.log(`\n🔍 Testing /api/orders/${orderId}/account-details...`);
    try {
      const response = await axios.get(`http://localhost:3000/api/orders/${orderId}/account-details`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log(`✅ Success! Status: ${response.status}`);
      console.log(`📦 Response:`, JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.log(`❌ Error! Status: ${error.response?.status || 'Network Error'}`);
      console.log(`📦 Response:`, error.response?.data || error.message);
      console.log(`\n⚠️ Error message: ${error.message}`);
      
      // Try to get more details
      if (error.response?.data) {
        console.log(`\n📋 Full response body:`, error.response.data);
      }
    }
    
    // Step 5: Also test the problem order
    console.log(`\n\n🔍 Testing problem order: RBHN-20260318-C63CFA...`);
    try {
      const response = await axios.get(`http://localhost:3000/api/orders/RBHN-20260318-C63CFA/account-details`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log(`✅ Success! Status: ${response.status}`);
      console.log(`📦 Response:`, JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.log(`❌ Error! Status: ${error.response?.status}`);
      console.log(`📦 Response:`, JSON.stringify(error.response?.data, null, 2));
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
