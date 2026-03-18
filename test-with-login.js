// test-with-login.js
const axios = require('axios');
require('dotenv').config();

(async () => {
  try {
    // Step 1: Login
    console.log('\n🔐 Step 1: Login...');
    const loginRes = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'user@example.com',
      password: 'password123'
    });
    
    const token = loginRes.data.data.token;
    const userId = loginRes.data.data.user.id;
    console.log(`✅ Login successful! Token: ${token.slice(0, 20)}...`);
    console.log(`   User ID: ${userId}`);
    
    // Step 2: Get user orders
    console.log('\n📋 Step 2: Get user orders...');
    const ordersRes = await axios.get('http://localhost:3000/api/orders/history', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log(`✅ Got ${ordersRes.data.data.length} orders`);
    
    if (ordersRes.data.data.length > 0) {
      const firstOrder = ordersRes.data.data[0];
      const orderId = firstOrder.order_id;
      console.log(`   First order: ${orderId}`);
      console.log(`   Status: ${firstOrder.status}`);
      console.log(`   Has account_details:`, !!firstOrder.account_details);
      
      // Step 3: Test account-details endpoint
      console.log(`\n🔍 Step 3: Test /api/orders/${orderId}/account-details...`);
      try {
        const detailsRes = await axios.get(`http://localhost:3000/api/orders/${orderId}/account-details`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log(`✅ Success!`);
        console.log(`📦 Response:`, JSON.stringify(detailsRes.data, null, 2));
      } catch (detailsErr) {
        console.log(`❌ Error: ${detailsErr.response?.status}`);
        console.log(`📦 Response:`, JSON.stringify(detailsErr.response?.data, null, 2));
        console.log(`\n⚠️ Error message: ${detailsErr.message}`);
      }
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    if (error.response?.data) {
      console.log(`📦 Response:`, JSON.stringify(error.response.data, null, 2));
    }
  }
})();
