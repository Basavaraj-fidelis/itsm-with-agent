
const { Pool } = require("pg");

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgres://avnadmin:AVNS_YOa-jMJ2ghMv9bcWgze@pg-2d00a622-basureddy2020-11ac.l.aivencloud.com:21320/defaultdb";

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function verifyAnalyticsQueries() {
  try {
    console.log("🔍 ANALYTICS QUERIES VERIFICATION REPORT");
    console.log("=" .repeat(60));
    
    // 1. Check if all required tables exist
    console.log("\n📋 CHECKING TABLE EXISTENCE:");
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      AND table_name IN ('devices', 'device_reports', 'alerts', 'tickets', 'reports', 'users')
      ORDER BY table_name;
    `);
    
    const existingTables = tablesResult.rows.map(r => r.table_name);
    const requiredTables = ['devices', 'device_reports', 'alerts', 'tickets', 'reports', 'users'];
    
    requiredTables.forEach(table => {
      const exists = existingTables.includes(table);
      console.log(`  ${exists ? '✅' : '❌'} ${table} - ${exists ? 'EXISTS' : 'MISSING'}`);
    });

    // 2. Check table structures and columns
    console.log("\n📊 CHECKING TABLE STRUCTURES:");
    
    for (const table of existingTables) {
      const columnsResult = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = $1 AND table_schema = 'public'
        ORDER BY ordinal_position;
      `, [table]);
      
      console.log(`\n  📈 ${table.toUpperCase()} TABLE:`);
      columnsResult.rows.forEach(col => {
        console.log(`    - ${col.column_name} (${col.data_type}${col.is_nullable === 'YES' ? ', nullable' : ''})`);
      });
    }

    // 3. Test Performance Summary Query
    console.log("\n🔧 TESTING ANALYTICS QUERIES:");
    console.log("\n  1️⃣ Performance Summary Query:");
    
    try {
      // Test device count
      const deviceCount = await pool.query('SELECT COUNT(*) as count FROM devices');
      console.log(`    ✅ Device count: ${deviceCount.rows[0].count}`);
      
      // Test device_reports structure
      const reportsStructure = await pool.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'device_reports' AND table_schema = 'public'
        AND column_name IN ('cpu_usage', 'memory_usage', 'disk_usage', 'created_at', 'collected_at')
      `);
      console.log(`    ✅ device_reports has columns: ${reportsStructure.rows.map(r => r.column_name).join(', ')}`);
      
      // Test sample performance query
      const sampleReports = await pool.query(`
        SELECT cpu_usage, memory_usage, disk_usage, 
               COALESCE(created_at, collected_at) as timestamp
        FROM device_reports 
        WHERE cpu_usage IS NOT NULL 
        ORDER BY COALESCE(created_at, collected_at) DESC 
        LIMIT 5
      `);
      console.log(`    ✅ Sample reports found: ${sampleReports.rows.length}`);
      
      if (sampleReports.rows.length > 0) {
        console.log(`    📊 Sample data: CPU=${sampleReports.rows[0].cpu_usage}, Memory=${sampleReports.rows[0].memory_usage}`);
      }
      
    } catch (err) {
      console.log(`    ❌ Performance query error: ${err.message}`);
    }

    // 4. Test Alerts Query
    console.log("\n  2️⃣ Alerts Query:");
    try {
      const alertsCount = await pool.query(`
        SELECT severity, COUNT(*) as count 
        FROM alerts 
        GROUP BY severity
      `);
      console.log(`    ✅ Alerts by severity:`);
      alertsCount.rows.forEach(row => {
        console.log(`      - ${row.severity}: ${row.count}`);
      });
      
      const criticalAlerts = await pool.query(`
        SELECT COUNT(*) as count 
        FROM alerts 
        WHERE severity = 'critical' AND created_at >= NOW() - INTERVAL '7 days'
      `);
      console.log(`    ✅ Critical alerts (last 7 days): ${criticalAlerts.rows[0].count}`);
      
    } catch (err) {
      console.log(`    ❌ Alerts query error: ${err.message}`);
    }

    // 5. Test Reports Storage
    console.log("\n  3️⃣ Reports Storage Query:");
    try {
      const reportsExists = existingTables.includes('reports');
      if (reportsExists) {
        const reportsCount = await pool.query('SELECT COUNT(*) as count FROM reports');
        console.log(`    ✅ Stored reports count: ${reportsCount.rows[0].count}`);
        
        const recentReports = await pool.query(`
          SELECT id, title, type, generated_at 
          FROM reports 
          ORDER BY generated_at DESC 
          LIMIT 3
        `);
        console.log(`    ✅ Recent reports: ${recentReports.rows.length}`);
        recentReports.rows.forEach(report => {
          console.log(`      - ${report.type}: ${report.title} (${report.generated_at})`);
        });
      } else {
        console.log(`    ❌ Reports table does not exist`);
      }
    } catch (err) {
      console.log(`    ❌ Reports query error: ${err.message}`);
    }

    // 6. Check data availability for analytics
    console.log("\n📈 DATA AVAILABILITY ANALYSIS:");
    
    try {
      // Check data freshness
      const dataFreshness = await pool.query(`
        SELECT 
          'devices' as table_name,
          COUNT(*) as total_records,
          MAX(COALESCE(last_seen, updated_at, created_at)) as latest_data
        FROM devices
        UNION ALL
        SELECT 
          'device_reports' as table_name,
          COUNT(*) as total_records,
          MAX(COALESCE(created_at, collected_at)) as latest_data
        FROM device_reports
        UNION ALL
        SELECT 
          'alerts' as table_name,
          COUNT(*) as total_records,
          MAX(COALESCE(created_at, triggered_at)) as latest_data
        FROM alerts
      `);
      
      dataFreshness.rows.forEach(row => {
        console.log(`  📊 ${row.table_name}: ${row.total_records} records, latest: ${row.latest_data || 'N/A'}`);
      });
      
    } catch (err) {
      console.log(`  ❌ Data freshness check error: ${err.message}`);
    }

    // 7. Recommendations
    console.log("\n💡 RECOMMENDATIONS:");
    
    if (!existingTables.includes('reports')) {
      console.log("  🔧 CREATE reports table for analytics storage");
    }
    
    const deviceReportsCount = await pool.query('SELECT COUNT(*) FROM device_reports WHERE created_at >= NOW() - INTERVAL \'1 day\'');
    if (parseInt(deviceReportsCount.rows[0].count) < 10) {
      console.log("  📊 LOW DATA: Consider adding more sample device reports for better analytics");
    }
    
    const alertsCount = await pool.query('SELECT COUNT(*) FROM alerts WHERE created_at >= NOW() - INTERVAL \'7 days\'');
    if (parseInt(alertsCount.rows[0].count) < 5) {
      console.log("  🚨 LOW ALERTS: Consider adding sample alerts for testing");
    }
    
    console.log("\n✅ VERIFICATION COMPLETE!");
    
  } catch (error) {
    console.error("❌ Verification failed:", error);
  } finally {
    await pool.end();
  }
}

verifyAnalyticsQueries();
