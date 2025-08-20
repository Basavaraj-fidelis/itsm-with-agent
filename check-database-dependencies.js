
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// Database connection
const connectionString = process.env.DATABASE_URL || 'postgres://avnadmin:AVNS_YOa-jMJ2ghMv9bcWgze@pg-2d00a622-basureddy2020-11ac.l.aivencloud.com:21320/defaultdb';

const sql = postgres(connectionString);
const db = drizzle(sql);

async function checkDatabaseDependencies() {
  try {
    console.log('🔍 Checking database dependencies and foreign key constraints...\n');
    
    // Check for foreign key constraints
    const foreignKeys = await sql`
      SELECT 
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name, kcu.column_name;
    `;

    console.log('📋 Foreign Key Constraints:');
    if (foreignKeys.length === 0) {
      console.log('  No foreign key constraints found.');
    } else {
      foreignKeys.forEach(fk => {
        console.log(`  ${fk.table_name}.${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`);
      });
    }

    // Check table record counts
    console.log('\n📊 Table Record Counts:');
    
    const tables = [
      'tickets',
      'ticket_comments', 
      'ticket_attachments',
      'devices',
      'device_reports',
      'alerts',
      'usb_devices',
      'users',
      'knowledge_base'
    ];

    for (const table of tables) {
      try {
        const result = await sql`SELECT COUNT(*) as count FROM ${sql(table)}`;
        console.log(`  ${table}: ${result[0].count} records`);
      } catch (error) {
        console.log(`  ${table}: ❌ Error (table may not exist)`);
      }
    }

    // Check for any dependent records that might prevent deletion
    console.log('\n🔗 Checking for potential deletion blockers:');
    
    try {
      const ticketDependencies = await sql`
        SELECT 
          'ticket_comments' as table_name,
          COUNT(*) as count
        FROM ticket_comments
        UNION ALL
        SELECT 
          'ticket_attachments' as table_name,
          COUNT(*) as count  
        FROM ticket_attachments
        UNION ALL
        SELECT 
          'device_reports' as table_name,
          COUNT(*) as count
        FROM device_reports
        UNION ALL
        SELECT 
          'alerts' as table_name,
          COUNT(*) as count
        FROM alerts
        UNION ALL
        SELECT 
          'usb_devices' as table_name,
          COUNT(*) as count
        FROM usb_devices;
      `;

      ticketDependencies.forEach(dep => {
        if (dep.count > 0) {
          console.log(`  ${dep.table_name}: ${dep.count} dependent records`);
        }
      });
    } catch (error) {
      console.log('  ❌ Error checking dependencies:', error.message);
    }

    console.log('\n✅ Database dependency check completed');
    
  } catch (error) {
    console.error('❌ Error checking database dependencies:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

// Run the script
checkDatabaseDependencies()
  .then(() => {
    console.log('\n✅ Check completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Check failed:', error);
    process.exit(1);
  });
