
import pg from 'pg';
const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL || 
  "postgres://avnadmin:AVNS_YOa-jMJ2ghMv9bcWgze@pg-2d00a622-basureddy2020-11ac.l.aivencloud.com:21320/defaultdb";

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function checkDatabase() {
  try {
    console.log("🔍 Checking current database status...\n");

    // Check existing tables
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log("📋 Current Tables:");
    tablesResult.rows.forEach(row => {
      console.log(`  ✓ ${row.table_name}`);
    });

    // Check data counts
    const tables = tablesResult.rows.map(r => r.table_name);
    
    console.log("\n📊 Data Counts:");
    for (const table of tables) {
      try {
        const countResult = await pool.query(`SELECT COUNT(*) FROM ${table}`);
        console.log(`  ${table}: ${countResult.rows[0].count} records`);
      } catch (err) {
        console.log(`  ${table}: Error counting - ${err.message}`);
      }
    }

    // Check if knowledge_base table exists and if it should be migrated from files
    const kbTableExists = tables.includes('knowledge_base');
    console.log(`\n💡 Knowledge Base: ${kbTableExists ? 'Database table exists' : 'Using file-based storage'}`);

    if (!kbTableExists) {
      console.log("⚠️  Knowledge base is currently file-based. Should migrate to database for consistency.");
    }

  } catch (error) {
    console.error("❌ Database check failed:", error);
  } finally {
    await pool.end();
  }
}

checkDatabase();
