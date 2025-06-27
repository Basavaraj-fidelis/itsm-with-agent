
import pg from 'pg';
const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL || 
  "postgres://avnadmin:AVNS_YOa-jMJ2ghMv9bcWgze@pg-2d00a622-basureddy2020-11ac.l.aivencloud.com:21320/defaultdb";

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
});

async function fixTicketStatusLogic() {
  try {
    console.log("🔧 Fixing ticket status and assignment logic...\n");
    
    // 1. Fix tickets with status 'new' that have assignments (should not be assigned)
    const newTicketsWithAssignments = await pool.query(`
      UPDATE tickets 
      SET assigned_to = NULL, assigned_group = NULL, updated_at = NOW()
      WHERE status = 'new' AND (assigned_to IS NOT NULL OR assigned_group IS NOT NULL)
      RETURNING ticket_number, title;
    `);
    
    if (newTicketsWithAssignments.rows.length > 0) {
      console.log("✅ Fixed 'new' tickets that had assignments:");
      newTicketsWithAssignments.rows.forEach(ticket => {
        console.log(`   - ${ticket.ticket_number}: ${ticket.title}`);
      });
    }
    
    // 2. Fix tickets with status 'assigned' that don't have assignments
    const assignedTicketsWithoutAssignments = await pool.query(`
      SELECT id, ticket_number, title, type 
      FROM tickets 
      WHERE status = 'assigned' AND assigned_to IS NULL;
    `);
    
    if (assignedTicketsWithoutAssignments.rows.length > 0) {
      console.log("\n⚠️  Found 'assigned' tickets without assignments, fixing...");
      
      // Get available users for assignment
      const users = await pool.query(`
        SELECT id, email, role, first_name, last_name 
        FROM users 
        WHERE is_active = true AND role IN ('technician', 'admin', 'manager')
        ORDER BY role, email;
      `);
      
      if (users.rows.length > 0) {
        let assignmentIndex = 0;
        
        for (const ticket of assignedTicketsWithoutAssignments.rows) {
          const assignedUser = users.rows[assignmentIndex % users.rows.length];
          const assignedGroup = assignedUser.role === 'technician' ? 'Technical Team' : 
                               assignedUser.role === 'manager' ? 'Management Team' : 'IT Support';
          
          await pool.query(`
            UPDATE tickets 
            SET assigned_to = $1, assigned_group = $2, updated_at = NOW()
            WHERE id = $3;
          `, [assignedUser.email, assignedGroup, ticket.id]);
          
          console.log(`   ✅ ${ticket.ticket_number}: Assigned to ${assignedUser.email} (${assignedGroup})`);
          assignmentIndex++;
        }
      } else {
        // No users available, change status to 'new'
        await pool.query(`
          UPDATE tickets 
          SET status = 'new', updated_at = NOW()
          WHERE status = 'assigned' AND assigned_to IS NULL;
        `);
        console.log("   ⚠️  No users available for assignment, changed status back to 'new'");
      }
    }
    
    // 3. Fix tickets with 'in_progress', 'pending', 'resolved' status that don't have assignments
    const activeTicketsWithoutAssignments = await pool.query(`
      SELECT id, ticket_number, title, status 
      FROM tickets 
      WHERE status IN ('in_progress', 'pending', 'resolved') AND assigned_to IS NULL;
    `);
    
    if (activeTicketsWithoutAssignments.rows.length > 0) {
      console.log("\n⚠️  Found active tickets without assignments, fixing...");
      
      // Get available users
      const users = await pool.query(`
        SELECT id, email, role 
        FROM users 
        WHERE is_active = true AND role IN ('technician', 'admin', 'manager')
        ORDER BY role, email;
      `);
      
      if (users.rows.length > 0) {
        let assignmentIndex = 0;
        
        for (const ticket of activeTicketsWithoutAssignments.rows) {
          const assignedUser = users.rows[assignmentIndex % users.rows.length];
          const assignedGroup = assignedUser.role === 'technician' ? 'Technical Team' : 
                               assignedUser.role === 'manager' ? 'Management Team' : 'IT Support';
          
          await pool.query(`
            UPDATE tickets 
            SET assigned_to = $1, assigned_group = $2, updated_at = NOW()
            WHERE id = $3;
          `, [assignedUser.email, assignedGroup, ticket.id]);
          
          console.log(`   ✅ ${ticket.ticket_number} (${ticket.status}): Assigned to ${assignedUser.email}`);
          assignmentIndex++;
        }
      } else {
        // No users available, change status to 'assigned' (will be handled above)
        await pool.query(`
          UPDATE tickets 
          SET status = 'new', updated_at = NOW()
          WHERE status IN ('in_progress', 'pending', 'resolved') AND assigned_to IS NULL;
        `);
        console.log("   ⚠️  No users available, changed status to 'new'");
      }
    }
    
    console.log("\n📊 Final ticket status summary:");
    const statusSummary = await pool.query(`
      SELECT 
        status,
        COUNT(*) as count,
        COUNT(CASE WHEN assigned_to IS NOT NULL THEN 1 END) as with_assignment,
        COUNT(CASE WHEN assigned_to IS NULL THEN 1 END) as without_assignment
      FROM tickets 
      GROUP BY status 
      ORDER BY status;
    `);
    
    statusSummary.rows.forEach(row => {
      console.log(`   ${row.status}: ${row.count} total (${row.with_assignment} assigned, ${row.without_assignment} unassigned)`);
    });
    
    console.log("\n🎉 Ticket status logic fixed successfully!");
    
  } catch (error) {
    console.error("❌ Error fixing ticket status:", error);
  } finally {
    await pool.end();
  }
}

fixTicketStatusLogic();
