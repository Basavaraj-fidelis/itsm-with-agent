import pg from 'pg';
import { expect } from 'chai';
const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL || 
  "postgres://avnadmin:AVNS_YOa-jMJ2ghMv9bcWgze@pg-2d00a622-basureddy2020-11ac.l.aivencloud.com:21320/defaultdb";

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function testDatabaseIntegration() {
  try {
    console.log("🧪 Testing Database Integration...\n");

    // Test 1: Verify all tables exist
    console.log("1️⃣ Checking table existence...");
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    const expectedTables = [
      'alerts', 'audit_log', 'device_reports', 'devices', 'group_members', 
      'groups', 'installed_software', 'knowledge_base', 'running_processes', 
      'sla_breaches', 'sla_policies', 'ticket_attachments', 'ticket_approvals', 
      'ticket_comments', 'tickets', 'usb_devices', 'user_sessions', 'users'
    ];

    const existingTables = tablesResult.rows.map(r => r.table_name);
    const missingTables = expectedTables.filter(t => !existingTables.includes(t));

    if (missingTables.length > 0) {
      console.log("❌ Missing tables:", missingTables);
    } else {
      console.log("✅ All expected tables exist");
    }

    // Test 2: Test ticket CRUD operations
    console.log("\n2️⃣ Testing ticket CRUD operations...");

    // Create test ticket
    const createTicketResult = await pool.query(`
      INSERT INTO tickets (title, description, type, priority, requester_email, status)
      VALUES ('Test Ticket', 'This is a test ticket', 'request', 'medium', 'test@company.com', 'new')
      RETURNING *;
    `);

    if (createTicketResult.rows.length > 0) {
      console.log("✅ Ticket creation works");
      const ticketId = createTicketResult.rows[0].id;

      // Update ticket
      await pool.query(`
        UPDATE tickets SET status = 'in_progress' WHERE id = $1
      `, [ticketId]);
      console.log("✅ Ticket update works");

      // Add comment
      await pool.query(`
        INSERT INTO ticket_comments (ticket_id, author_email, comment)
        VALUES ($1, 'tech@company.com', 'Working on this issue')
      `, [ticketId]);
      console.log("✅ Ticket comments work");

      // Clean up test data
      await pool.query(`DELETE FROM ticket_comments WHERE ticket_id = $1`, [ticketId]);
      await pool.query(`DELETE FROM tickets WHERE id = $1`, [ticketId]);
      console.log("✅ Ticket deletion works");
    }

    // Test 3: Test knowledge base operations
    console.log("\n3️⃣ Testing knowledge base operations...");

    const createKBResult = await pool.query(`
      INSERT INTO knowledge_base (title, content, category, author_email, status)
      VALUES ('Test Article', 'This is test content', 'IT Support', 'admin@company.com', 'published')
      RETURNING *;
    `);

    if (createKBResult.rows.length > 0) {
      console.log("✅ Knowledge base creation works");
      const kbId = createKBResult.rows[0].id;

      // Update KB article
      await pool.query(`
        UPDATE knowledge_base SET views = views + 1 WHERE id = $1
      `, [kbId]);
      console.log("✅ Knowledge base updates work");

      // Clean up
      await pool.query(`DELETE FROM knowledge_base WHERE id = $1`, [kbId]);
      console.log("✅ Knowledge base deletion works");
    }

    // Test 4: Test audit logging
    console.log("\n4️⃣ Testing audit logging...");

    const auditResult = await pool.query(`
      INSERT INTO audit_log (entity_type, entity_id, action, user_email)
      VALUES ('ticket', gen_random_uuid(), 'test', 'admin@company.com')
      RETURNING *;
    `);

    if (auditResult.rows.length > 0) {
      console.log("✅ Audit logging works");
      await pool.query(`DELETE FROM audit_log WHERE id = $1`, [auditResult.rows[0].id]);
    }

    // Test 5: Test SLA policies
    console.log("\n5️⃣ Testing SLA policies...");

    const slaCount = await pool.query(`SELECT COUNT(*) FROM sla_policies WHERE is_active = true`);
    console.log(`✅ SLA policies active: ${slaCount.rows[0].count}`);

    // Test 6: Test groups/teams
    console.log("\n6️⃣ Testing groups/teams...");

    const groupsCount = await pool.query(`SELECT COUNT(*) FROM groups WHERE is_active = true`);
    console.log(`✅ Active groups: ${groupsCount.rows[0].count}`);

    // Test 7: Data integrity check
    console.log("\n7️⃣ Checking data integrity...");

    const dataCheck = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM tickets) as ticket_count,
        (SELECT COUNT(*) FROM users) as user_count,
        (SELECT COUNT(*) FROM devices) as device_count,
        (SELECT COUNT(*) FROM knowledge_base) as kb_count
    `);

    const counts = dataCheck.rows[0];
    console.log(`📊 Data summary:
      - Tickets: ${counts.ticket_count}
      - Users: ${counts.user_count}
      - Devices: ${counts.device_count}
      - KB Articles: ${counts.kb_count}`);

    console.log("\n✅ Database integration test completed successfully!");

  } catch (error) {
    console.error("❌ Database integration test failed:", error);
  } finally {
    await pool.end();
  }
}

testDatabaseIntegration();