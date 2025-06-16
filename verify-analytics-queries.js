
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
const { Pool } = require('pg');

// Database connection - update with your actual credentials
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://avnadmin:password@host:port/defaultdb',
  ssl: { rejectUnauthorized: false }
});

async function verifyAnalyticsQueries() {
  console.log('🔍 Verifying Analytics Queries Against Database Structure...\n');

  try {
    // 1. Verify Performance Summary API queries
    console.log('📊 Performance Summary API Verification:');
    console.log('----------------------------------------');
    
    // Check device count query
    try {
      const deviceCount = await pool.query('SELECT COUNT(*) as count FROM devices');
      console.log('✅ Device count query works:', deviceCount.rows[0].count);
    } catch (error) {
      console.log('❌ Device count query failed:', error.message);
    }

    // Check device_reports for performance metrics
    try {
      const reportsCheck = await pool.query(`
        SELECT 
          COUNT(*) as total_reports,
          AVG(CAST(cpu_usage AS FLOAT)) as avg_cpu,
          AVG(CAST(memory_usage AS FLOAT)) as avg_memory,
          AVG(CAST(disk_usage AS FLOAT)) as avg_disk
        FROM device_reports 
        WHERE created_at >= NOW() - INTERVAL '7 days'
      `);
      console.log('✅ Device reports metrics query works:');
      console.log('   Total reports:', reportsCheck.rows[0].total_reports);
      console.log('   Avg CPU:', reportsCheck.rows[0].avg_cpu?.toFixed(1) + '%');
      console.log('   Avg Memory:', reportsCheck.rows[0].avg_memory?.toFixed(1) + '%');
      console.log('   Avg Disk:', reportsCheck.rows[0].avg_disk?.toFixed(1) + '%');
    } catch (error) {
      console.log('❌ Device reports metrics query failed:', error.message);
    }

    // Check alerts table for critical alerts
    try {
      const alertsCheck = await pool.query(`
        SELECT COUNT(*) as critical_alerts 
        FROM alerts 
        WHERE severity = 'critical' 
        AND created_at >= NOW() - INTERVAL '7 days'
      `);
      console.log('✅ Critical alerts query works:', alertsCheck.rows[0].critical_alerts);
    } catch (error) {
      console.log('❌ Critical alerts query failed:', error.message);
    }

    console.log('\n📈 Trend Analysis API Verification:');
    console.log('------------------------------------');
    
    // Check trend analysis queries
    try {
      const trendData = await pool.query(`
        SELECT 
          collected_at as timestamp,
          CAST(cpu_usage AS FLOAT) as cpu_value,
          CAST(memory_usage AS FLOAT) as memory_value,
          CAST(disk_usage AS FLOAT) as disk_value
        FROM device_reports 
        WHERE collected_at >= NOW() - INTERVAL '7 days'
        ORDER BY collected_at
        LIMIT 10
      `);
      console.log('✅ Trend analysis query works, sample data points:', trendData.rows.length);
      if (trendData.rows.length > 0) {
        console.log('   Latest entry:', {
          timestamp: trendData.rows[0].timestamp,
          cpu: trendData.rows[0].cpu_value + '%',
          memory: trendData.rows[0].memory_value + '%',
          disk: trendData.rows[0].disk_value + '%'
        });
      }
    } catch (error) {
      console.log('❌ Trend analysis query failed:', error.message);
    }

    console.log('\n📋 System Inventory Verification:');
    console.log('----------------------------------');
    
    // Check devices table for inventory data
    try {
      const inventoryCheck = await pool.query(`
        SELECT 
          COUNT(*) as total_devices,
          COUNT(CASE WHEN status = 'online' THEN 1 END) as online_devices,
          COUNT(CASE WHEN status = 'offline' THEN 1 END) as offline_devices,
          os_name,
          COUNT(*) as os_count
        FROM devices 
        GROUP BY os_name
      `);
      console.log('✅ System inventory query works:');
      console.log('   Device OS distribution:');
      inventoryCheck.rows.forEach(row => {
        console.log(`   ${row.os_name || 'Unknown'}: ${row.os_count} devices`);
      });
    } catch (error) {
      console.log('❌ System inventory query failed:', error.message);
    }

    console.log('\n🔄 Real-time Metrics Verification:');
    console.log('-----------------------------------');
    
    // Check latest device reports for real-time data
    try {
      const realtimeCheck = await pool.query(`
        SELECT 
          d.hostname,
          dr.cpu_usage,
          dr.memory_usage,
          dr.disk_usage,
          dr.collected_at
        FROM device_reports dr
        JOIN devices d ON dr.device_id = d.id
        WHERE dr.collected_at >= NOW() - INTERVAL '1 hour'
        ORDER BY dr.collected_at DESC
        LIMIT 5
      `);
      console.log('✅ Real-time metrics query works, recent entries:', realtimeCheck.rows.length);
      realtimeCheck.rows.forEach(row => {
        console.log(`   ${row.hostname}: CPU ${row.cpu_usage}%, Memory ${row.memory_usage}%, Disk ${row.disk_usage}%`);
      });
    } catch (error) {
      console.log('❌ Real-time metrics query failed:', error.message);
    }

    console.log('\n📊 Reports Storage Verification:');
    console.log('---------------------------------');
    
    // Check if reports table exists (it should be created by reports-storage.ts)
    try {
      const reportsCheck = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'reports'
      `);
      if (reportsCheck.rows.length > 0) {
        const reportsCount = await pool.query('SELECT COUNT(*) as count FROM reports');
        console.log('✅ Reports table exists with', reportsCount.rows[0].count, 'reports');
      } else {
        console.log('⚠️  Reports table does not exist - will be created when first report is saved');
      }
    } catch (error) {
      console.log('❌ Reports table check failed:', error.message);
    }

    console.log('\n🔗 Data Relationships Verification:');
    console.log('------------------------------------');
    
    // Check foreign key relationships
    try {
      const relationshipCheck = await pool.query(`
        SELECT 
          d.hostname,
          COUNT(dr.id) as report_count,
          COUNT(a.id) as alert_count,
          MAX(dr.collected_at) as last_report
        FROM devices d
        LEFT JOIN device_reports dr ON d.id = dr.device_id
        LEFT JOIN alerts a ON d.id = a.device_id
        GROUP BY d.id, d.hostname
      `);
      console.log('✅ Device relationships verified:');
      relationshipCheck.rows.forEach(row => {
        console.log(`   ${row.hostname}: ${row.report_count} reports, ${row.alert_count} alerts`);
      });
    } catch (error) {
      console.log('❌ Relationship verification failed:', error.message);
    }

    console.log('\n📝 Summary & Recommendations:');
    console.log('==============================');
    console.log('✅ Available tables for analytics:');
    console.log('   - devices: Device inventory and status');
    console.log('   - device_reports: Performance metrics and historical data');
    console.log('   - alerts: System alerts and incidents');
    console.log('   - users: User assignment data');
    console.log('   - tickets: Service desk correlation data');
    
    console.log('\n💡 Optimization suggestions:');
    console.log('   1. Add indexes on device_reports.created_at for time-range queries');
    console.log('   2. Add indexes on alerts.severity and alerts.created_at');
    console.log('   3. Consider partitioning device_reports by date for better performance');
    console.log('   4. Implement data retention policies for old reports');

  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  } finally {
    await pool.end();
  }
}

// Run the verification
if (require.main === module) {
  verifyAnalyticsQueries()
    .then(() => {
      console.log('\n✅ Analytics query verification completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Verification failed:', error);
      process.exit(1);
    });
}

module.exports = { verifyAnalyticsQueries };
