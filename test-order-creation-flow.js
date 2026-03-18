/**
 * 🧪 Test Order Creation Flow
 * 
 * Simulates the exact flow ketika user membuat order:
 * 1. Call /order endpoint ke WR API
 * 2. Save ke database
 * 3. Auto-fetch account details
 */

require('dotenv').config();
const axios = require('axios');

async function testOrderCreationFlow() {
    console.log('🧪 Testing WR API /order Endpoint Flow\n');
    console.log('📍 Configuration:');
    console.log(`   API URL: ${process.env.WR_API_URL}`);
    console.log(`   API Key: ${process.env.WR_API_KEY?.substring(0, 15)}...`);
    console.log('');

    // Test 1: Sandbox mode (free test, no balance deduction)
    console.log('═══════════════════════════════════════════════════');
    console.log('TEST 1: Sandbox Mode (is_test: true)');
    console.log('═══════════════════════════════════════════════════\n');

    const sandboxPayload = {
        api_key: process.env.WR_API_KEY,
        variant_id: "v-canva-pro-member",  // Use any valid variant ID
        quantity: 1,
        is_test: true  // ← SANDBOX MODE: no balance deduction
    };

    console.log('📤 Payload:');
    console.log(JSON.stringify(sandboxPayload, null, 2));
    console.log('');

    try {
        console.log('📡 Sending request to /order endpoint...');
        const startTime = Date.now();
        
        const response = await axios.post(
            `${process.env.WR_API_URL}/order`,
            sandboxPayload,
            { 
                timeout: 30000,
                headers: { 'Content-Type': 'application/json' }
            }
        );

        const duration = Date.now() - startTime;
        console.log(`✅ Success! (${duration}ms)\n`);

        console.log('📊 Response:');
        console.log(JSON.stringify(response.data, null, 2));
        console.log('');

        if (response.data.success && response.data.data) {
            const order = response.data.data;
            console.log('✅ Order Created Successfully:');
            console.log(`   Order ID: ${order.order_id}`);
            console.log(`   Status: ${order.status}`);
            console.log(`   Total: Rp ${order.total_amount?.toLocaleString('id-ID')}`);
            console.log(`   Balance: Rp ${order.current_balance?.toLocaleString('id-ID')}`);
            console.log(`   Is Test: ${order.is_test}`);
            console.log('');
            
            // Now perform /transactions to fetch details
            console.log('═══════════════════════════════════════════════════');
            console.log('TEST 2: Fetch Transactions to Get Account Details');
            console.log('═══════════════════════════════════════════════════\n');
            
            console.log('📤 Fetching all orders via /transactions...');
            const txStartTime = Date.now();
            
            const txResponse = await axios.post(
                `${process.env.WR_API_URL}/transactions`,
                { api_key: process.env.WR_API_KEY },
                { timeout: 30000 }
            );
            
            const txDuration = Date.now() - txStartTime;
            console.log(`✅ Success! (${txDuration}ms)\n`);
            
            // Find our order
            const createdOrder = txResponse.data.data?.find(o => o.order_id === order.order_id);
            
            if (createdOrder) {
                console.log('✅ Order Found in /transactions Response:');
                console.log(`   Order ID: ${createdOrder.order_id}`);
                console.log(`   Status: ${createdOrder.status}`);
                console.log(`   Has account_details: ${!!createdOrder.account_details}`);
                
                if (createdOrder.account_details) {
                    console.log('   ✅ Account Details Available:');
                    if (Array.isArray(createdOrder.account_details)) {
                        createdOrder.account_details.forEach((item, idx) => {
                            console.log(`       [${idx}] ${item.product}`);
                            if (item.details && Array.isArray(item.details)) {
                                item.details.forEach(detail => {
                                    console.log(`           - ${detail.title}`);
                                    if (detail.credentials && Array.isArray(detail.credentials)) {
                                        detail.credentials.forEach(cred => {
                                            console.log(`             • ${cred.label}: ${cred.value?.substring(0, 20)}${cred.value?.length > 20 ? '...' : ''}`);
                                        });
                                    }
                                });
                            }
                        });
                    }
                    console.log('');
                    console.log('📋 Full account_details:');
                    console.log(JSON.stringify(createdOrder.account_details, null, 2).substring(0, 1000));
                } else {
                    console.log('   ⏳ Account details not ready yet (WR is still processing)');
                    console.log('      Our auto-fetch task will retry every 15s until found');
                }
            } else {
                console.log('⚠️  Order not found in /transactions yet (WR might be still processing)');
                console.log(`   Created Order ID: ${order.order_id}`);
                console.log(`   Total orders in response: ${txResponse.data.data?.length || 0}`);
            }
        }
    } catch (error) {
        console.error(`\n❌ ERROR!\n`);
        
        if (error.response) {
            console.error(`HTTP ${error.response.status}: ${error.response.statusText}`);
            console.error(`Message: ${error.response.data?.message || 'No message'}`);
            console.error(`Data: ${JSON.stringify(error.response.data).substring(0, 800)}`);
            
            if (error.response.status === 403) {
                console.error('\n🔒 BLOCKED: IP not whitelisted');
                console.error('   Action: Contact WR Support with your IP address');
            }
        } else if (error.code === 'ENOTFOUND') {
            console.error(`❌ DNS Error: Cannot resolve ${process.env.WR_API_URL}`);
        } else if (error.code === 'ECONNREFUSED') {
            console.error(`❌ Connection Refused: Cannot connect to ${process.env.WR_API_URL}`);
        } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
            console.error(`⏱️ Timeout after ${error.config?.timeout}ms`);
        } else {
            console.error(`Error: ${error.message}`);
            console.error(`Code: ${error.code}`);
        }
    }
    
    console.log('\n═══════════════════════════════════════════════════');
    console.log('TEST COMPLETE');
    console.log('═══════════════════════════════════════════════════');
}

testOrderCreationFlow().catch(console.error).finally(() => process.exit(0));
