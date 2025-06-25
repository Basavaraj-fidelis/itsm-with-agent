
import pkg from 'pg';
const { Pool } = pkg;

async function diagnosePatchSystem() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('aivencloud.com') ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('🔍 Diagnosing Patch Compliance System...');
    
    // Check database connection
    console.log('\n1. Testing database connection...');
    const client = await pool.connect();
    console.log('✅ Database connected successfully');
    
    // Check if patch tables exist
    console.log('\n2. Checking patch compliance tables...');
    const tables = [
      'patch_definitions',
      'device_patch_status', 
      'patch_deployments',
      'compliance_policies',
      'patch_deployment_results'
    ];
    
    const existingTables = [];
    for (const table of tables) {
      try {
        const result = await client.query(`SELECT COUNT(*) FROM ${table}`);
        existingTables.push({
          name: table,
          exists: true,
          count: result.rows[0].count
        });
        console.log(`✅ ${table}: ${result.rows[0].count} records`);
      } catch (err) {
        existingTables.push({
          name: table,
          exists: false,
          error: err.message
        });
        console.log(`❌ ${table}: Missing or error - ${err.message}`);
      }
    }
    
    // Check devices table (dependency)
    console.log('\n3. Checking devices table...');
    try {
      const deviceResult = await client.query('SELECT COUNT(*) as count, COUNT(CASE WHEN status = \'online\' THEN 1 END) as online FROM devices');
      console.log(`✅ Devices table: ${deviceResult.rows[0].count} total, ${deviceResult.rows[0].online} online`);
    } catch (err) {
      console.log(`❌ Devices table error: ${err.message}`);
    }
    
    // Test a simple patch query
    console.log('\n4. Testing patch compliance query...');
    try {
      const testQuery = await client.query(`
        SELECT 
          d.id, d.hostname,
          COUNT(dps.patch_id) as patch_count
        FROM devices d
        LEFT JOIN device_patch_status dps ON d.id = dps.device_id
        WHERE d.status = 'online'
        GROUP BY d.id, d.hostname
        LIMIT 3
      `);
      console.log(`✅ Join query successful: ${testQuery.rows.length} results`);
      testQuery.rows.forEach(row => {
        console.log(`  - ${row.hostname}: ${row.patch_count} patches`);
      });
    } catch (err) {
      console.log(`❌ Join query failed: ${err.message}`);
    }
    
    // Check for UUID vs string issues
    console.log('\n5. Checking UUID data types...');
    try {
      const uuidCheck = await client.query(`
        SELECT 
          column_name, 
          data_type 
        FROM information_schema.columns 
        WHERE table_name IN ('devices', 'device_patch_status') 
        AND column_name IN ('id', 'device_id')
        ORDER BY table_name, column_name
      `);
      console.log('Column types:');
      uuidCheck.rows.forEach(row => {
        console.log(`  ${row.column_name}: ${row.data_type}`);
      });
    } catch (err) {
      console.log(`❌ UUID check failed: ${err.message}`);
    }
    
    client.release();
    
    // Summary and recommendations
    console.log('\n📋 DIAGNOSIS SUMMARY:');
    const missingTables = existingTables.filter(t => !t.exists);
    if (missingTables.length > 0) {
      console.log(`❌ Missing tables: ${missingTables.map(t => t.name).join(', ')}`);
      console.log('🔧 Recommendation: Run create-patch-tables-fixed.js');
    } else {
      console.log('✅ All patch tables exist');
    }
    
    return {
      connection: true,
      tables: existingTables,
      recommendation: missingTables.length > 0 ? 'recreate_tables' : 'check_service'
    };
    
  } catch (error) {
    console.error('❌ Diagnosis failed:', error);
    return {
      connection: false,
      error: error.message,
      recommendation: 'check_database_connection'
    };
  } finally {
    await pool.end();
  }
}

// Run diagnosis
diagnosePatchSystem().then(result => {
  console.log('\n🎯 Next Steps:');
  if (result.recommendation === 'recreate_tables') {
    console.log('1. Run: node create-patch-tables-fixed.js');
    console.log('2. Test the patch compliance dashboard');
  } else if (result.recommendation === 'check_service') {
    console.log('1. Check server logs for patch-compliance-service errors');
    console.log('2. Verify API endpoint is working');
  } else {
    console.log('1. Check database connection');
    console.log('2. Verify DATABASE_URL environment variable');
  }
}).catch(console.error);
