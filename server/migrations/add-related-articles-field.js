
import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

async function migrate() {
  try {
    console.log('Adding related_article_ids column to tickets table...');
    
    await pool.query(`
      ALTER TABLE tickets 
      ADD COLUMN IF NOT EXISTS related_article_ids JSONB DEFAULT '[]'::jsonb;
    `);
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Check if this file is being run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrate().catch(console.error);
}

export { migrate };
