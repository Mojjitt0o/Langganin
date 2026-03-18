#!/usr/bin/env python3
"""
End-to-End Test Script untuk Langganin Account Details Flow
Tests: Login → Create Order → Background Task Fetch → Verify Account Details
"""

import requests
import json
import time
from datetime import datetime

BASE_URL = "http://localhost:3000/api"
TEST_USER_EMAIL = "tester.fingerspot2@gmail.com"
TEST_USER_PASS = "Admin123"

def log(msg, level="INFO"):
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] [{level}] {msg}")

def test_login():
    """Test 1: Login & Get JWT Token"""
    log("=" * 60)
    log("TEST 1: LOGIN & GET JWT TOKEN", "TEST")
    log("=" * 60)
    
    try:
        response = requests.post(
            f"{BASE_URL}/auth/login",
            json={
                "email": TEST_USER_EMAIL,
                "password": TEST_USER_PASS
            }
        )
        
        log(f"Login response status: {response.status_code}")
        data = response.json()
        log(f"Response: {json.dumps(data, indent=2)}")
        
        if response.status_code == 200 and data.get("success"):
            token = data.get("data", {}).get("token")
            log(f"✅ Login SUCCESS - Token: {token[:20]}...", "SUCCESS")
            return token
        else:
            log(f"❌ Login FAILED: {data.get('message', 'Unknown error')}", "ERROR")
            return None
            
    except Exception as e:
        log(f"❌ Login ERROR: {str(e)}", "ERROR")
        return None

