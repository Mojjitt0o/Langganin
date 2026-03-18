require('dotenv').config();
const { query: db_query, pool } = require('./config/database');

async function debugOrder() {
    try {
        console.log('🔍 Debugging Order: RBHN-20260318-A2981E\n');
        
        const [orders] = await db_query(
            `SELECT 
                id,
                order_id,
                user_id,
                status,
                account_details,
                created_at,
                updated_at
            FROM orders 
            WHERE order_id = $1
            LIMIT 1`,
            ['RBHN-20260318-A2981E']
        );

        if (!orders || orders.length === 0) {
            console.log('❌ Order not found in database!\n');
            process.exit(1);
        }

        const order = orders[0];
        console.log('✅ Order Found:\n');
        console.log(`  Order ID: ${order.order_id}`);
        console.log(`  User ID: ${order.user_id}`);
        console.log(`  Status: ${order.status}`);
        console.log(`  Created: ${order.created_at}`);
        console.log(`  Updated: ${order.updated_at}`);
        console.log('');

        if (order.account_details) {
            console.log('✅ Account Details FOUND in Database:');
            console.log('-'.repeat(50));
            console.log(JSON.stringify(order.account_details, null, 2));
            console.log('-'.repeat(50));
        } else {
            console.log('❌ Account Details NOT FOUND in Database (NULL)');
            console.log('   This means /transactions fetch failed or webhook didn\'t save it');
        }

        console.log('\n🔍 Next: Checking /transactions endpoint for this order...\n');

        // Check /transactions endpoint
        const axios = require('axios');
        try {
            const txResponse = await axios.post(
                `${process.env.WR_API_URL}/transactions`,
                { api_key: process.env.WR_API_KEY },
                { timeout: 30000 }
            );

            const wrOrder = txResponse.data.data?.find(o => o.order_id === order.order_id);
            
            if (wrOrder) {
                console.log('✅ Order Found in /transactions:\n');
                console.log(`  Order ID: ${wrOrder.order_id}`);
                console.log(`  Status: ${wrOrder.status}`);
                console.log(`  Has account_details: ${!!wrOrder.account_details}`);
                
                if (wrOrder.account_details) {
                    console.log('\n✅ Account Details in WR /transactions:');
                    console.log('-'.repeat(50));
                    console.log(JSON.stringify(wrOrder.account_details, null, 2));
                    console.log('-'.repeat(50));
                    
                    // Check format
                    if (Array.isArray(wrOrder.account_details)) {
                        console.log('\n✅ Format: ARRAY (correct!)');
                    } else {
                        console.log('\n⚠️  Format: OBJECT');
                    }
                } else {
                    console.log('\n❌ No account_details in WR /transactions');
                }
            } else {
                console.log('❌ Order NOT found in /transactions');
                console.log(`   Total orders from WR: ${txResponse.data.data?.length || 0}`);
            }
        } catch (err) {
            console.error('❌ /transactions request failed:', err.message);
        }

        console.log('\n');
        console.log('═'.repeat(50));
        console.log('SUMMARY');
        console.log('═'.repeat(50));
        
        if (order.account_details) {
            console.log('✅ Data sudah tersimpan di database');
            console.log('   Check: Frontend query endpoint /api/orders/{id}/account-details');
        } else {
            console.log('❌ Data TIDAK tersimpan di database');
            console.log('   Possible causes:');
            console.log('   1. Background task tidak fetch');
            console.log('   2. Webhook tidak kirim data');
            console.log('   3. Fetch gagal, retry berhenti');
            console.log('   4. Data disimpan dengan format salah');
        }
        
    } catch (error) {
        console.error('Database error:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

debugOrder();
