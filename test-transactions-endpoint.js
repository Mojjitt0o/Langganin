require('dotenv').config();
const axios = require('axios');

// Test /transactions endpoint directly
async function testTransactionsEndpoint() {
    console.log('🧪 Testing WR API /transactions endpoint...\n');
    
    const WR_API_URL = process.env.WR_API_URL || 'https://warungrebahan.com/api/v1';
    const WR_API_KEY = process.env.WR_API_KEY;
    
    if (!WR_API_KEY) {
        console.error('❌ WR_API_KEY not set in .env');
        process.exit(1);
    }
    
    console.log(`📍 API URL: ${WR_API_URL}`);
    console.log(`🔑 API Key: ${WR_API_KEY.substring(0, 10)}...`);
    console.log('');
    
    try {
        console.log('📤 Sending POST request to /transactions...');
        const startTime = Date.now();
        
        const response = await axios.post(`${WR_API_URL}/transactions`, {
            api_key: WR_API_KEY
        }, { 
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const duration = Date.now() - startTime;
        
        console.log(`\n✅ SUCCESS! (${duration}ms)\n`);
        console.log('📊 Response:');
        console.log(`  - success: ${response.data.success}`);
        console.log(`  - message: ${response.data.message}`);
        console.log(`  - total orders: ${response.data.data ? response.data.data.length : 0}`);
        
        if (response.data.data && response.data.data.length > 0) {
            console.log('\n📋 Orders found:');
            response.data.data.forEach((order, idx) => {
                console.log(`\n  Order ${idx + 1}:`);
                console.log(`    - Order ID: ${order.order_id || order.id || 'N/A'}`);
                console.log(`    - Status: ${order.status}`);
                console.log(`    - Has account_details: ${!!order.account_details}`);
                if (order.account_details) {
                    console.log(`    - Account details type: ${Array.isArray(order.account_details) ? 'ARRAY' : 'OBJECT'}`);
                    if (Array.isArray(order.account_details) && order.account_details.length > 0) {
                        console.log(`    - Credentials found: ${order.account_details[0]?.product || 'unknown'}`);
                    }
                }
            });
            
            // Show first order details
            if (response.data.data[0]) {
                console.log('\n📄 First order full details:');
                console.log(JSON.stringify(response.data.data[0], null, 2).substring(0, 1500));
            }
        } else {
            console.log('\n⚠️  No orders found in response');
        }
        
    } catch (error) {
        console.error(`\n❌ ERROR!\n`);
        
        if (error.response) {
            console.error(`HTTP ${error.response.status}: ${error.response.statusText}`);
            console.error(`Message: ${error.response.data?.message || 'No message'}`);
            console.error(`Data: ${JSON.stringify(error.response.data).substring(0, 500)}`);
        } else if (error.code === 'ENOTFOUND') {
            console.error(`❌ DNS Error: Cannot resolve ${WR_API_URL}`);
        } else if (error.code === 'ECONNREFUSED') {
            console.error(`❌ Connection Refused: Cannot connect to ${WR_API_URL}`);
        } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
            console.error(`⏱️ Timeout after ${error.config?.timeout}ms`);
        } else {
            console.error(`Error: ${error.message}`);
            console.error(`Code: ${error.code}`);
        }
        
        process.exit(1);
    }
}

// Run test
testTransactionsEndpoint().catch(console.error).finally(() => process.exit(0));
