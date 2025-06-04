
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const DATABASE_URL = process.env.DATABASE_URL || 
  "postgres://avnadmin:AVNS_YOa-jMJ2ghMv9bcWgze@pg-2d00a622-basureddy2020-11ac.l.aivencloud.com:21320/defaultdb";

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function migrateKnowledgeBase() {
  try {
    console.log("🚀 Starting Knowledge Base migration from files to database...\n");

    // First, check if knowledge_base table exists
    const tableCheckResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'knowledge_base'
      );
    `);

    if (!tableCheckResult.rows[0].exists) {
      console.log("❌ knowledge_base table doesn't exist. Creating it...");
      
      await pool.query(`
        CREATE TABLE knowledge_base (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          category VARCHAR(100),
          tags JSON DEFAULT '[]'::json,
          author_email VARCHAR(255) NOT NULL,
          status VARCHAR(20) DEFAULT 'draft',
          views INTEGER DEFAULT 0,
          helpful_votes INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP DEFAULT NOW() NOT NULL
        );
      `);
      
      console.log("✅ knowledge_base table created successfully!\n");
    } else {
      console.log("✅ knowledge_base table already exists\n");
    }

    // Check if articles already exist in database
    const existingResult = await pool.query('SELECT COUNT(*) FROM knowledge_base');
    const existingCount = parseInt(existingResult.rows[0].count);
    
    if (existingCount > 0) {
      console.log(`📋 Found ${existingCount} existing articles in database`);
      console.log("⚠️  Skipping migration to avoid duplicates");
      return;
    }

    // Load articles from markdown files
    const kbDir = path.join(process.cwd(), 'attached_assets', 'Knowledgebase');
    
    if (!fs.existsSync(kbDir)) {
      console.log("❌ Knowledgebase directory not found");
      return;
    }

    const files = fs.readdirSync(kbDir).filter(file => file.endsWith('.md'));
    console.log(`📁 Found ${files.length} markdown files to migrate\n`);

    let migratedCount = 0;

    for (const file of files) {
      try {
        const filePath = path.join(kbDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        
        // Parse frontmatter and content
        const { data: frontmatter, content: articleContent } = matter(content);
        
        const article = {
          title: frontmatter.title || file.replace('.md', '').replace(/-/g, ' '),
          content: articleContent,
          category: frontmatter.category || 'General',
          tags: JSON.stringify(frontmatter.tags || []),
          author_email: frontmatter.author || 'system@company.com',
          status: frontmatter.status || 'published',
          views: frontmatter.views || 0,
          helpful_votes: frontmatter.helpful_votes || 0,
          created_at: frontmatter.created_at || new Date().toISOString(),
          updated_at: frontmatter.updated_at || new Date().toISOString()
        };

        // Insert into database
        await pool.query(`
          INSERT INTO knowledge_base (title, content, category, tags, author_email, status, views, helpful_votes, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
          article.title,
          article.content,
          article.category,
          article.tags,
          article.author_email,
          article.status,
          article.views,
          article.helpful_votes,
          article.created_at,
          article.updated_at
        ]);

        console.log(`✅ Migrated: ${article.title} (${article.category})`);
        migratedCount++;
        
      } catch (error) {
        console.error(`❌ Error migrating ${file}:`, error.message);
      }
    }

    console.log(`\n🎉 Migration completed! ${migratedCount}/${files.length} articles migrated successfully`);
    
    // Verify migration
    const finalResult = await pool.query('SELECT COUNT(*) FROM knowledge_base');
    const finalCount = parseInt(finalResult.rows[0].count);
    console.log(`📊 Total articles in database: ${finalCount}`);

  } catch (error) {
    console.error("❌ Migration failed:", error);
  } finally {
    await pool.end();
  }
}

migrateKnowledgeBase();
