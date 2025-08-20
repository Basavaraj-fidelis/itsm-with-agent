
#!/usr/bin/env node

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// Database connection
const connectionString = 'postgres://avnadmin:AVNS_YOa-jMJ2ghMv9bcWgze@pg-2d00a622-basureddy2020-11ac.l.aivencloud.com:21320/defaultdb';

const sql = postgres(connectionString);
const db = drizzle(sql);

async function clearAllData() {
  try {
    console.log('🧹 Starting database cleanup...\n');
    
    // Clear tables in correct order (respecting foreign keys)
    const tablesToClear = [
      'ticket_attachments',
      'ticket_comments', 
      'usb_devices',
      'device_reports',
      'alerts',
      'tickets',
      'devices',
      'knowledge_base'
    ];

    for (const table of tablesToClear) {
      try {
        const result = await sql`DELETE FROM ${sql(table)}`;
        console.log(`✅ Cleared table: ${table} (${result.count} records removed)`);
      } catch (error) {
        console.log(`⚠️  Table ${table}: ${error.message}`);
      }
    }

    // Reset sequences if they exist
    const sequencesToReset = [
      'tickets_id_seq',
      'devices_id_seq', 
      'alerts_id_seq'
    ];

    for (const sequence of sequencesToReset) {
      try {
        await sql`ALTER SEQUENCE ${sql(sequence)} RESTART WITH 1`;
        console.log(`🔄 Reset sequence: ${sequence}`);
      } catch (error) {
        // Sequence might not exist, that's okay
      }
    }

    console.log('\n✅ Database cleanup completed successfully!');
    console.log('📋 Users table was preserved as requested');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

// Run the script
clearAllData()
  .then(() => {
    console.log('\n🎉 All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Cleanup failed:', error);
    process.exit(1);
  });
