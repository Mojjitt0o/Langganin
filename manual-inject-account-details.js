// manual-inject-account-details.js
const db = require('./config/database');
const jwt = require('jsonwebtoken');
const axios = require('axios');
require('dotenv').config();

(async () => {
  try {
    const orderId = 'RBHN-20260318-C63CFA';
    const testAccountDetails = {
      "Email": "test-account@example.com",
      "Password": "Test123!@#",
      "Akses": "www.platform.com/login"
    };
    
    console.log(`\n💉 Injecting account details for order ${orderId}...`);
    console.log(`   Account Details:`, JSON.stringify(testAccountDetails, null, 2));
    
    // Get an admin user token for the API call
    const adminUser = 1; // Admin user ID
    const token = jwt.sign({ id: adminUser, email: 'admin@example.com' }, process.env.JWT_SECRET);
    
    // Call the existing saveAccountDetails endpoint
    console.log(`\n🔄 Calling POST /api/orders/${orderId}/account-details...`);
    const response = await axios.post(
      `http://localhost:3000/api/orders/${orderId}/account-details`,
      { account_details: testAccountDetails },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log(`✅ Success!`);
    console.log(`📦 Response:`, JSON.stringify(response.data, null, 2));
    
    // Verify in database
    console.log(`\n🔍 Verifying in database...`);
    const [orders] = await db.query(
      'SELECT account_details, status FROM orders WHERE order_id = $1',
      [orderId]
    );
    
    if (orders.length > 0) {
      console.log(`✅ Order found:`);
      console.log(`   Status: ${orders[0].status}`);
      console.log(`   Account Details:`, orders[0].account_details);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    process.exit(1);
  }
})();
