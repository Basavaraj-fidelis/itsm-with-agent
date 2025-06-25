
import pg from 'pg';
const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL || 
  "postgres://avnadmin:AVNS_YOa-jMJ2ghMv9bcWgze@pg-2d00a622-basureddy2020-11ac.l.aivencloud.com:21320/defaultdb";

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
});

async function migrateUserAssignments() {
  try {
    console.log("🔄 Migrating ticket assignments to new user system...");
    
    // Get all technicians
    const technicians = await pool.query(`
      SELECT id, username, first_name, last_name 
      FROM users 
      WHERE role = 'technician' AND is_active = true
    `);
    
    if (technicians.rows.length === 0) {
      console.log("⚠️ No technicians found. Creating a default technician...");
      
      // Create a default technician if none exists
      const bcrypt = await import('bcrypt');
      const password_hash = await bcrypt.hash('Tech123!', 10);
      
      const newTech = await pool.query(`
        INSERT INTO users (
          email, username, first_name, last_name, role,
          password_hash, is_active, job_title
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, username
      `, [
        'technician@company.com',
        'tech_default',
        'Default',
        'Technician',
        'technician',
        password_hash,
        true,
        'IT Technician'
      ]);
      
      console.log(`✅ Created default technician: ${newTech.rows[0].username}`);
      technicians.rows.push(newTech.rows[0]);
    }
    
    // Update tickets that are assigned but don't have a valid assigned_to
    const assignedTickets = await pool.query(`
      SELECT id, assigned_to, status 
      FROM tickets 
      WHERE status IN ('assigned', 'in_progress', 'pending') 
        AND (assigned_to IS NULL OR assigned_to = '')
    `);
    
    console.log(`📋 Found ${assignedTickets.rows.length} tickets needing assignment...`);
    
    let assignedCount = 0;
    for (const ticket of assignedTickets.rows) {
      // Assign to first available technician (simple round-robin)
      const techIndex = assignedCount % technicians.rows.length;
      const assignedTech = technicians.rows[techIndex];
      
      await pool.query(`
        UPDATE tickets 
        SET assigned_to = $1, updated_at = NOW()
        WHERE id = $2
      `, [assignedTech.id, ticket.id]);
      
      assignedCount++;
    }
    
    console.log(`✅ Updated ${assignedCount} ticket assignments`);
    
    // Update tickets with pending status that aren't assigned
    await pool.query(`
      UPDATE tickets 
      SET status = 'new' 
      WHERE status = 'pending' AND (assigned_to IS NULL OR assigned_to = '')
    `);
    
    console.log("✅ Updated pending tickets without assignments to 'new' status");
    
    console.log("\n🎉 User assignment migration completed successfully!");
    
  } catch (error) {
    console.error("❌ Error migrating user assignments:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

migrateUserAssignments();
