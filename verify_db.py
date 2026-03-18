#!/usr/bin/env python3
"""
Database Verification Script untuk Account Details Flow
Check apakah account_details ter-fetch dengan benar ke database
"""

import psycopg2
import json
from datetime import datetime
from psycopg2.extras import RealDictCursor

# Database configuration
DB_CONFIG = {
    'host': 'aws-1-ap-south-1.pooler.supabase.com',
    'port': 5432,
    'database': 'postgres',
    'user': 'postgres.vyrkzhqutwyhlmtteade',
    'password': 'SLwpXTbrGBLdlAIU'
}

def log(msg, level="INFO"):
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] [{level}] {msg}")

def verify_orders():
    """Verify account details di database"""
    log("=" * 70)
    log("DATABASE VERIFICATION - ACCOUNT DETAILS CHECK", "VERIFY")
    log("=" * 70)
    
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # Test user ID = 2 (tester.fingerspot2@gmail.com)
        log("Connecting to database...")
        
        # Get recent orders from test user
        log("\nFetching recent orders from test user (ID: 2)...", "INFO")
        cur.execute("""
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
        """)
        
        orders = cur.fetchall()
        
        if not orders:
            log("⚠️  No orders found for test user", "WARN")
            return
        
        log(f"✅ Found {len(orders)} orders", "SUCCESS")
        
        # Display orders
        for idx, order in enumerate(orders, 1):
            log(f"\n[Order {idx}]", "INFO")
            log(f"  Order ID: {order['order_id']}", "INFO")
            log(f"  Product: {order['product_name']} - {order['variant_name']}", "INFO")
            log(f"  Status: {order['status']}", "INFO")
            log(f"  Payment Status: {order['payment_status']}", "INFO")
            log(f"  Created: {order['created_at']}", "INFO")
            log(f"  Updated: {order['updated_at']}", "INFO")
            
            # Check account details
            account_details = order['account_details']
            if account_details:
                log(f"  ✅ Account Details: FOUND", "SUCCESS")
                try:
                    if isinstance(account_details, str):
                        details = json.loads(account_details)
                    else:
                        details = account_details
                    
                    # Pretty print details
                    log(f"  Details content:", "SUCCESS")
                    for key, value in details.items():
                        log(f"    - {key}: {value}", "SUCCESS")
                except Exception as e:
                    log(f"  Raw details: {account_details}", "INFO")
            else:
                log(f"  ❌ Account Details: EMPTY/NULL", "ERROR")
    
        # Overall check
        log("\n" + "=" * 70)
        log("SUMMARY", "VERIFY")
        log("=" * 70)
        
        orders_with_details = sum(1 for o in orders if o['account_details'])
        total_orders = len(orders)
        
        log(f"Total orders: {total_orders}", "INFO")
        log(f"Orders with account_details: {orders_with_details}/{total_orders}", "INFO")
        
        if orders_with_details > 0:
            percentage = (orders_with_details / total_orders) * 100
            log(f"✅ SUCCESS RATE: {percentage:.1f}%", "SUCCESS")
            
            if percentage == 100:
                log("✅ ALL ORDERS HAVE ACCOUNT DETAILS - Flow working perfectly!", "SUCCESS")
            else:
                log("⚠️  Some orders missing account details - May need more time to fetch", "WARN")
        else:
            log(f"❌ No orders have account details - Background task may not be running", "ERROR")
        
        cur.close()
        conn.close()
        
    except psycopg2.Error as e:
        log(f"❌ Database connection error: {str(e)}", "ERROR")
        log("Verify .env configuration:\n" + \
            "  - DB_HOST\n" + \
            "  - DB_PORT\n" + \
            "  - DB_USER\n" + \
            "  - DB_PASSWORD\n" + \
            "  - DB_NAME", "ERROR")
    except Exception as e:
        log(f"❌ Unexpected error: {str(e)}", "ERROR")
        import traceback
        traceback.print_exc()

def check_background_task_status():
    """Check background task status"""
    log("\n" + "=" * 70)
    log("BACKGROUND TASK STATUS CHECK", "VERIFY")
    log("=" * 70)
    
    log("Background task should be running every 20 seconds", "INFO")
    log("Indicators to check in server logs:", "INFO")
    log("  ✓ '[BG Task] Found N orders pending account details'", "INFO")
    log("  ✓ '[BG Task] Fetching account details for ORD-XXXX'", "INFO")
    log("  ✓ '[BG Task] Saving account details for ORD-XXXX'", "INFO")
    log("  ✓ '[BG Task] ✅ Order ORD-XXXX: Details fetched & saved'", "INFO")
    log("\nIf these logs appear, background task is working correctly ✅", "SUCCESS")

if __name__ == "__main__":
    try:
        verify_orders()
        check_background_task_status()
    except KeyboardInterrupt:
        log("\n⚠️  Interrupted by user", "WARN")
    except Exception as e:
        log(f"\n❌ Unexpected error: {str(e)}", "ERROR")
