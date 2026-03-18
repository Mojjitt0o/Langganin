// check-table-schema.js
const db = require('./config/database');
require('dotenv').config();

(async () => {
  try {
    console.log('\n📊 Checking orders table schema...\n');
    const [columns] = await db.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'orders'
      ORDER BY ordinal_position
    `);
    
    columns.forEach(col => {
      console.log(`${col.column_name.padEnd(25)} | ${col.data_type.padEnd(15)} | nullable: ${col.is_nullable} | default: ${col.column_default || '-'}`);
    });
    
    console.log('\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