def test_get_products(token):
    """Test 2: Get Available Products & Variants"""
    log("\n" + "=" * 60)
    log("TEST 2: GET PRODUCTS & VARIANTS", "TEST")
    log("=" * 60)
    
    try:
        response = requests.get(
            f"{BASE_URL}/products",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        log(f"Get products response status: {response.status_code}")
        data = response.json()
        
        if response.status_code == 200 and data.get("success"):
            products = data.get("data", [])
            log(f"✅ Found {len(products)} products", "SUCCESS")
            
            # Display first few products
            for idx, product in enumerate(products[:3]):
                log(f"\nProduct {idx+1}: {product.get('name', 'N/A')}")
                variants = product.get('variants', [])
                for v in variants[:2]:
                    log(f"  - Variant: {v.get('name')} (ID: {v.get('id')})")
                    log(f"    Price: Rp {v.get('our_price')}")
            
            # Return first variant ID for order
            if products and products[0].get('variants'):
                variant_id = products[0]['variants'][0]['id']
                log(f"\nUsing variant ID: {variant_id}", "INFO")
                return variant_id
            
        log(f"❌ Failed to get products: {data.get('message', 'Unknown')}", "ERROR")
        return None
        
    except Exception as e:
        log(f"❌ Get products ERROR: {str(e)}", "ERROR")
        return None

def test_create_order(token, variant_id):
    """Test 3: Create Order"""
    log("\n" + "=" * 60)
    log("TEST 3: CREATE ORDER", "TEST")
    log("=" * 60)
    
    try:
        payload = {
            "variant_id": variant_id,
            "quantity": 1
        }
        log(f"Creating order with payload: {json.dumps(payload, indent=2)}")
        
        response = requests.post(
            f"{BASE_URL}/orders/create",
            json=payload,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        log(f"Create order response status: {response.status_code}")
        data = response.json()
        log(f"Response: {json.dumps(data, indent=2)}")
        
        if response.status_code == 200 and data.get("success"):
            order = data.get("data", {})
            order_id = order.get("order_id")
            log(f"✅ Order created SUCCESS", "SUCCESS")
            log(f"  Order ID: {order_id}")
            log(f"  Status: {order.get('status')}")
            log(f"  Amount: Rp {order.get('our_total')}")
            return order_id
        else:
            log(f"❌ Order creation FAILED: {data.get('message', 'Unknown')}", "ERROR")
            return None
            
    except Exception as e:
        log(f"❌ Create order ERROR: {str(e)}", "ERROR")
        return None

def test_get_order_details(token, order_id):
    """Test 4: Get Order Details"""
    log("\n" + "=" * 60)
    log("TEST 4: GET ORDER DETAILS", "TEST")
    log("=" * 60)
    
    try:
        response = requests.get(
            f"{BASE_URL}/orders/history",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        log(f"Get orders response status: {response.status_code}")
        data = response.json()
        
        if response.status_code == 200 and data.get("success"):
            orders = data.get("data", [])
            target_order = next((o for o in orders if o.get("order_id") == order_id), None)
            
            if target_order:
                log(f"✅ Order found", "SUCCESS")
                log(f"  Status: {target_order.get('status')}")
                log(f"  Account Details: {target_order.get('account_details')}")
                return target_order
            else:
                log(f"⚠️ Order not found in history yet", "WARN")
                return None
        else:
            log(f"❌ Failed to get orders: {data.get('message')}", "ERROR")
            return None
            
    except Exception as e:
        log(f"❌ Get order details ERROR: {str(e)}", "ERROR")
        return None

def test_account_details_integration(token, order_id):
    """Test 5: Account Details Flow (Simulating Background Task)"""
    log("\n" + "=" * 60)
    log("TEST 5: ACCOUNT DETAILS INTEGRATION", "TEST")
    log("=" * 60)
    log("Waiting for background task to fetch account details...")
    log("(Background task runs every 20 seconds)")
    
    max_attempts = 15  # Try for 15 * 5 = 75 seconds
    attempt = 0
    
    while attempt < max_attempts:
        attempt += 1
        log(f"\n[Attempt {attempt}/{max_attempts}] Checking for account details...", "INFO")
        
        order = test_get_order_details(token, order_id)
        
        if order:
            account_details = order.get('account_details')
            
            if account_details and account_details != '{}':
                log(f"✅ ACCOUNT DETAILS FOUND!", "SUCCESS")
                try:
                    if isinstance(account_details, str):
                        details = json.loads(account_details)
                    else:
                        details = account_details
                    log(f"Details content: {json.dumps(details, indent=2)}", "SUCCESS")
                except:
                    log(f"Details: {account_details}", "SUCCESS")
                return True
            else:
                log(f"⚠️ Account details still empty", "WARN")
        
        if attempt < max_attempts:
            wait_time = 5
            log(f"Waiting {wait_time}s before next check...", "INFO")
            time.sleep(wait_time)
    
    log(f"❌ Account details NOT found after {max_attempts * 5}s", "ERROR")
    log("Possible causes:", "ERROR")
    log("  1. WR API not responding with account details", "ERROR")
    log("  2. Background task not running", "ERROR")
    log("  3. Check server logs for [WR API] or [BG Task] messages", "ERROR")
    return False

def main():
    """Run all tests"""
    log("=" * 60)
    log("LANGGANIN END-TO-END TEST SUITE", "TEST")
    log("=" * 60)
    log(f"Base URL: {BASE_URL}")
    log(f"Test User: {TEST_USER_EMAIL}")
    
    # Test 1: Login
    token = test_login()
    if not token:
        log("\n❌ Test suite STOPPED - cannot proceed without token", "ERROR")
        return
    
    # Test 2: Get Products
    variant_id = test_get_products(token)
    if not variant_id:
        log("\n❌ Test suite STOPPED - no products available", "ERROR")
        return
    
    # Test 3: Create Order
    order_id = test_create_order(token, variant_id)
    if not order_id:
        log("\n❌ Test suite STOPPED - order creation failed", "ERROR")
        return
    
    # Test 4: Immediate check (should be empty)
    order = test_get_order_details(token, order_id)
    if order:
        log(f"Initial account_details: {order.get('account_details', 'None')}")
    
    # Test 5: Wait for background task to fetch account details
    success = test_account_details_integration(token, order_id)
    
    # Summary
    log("\n" + "=" * 60)
    log("TEST SUMMARY", "TEST")
    log("=" * 60)
    if success:
        log("✅ ALL TESTS PASSED - Account details flow working!", "SUCCESS")
        log("Summary:", "SUCCESS")
        log("  ✅ Login successful", "SUCCESS")
        log("  ✅ Products fetched", "SUCCESS")
        log("  ✅ Order created", "SUCCESS")
        log("  ✅ Background task fetched account details", "SUCCESS")
    else:
        log("❌ TESTS FAILED - Check logs above for details", "ERROR")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        log("\n\n⚠️  Test interrupted by user", "WARN")
    except Exception as e:
        log(f"\n\n❌ Unexpected error: {str(e)}", "ERROR")
        import traceback
        traceback.print_exc()
