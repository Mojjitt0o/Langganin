// verify_db.js - Check account details in database
const db = require('./config/database');
const logger = require('./services/logger');

async function verifyOrders() {
    try {
        console.log('\n' + '='.repeat(70));
        console.log('DATABASE VERIFICATION - ACCOUNT DETAILS CHECK');
        console.log('='.repeat(70));
        
        // Get recent orders from test user (ID: 2)
        console.log('\nFetching recent orders from test user (ID: 2)...\n');
        
        const query = `
            SELECT 
                o.order_id,
                o.user_id,
                o.status,
                o.payment_status,
                o.account_details,
                p.name as product_name,
                pv.name as variant_name,
                o.created_at,
                o.updated_at
            FROM orders o
            LEFT JOIN product_variants pv ON o.variant_id = pv.id
            LEFT JOIN products p ON pv.product_id = p.id
            WHERE o.user_id = 2
            ORDER BY o.created_at DESC
            LIMIT 10
        `;
        
        const [orders] = await db.query(query);
        
        if (!orders || orders.length === 0) {
            console.log('⚠️  No orders found for test user');
            return;
        }
        
        console.log(`✅ Found ${orders.length} orders\n`);
        
        // Display orders
        orders.forEach((order, idx) => {
            console.log(`[Order ${idx + 1}]`);
            console.log(`  Order ID: ${order.order_id}`);
            console.log(`  Product: ${order.product_name} - ${order.variant_name}`);
            console.log(`  Status: ${order.status}`);
            console.log(`  Payment Status: ${order.payment_status}`);
            console.log(`  Created: ${order.created_at}`);
            console.log(`  Updated: ${order.updated_at}`);
            
            // Check account details
            if (order.account_details) {
                console.log(`  ✅ Account Details: FOUND`);
                try {
                    const details = typeof order.account_details === 'string' 
                        ? JSON.parse(order.account_details) 
                        : order.account_details;
                    
                    console.log(`  Details content:`);
                    Object.entries(details).forEach(([key, value]) => {
                        console.log(`    - ${key}: ${value}`);
                    });
                } catch (e) {
                    console.log(`  Raw details: ${JSON.stringify(order.account_details)}`);
                }
            } else {
                console.log(`  ❌ Account Details: EMPTY/NULL`);
            }
            console.log('');
        });
        
        // Summary
        console.log('='.repeat(70));
        console.log('SUMMARY');
        console.log('='.repeat(70));
        
        const ordersWithDetails = orders.filter(o => o.account_details).length;
        const totalOrders = orders.length;
        
        console.log(`Total orders: ${totalOrders}`);
        console.log(`Orders with account_details: ${ordersWithDetails}/${totalOrders}`);
        
        if (ordersWithDetails > 0) {
            const percentage = (ordersWithDetails / totalOrders) * 100;
            console.log(`✅ SUCCESS RATE: ${percentage.toFixed(1)}%`);
            
            if (percentage === 100) {
                console.log('✅ ALL ORDERS HAVE ACCOUNT DETAILS - Flow working perfectly!');
            } else {
                console.log('⚠️  Some orders missing account details - May need more time to fetch');
            }
        } else {
            console.log(`❌ No orders have account details - Background task may not be running`);
        }
        
        console.log('\n' + '='.repeat(70));
        console.log('BACKGROUND TASK STATUS');
        console.log('='.repeat(70));
        console.log('Background task should be running every 20 seconds');
        console.log('\nCheck server logs for:');
        console.log('  ✓ "[BG Task] Found N orders pending account details"');
        console.log('  ✓ "[BG Task] Fetching account details for ORD-XXXX"');
        console.log('  ✓ "[BG Task] Saving account details for ORD-XXXX"');
        console.log('  ✓ "[BG Task] ✅ Order ORD-XXXX: Details fetched & saved"');
        console.log('\nIf these logs appear, background task is working correctly ✅\n');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        process.exit(0);
    }
}

verifyOrders();
