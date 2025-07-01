
import pkg from 'pg';
const { Pool } = pkg;

async function updateTicketTags() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://admin:admin@localhost:5432/itsm_db'
  });

  try {
    console.log('🔗 Connecting to database...');
    
    // Get all tickets
    const ticketsResult = await pool.query('SELECT id, title, tags FROM tickets');
    console.log(`📋 Found ${ticketsResult.rows.length} tickets`);

    const commonTechWords = [
      'password', 'login', 'network', 'wifi', 'internet', 'email', 'printer', 
      'mouse', 'keyboard', 'screen', 'monitor', 'computer', 'laptop', 'software',
      'hardware', 'application', 'browser', 'chrome', 'firefox', 'windows',
      'mac', 'phone', 'mobile', 'vpn', 'security', 'virus', 'malware',
      'slow', 'crash', 'freeze', 'error', 'update', 'install', 'connection',
      'troubleshooting', 'troubleshoot', 'fix', 'repair', 'broken'
    ];

    function extractTagsFromTitle(title) {
      const words = title.toLowerCase().split(/\s+/);
      const tags = words.filter(word => 
        word.length > 3 && 
        commonTechWords.includes(word)
      );
      return [...new Set(tags)]; // Remove duplicates
    }

    // Update tickets with extracted tags
    for (const ticket of ticketsResult.rows) {
      try {
        let currentTags = [];
        if (ticket.tags) {
          try {
            currentTags = typeof ticket.tags === 'string' ? JSON.parse(ticket.tags) : ticket.tags;
          } catch (e) {
            currentTags = [];
          }
        }

        const extractedTags = extractTagsFromTitle(ticket.title);
        const allTags = [...new Set([...currentTags, ...extractedTags])];

        if (allTags.length > 0) {
          await pool.query(
            'UPDATE tickets SET tags = $1 WHERE id = $2',
            [JSON.stringify(allTags), ticket.id]
          );
          console.log(`✅ Updated ticket "${ticket.title}" with tags: ${allTags.join(', ')}`);
        }
      } catch (error) {
        console.error(`❌ Error updating ticket ${ticket.id}:`, error);
      }
    }

    console.log('✅ Ticket tags update completed!');
  } catch (error) {
    console.error('❌ Error updating ticket tags:', error);
  } finally {
    await pool.end();
  }
}

updateTicketTags();
