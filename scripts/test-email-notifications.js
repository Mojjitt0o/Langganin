// scripts/test-email-notifications.js
const db = require('../config/database');
const emailService = require('../services/emailService');
require('dotenv').config();

async function runTest() {
    try {
        console.log(`\n📧 Testing email system for existing orders with account_details...\n`);
        
        const [orders] = await db.query(
            `SELECT o.order_id, o.user_id, o.account_details, p.name as product_name
             FROM orders o
             LEFT JOIN product_variants pv ON o.variant_id = pv.id
             LEFT JOIN products p ON pv.product_id = p.id
             WHERE o.account_details IS NOT NULL 
             AND o.account_details != '{}'::jsonb
             AND o.account_details::text != ''
             ORDER BY o.created_at DESC
             LIMIT 5`
        );

        if (!orders || orders.length === 0) {
            console.log(`ℹ️ No orders with account_details found yet.\n`);
            process.exit(0);
        }

        console.log(`Found ${orders.length} orders with account_details:\n`);

        let successCount = 0;
        let failCount = 0;

        for (const order of orders) {
            // Get user data
            const [users] = await db.query(
                'SELECT id, email, username FROM users WHERE id = $1',
                [order.user_id]
            );
            const user = users?.[0];

            if (!user?.email) {
                console.log(`⚠️ SKIP ${order.order_id}: No user email (user_id=${order.user_id})`);
                failCount++;
                continue;
            }

            console.log(`📤 SEND to ${order.order_id}`);
            console.log(`   User: ${user.username} (${user.email})`);

            // Parse account_details
            let accountDetails = order.account_details;
            if (typeof accountDetails === 'string') {
                try {
                    accountDetails = JSON.parse(accountDetails);
                } catch (e) {
                    console.log(`   ❌ Invalid JSON in account_details`);
                    failCount++;
                    continue;
                }
            }

            try {
                const sent = await emailService.sendAccountDetailsToUser(
                    user.email,
                    user.username,
                    order.order_id,
                    order.product_name || 'Produk Digital',
                    accountDetails
                );

                if (sent) {
                    console.log(`   ✅ SENT\n`);
                    successCount++;
                } else {
                    console.log(`   ❌ FAILED\n`);
                    failCount++;
                }
            } catch (err) {
                console.log(`   ❌ ERROR: ${err.message}\n`);
                failCount++;
            }

            // Small delay between sends
            await new Promise(r => setTimeout(r, 500));
        }

        console.log(`${'='.repeat(50)}`);
        console.log(`📊 SUMMARY: ${successCount} sent, ${failCount} failed`);
        console.log(`${'='.repeat(50)}\n`);

        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        console.error(err.stack);
        process.exit(1);
    }
}

runTest();
