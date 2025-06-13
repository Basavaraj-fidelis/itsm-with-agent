
const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 
  "postgres://avnadmin:AVNS_YOa-jMJ2ghMv9bcWgze@pg-2d00a622-basureddy2020-11ac.l.aivencloud.com:21320/defaultdb";

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function checkKnowledgeBaseCount() {
  try {
    console.log("🔍 Checking knowledge_base table...\n");

    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'knowledge_base'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.log("❌ knowledge_base table does not exist");
      return;
    }

    console.log("✅ knowledge_base table exists");

    // Count total articles
    const totalCount = await pool.query('SELECT COUNT(*) as total FROM knowledge_base');
    console.log(`📊 Total articles: ${totalCount.rows[0].total}`);

    // Count by status
    const statusCount = await pool.query(`
      SELECT status, COUNT(*) as count 
      FROM knowledge_base 
      GROUP BY status 
      ORDER BY status
    `);

    console.log("\n📈 Articles by status:");
    statusCount.rows.forEach(row => {
      console.log(`  ${row.status || 'null'}: ${row.count}`);
    });

    // Count by category
    const categoryCount = await pool.query(`
      SELECT category, COUNT(*) as count 
      FROM knowledge_base 
      GROUP BY category 
      ORDER BY category
    `);

    console.log("\n📂 Articles by category:");
    categoryCount.rows.forEach(row => {
      console.log(`  ${row.category || 'uncategorized'}: ${row.count}`);
    });

    // Show recent articles
    const recentArticles = await pool.query(`
      SELECT title, category, status, created_at 
      FROM knowledge_base 
      ORDER BY created_at DESC 
      LIMIT 5
    `);

    console.log("\n📝 Recent articles:");
    recentArticles.rows.forEach(article => {
      console.log(`  - ${article.title} (${article.category}) - ${article.status}`);
    });

  } catch (error) {
    console.error("❌ Error checking knowledge base:", error.message);
  } finally {
    await pool.end();
  }
}

checkKnowledgeBaseCount();
