// test-wr-order-create.js
const axios = require('axios');
require('dotenv').config();

(async () => {
  try {
    console.log('\n🔍 Testing WR API /order endpoint...\n');
    
    // Get available products first
    console.log('Step 1: Get available variants...');
    const productsRes = await axios.post(`${process.env.WR_API_URL}/products`, {
      api_key: process.env.WR_API_KEY
    }, { timeout: 10000 });
    
    const products = productsRes.data.data || [];
    console.log(`✅ Got ${products.length} products`);
    
    // Get first variant
    let variantId = null;
    for (const product of products) {
      if (product.variants && product.variants.length > 0) {
        variantId = product.variants[0].id;
        console.log(`   Using variant: ${variantId} (${product.variants[0].name})`);
        break;
      }
    }
    
    if (!variantId) {
      console.log('❌ No variants found!');
      process.exit(1);
    }
    
    // Try creating a test order
    console.log(`\nStep 2: Create test order with variant ${variantId}...`);
    const orderRes = await axios.post(`${process.env.WR_API_URL}/order`, {
      api_key: process.env.WR_API_KEY,
      variant_id: variantId,
      quantity: 1
    }, { timeout: 15000 });
    
    console.log(`✅ Order created!`);
    console.log(`\n📦 Full WR API Response:`);
    console.log(JSON.stringify(orderRes.data, null, 2));
    
    const testOrderId = orderRes.data.data?.order_id;
    if (testOrderId) {
      console.log(`\nStep 3: Query the order detail we just created...`);
      const detailRes = await axios.post(`${process.env.WR_API_URL}/order/detail`, {
        api_key: process.env.WR_API_KEY,
        order_id: testOrderId
      }, { timeout: 10000 });
      
      console.log(`✅ Order detail retrieved!`);
      console.log(JSON.stringify(detailRes.data, null, 2));
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    process.exit(1);
  }
})();
