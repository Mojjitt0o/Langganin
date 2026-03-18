// test-account-details-endpoint.js
const axios = require('axios');
require('dotenv').config();

const testOrderId = 'RBHN-20260318-C63CFA';
const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwiZW1haWwiOiJ1c2VyQGV4YW1wbGUuY29tIiwiaWF0IjoxNzM5NjI5Mjg3fQ.3CsqbHmWqL1B_Rl_FqJvkC0NZ00kzLYiLnUDOOT3O4E';

(async () => {
  try {
    console.log(`\n📍 Testing: /api/orders/${testOrderId}/account-details`);
    console.log(`🔑 Token: ${testToken.slice(0, 20)}...`);
    
    const response = await axios.get(`http://localhost:3000/api/orders/${testOrderId}/account-details`, {
      headers: {
        'Authorization': `Bearer ${testToken}`
      }
    });
    
    console.log(`✅ Status: ${response.status}`);
    console.log(`📦 Response:`, JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log(`❌ Error: ${error.response?.status || error.code}`);
    console.log(`📦 Response:`, JSON.stringify(error.response?.data, null, 2));
    console.log(`\n⚠️ Error message: ${error.message}`);
    if (error.response?.data) {
      console.log(`\n📋 Full error response:`, error.response.data);
    }
  }
})();
