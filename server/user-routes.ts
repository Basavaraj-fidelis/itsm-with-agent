import { Router } from "express";
import { db } from "./db";
import bcrypt from "bcrypt";

const router = Router();

// Get all users with enhanced ITSM fields and AD sync status
router.get("/", async (req, res) => {
  try {
    const { search, role, department, status, page = 1, limit = 50, sync_source } = req.query;

    console.log("GET /api/users - Enhanced query with filters:", { search, role, department, status, sync_source });

    let query = `
      SELECT 
        id, email, username, first_name, last_name, role,
        phone, job_title, location, employee_id, department,
        is_active, is_locked, failed_login_attempts,
        created_at, updated_at, last_login, last_password_change,
        manager_id, preferences, permissions,
        CASE 
          WHEN preferences->>'ad_synced' = 'true' THEN 'ad'
          ELSE 'local'
        END as sync_source,
        preferences->>'ad_last_sync' as last_ad_sync,
        preferences->>'ad_groups' as ad_groups
      FROM users
    `;

    const conditions: string[] = [];
    const params: any[] = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      conditions.push(`(
        LOWER(first_name) LIKE LOWER($${paramCount}) OR 
        LOWER(last_name) LIKE LOWER($${paramCount}) OR 
        LOWER(email) LIKE LOWER($${paramCount}) OR 
        LOWER(username) LIKE LOWER($${paramCount}) OR
        LOWER(employee_id) LIKE LOWER($${paramCount})
      )`);
      params.push(`%${search}%`);
    }

    if (role && role !== 'all') {
      paramCount++;
      conditions.push(`role = $${paramCount}`);
      params.push(role);
    }

    if (department && department !== 'all') {
      paramCount++;
      conditions.push(`department = $${paramCount}`);
      params.push(department);
    }

    if (sync_source && sync_source !== 'all') {
      if (sync_source === 'ad') {
        conditions.push(`preferences->>'ad_synced' = 'true'`);
      } else if (sync_source === 'local') {
        conditions.push(`(preferences->>'ad_synced' IS NULL OR preferences->>'ad_synced' = 'false')`);
      }
    }

    if (status === 'active') {
      conditions.push('is_active = true AND is_locked = false');
    } else if (status === 'inactive') {
      conditions.push('is_active = false OR is_locked = true');
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` ORDER BY created_at DESC`;

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    params.push(parseInt(limit as string));
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(offset);

    console.log("Executing enhanced user query:", query);
    console.log("With parameters:", params);

    const result = await db.query(query, params);

    let countQuery = `SELECT COUNT(*) as total FROM users`;
    if (conditions.length > 0) {
      countQuery += ` WHERE ${conditions.join(' AND ')}`;
    }

    const countResult = await db.query(countQuery, params.slice(0, -2));
    const total = parseInt(countResult.rows[0]?.total || 0);

    // Get user statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN is_active = true AND is_locked = false THEN 1 END) as active_users,
        COUNT(CASE WHEN is_active = false OR is_locked = true THEN 1 END) as inactive_users,
        COUNT(CASE WHEN preferences->>'ad_synced' = 'true' THEN 1 END) as ad_synced_users,
        COUNT(CASE WHEN preferences->>'ad_synced' IS NULL OR preferences->>'ad_synced' = 'false' THEN 1 END) as local_users
      FROM users
    `;
    
    const statsResult = await db.query(statsQuery);
    const stats = statsResult.rows[0];

    const users = result.rows.map(user => ({
      ...user,
      name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || user.email?.split('@')[0],
      department: user.department || user.location || 'N/A',
      status: user.is_active && !user.is_locked ? 'active' : 'inactive',
      security_status: user.failed_login_attempts > 0 ? 'warning' : 'normal',
      is_ad_synced: user.sync_source === 'ad',
      ad_groups: user.ad_groups ? JSON.parse(user.ad_groups) : [],
      last_ad_sync: user.last_ad_sync
    }));

    console.log(`Enhanced users query returned ${users.length} users out of ${total} total`);

    res.json({
      data: users,
      stats: {
        total: parseInt(stats.total_users),
        active: parseInt(stats.active_users),
        inactive: parseInt(stats.inactive_users),
        ad_synced: parseInt(stats.ad_synced_users),
        local: parseInt(stats.local_users)
      },
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages: Math.ceil(total / parseInt(limit as string))
      }
    });
  } catch (error: any) {
    console.error("Error fetching users:", error);
    res.status(500).json({ 
      message: "Failed to fetch users",
      error: error.message 
    });
  }
});

// Get user departments for filtering
router.get("/departments", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT DISTINCT department 
      FROM users 
      WHERE department IS NOT NULL AND department != ''
      ORDER BY department
    `);

    const departments = result.rows.map(row => row.department);
    res.json(departments);
  } catch (error: any) {
    console.error("Error fetching departments:", error);
    res.status(500).json({ message: "Failed to fetch departments" });
  }
});

// Bulk sync users from AD
router.post("/bulk-ad-sync", async (req, res) => {
  try {
    const { userEmails } = req.body;
    
    if (!userEmails || !Array.isArray(userEmails)) {
      return res.status(400).json({ message: "User emails array is required" });
    }

    const results = [];
    
    for (const email of userEmails) {
      try {
        // Call AD sync for each user
        const syncResponse = await fetch(`${process.env.API_URL || 'http://0.0.0.0:5000'}/api/ad/sync-user`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': req.headers.authorization
          },
          body: JSON.stringify({ username: email.split('@')[0] })
        });

        if (syncResponse.ok) {
          const syncResult = await syncResponse.json();
          results.push({ email, status: 'success', user: syncResult.user });
        } else {
          results.push({ email, status: 'failed', error: 'AD sync failed' });
        }
      } catch (error) {
        results.push({ email, status: 'failed', error: error.message });
      }
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const failureCount = results.filter(r => r.status === 'failed').length;

    res.json({
      message: `Bulk sync completed: ${successCount} successful, ${failureCount} failed`,
      results,
      summary: { success: successCount, failed: failureCount }
    });
  } catch (error: any) {
    console.error("Error in bulk AD sync:", error);
    res.status(500).json({ message: "Failed to perform bulk AD sync" });
  }
});

// Get user by ID
router.get("/:id", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        id, email, username, first_name, last_name, role,
        phone, job_title, location, is_active, is_locked,
        created_at, last_login
      FROM users 
      WHERE id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = result.rows[0];
    user.name = `${user.first_name || ''} ${user.last_name || ''}`.trim();

    res.json(user);
  } catch (error: any) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Failed to fetch user" });
  }
});

// Create new user
router.post("/", async (req, res) => {
  try {
    const { email, name, role, password, department, phone } = req.body;

    if (!password) {
      return res.status(400).json({ message: "Password is required" });
    }

    // Parse name into first and last name
    const nameParts = (name || '').trim().split(' ');
    const first_name = nameParts[0] || '';
    const last_name = nameParts.slice(1).join(' ') || '';
    const username = email.split('@')[0]; // Generate username from email

    // Check if user already exists
    const existingUser = await db.query(`
      SELECT id FROM users WHERE email = $1 OR username = $2
    `, [email.toLowerCase(), username]);

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: "User with this email or username already exists" });
    }

    // Hash the password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    const result = await db.query(`
      INSERT INTO users (
        email, username, first_name, last_name, role, 
        password_hash, phone, location, department, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, email, username, first_name, last_name, role, phone, location, department, is_active, created_at
    `, [
      email.toLowerCase(),
      username,
      first_name,
      last_name,
      role || "end_user",
      password_hash,
      phone,
      department,
      department,
      true
    ]);

    const newUser = result.rows[0];
    newUser.name = `${newUser.first_name || ''} ${newUser.last_name || ''}`.trim();
    newUser.department = department;

    res.status(201).json(newUser);
  } catch (error: any) {
    console.error("Error creating user:", error);
    res.status(500).json({ message: "Failed to create user" });
  }
});

// Update user
router.put("/:id", async (req, res) => {
  try {
    const { email, name, role, department, phone, is_active, password } = req.body;

    // Parse name into first and last name
    const nameParts = (name || '').trim().split(' ');
    const first_name = nameParts[0] || '';
    const last_name = nameParts.slice(1).join(' ') || '';

    let updateQuery = `
      UPDATE users 
      SET email = $1, first_name = $2, last_name = $3, role = $4, 
          phone = $5, location = $6, department = $7, is_active = $8, updated_at = NOW()
    `;
    let values = [email, first_name, last_name, role, phone, department, department, is_active];

    // If password is provided, update it too
    if (password) {
      const saltRounds = 10;
      const password_hash = await bcrypt.hash(password, saltRounds);
      updateQuery += `, password_hash = $9 WHERE id = $10`;
      values.push(password_hash, req.params.id);
    } else {
      updateQuery += ` WHERE id = $9`;
      values.push(req.params.id);
    }

    updateQuery += ` RETURNING id, email, username, first_name, last_name, role, phone, location, department, is_active, created_at`;

    const result = await db.query(updateQuery, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const updatedUser = result.rows[0];
    updatedUser.name = `${updatedUser.first_name || ''} ${updatedUser.last_name || ''}`.trim();
    updatedUser.department = department;

    res.json(updatedUser);
  } catch (error: any) {
    console.error("Error updating user:", error);
    res.status(500).json({ message: "Failed to update user" });
  }
});

// Delete user (soft delete)
router.delete("/:id", async (req, res) => {
  try {
    const result = await db.query(`
      UPDATE users 
      SET is_active = false, updated_at = NOW() 
      WHERE id = $1 
      RETURNING id
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "User deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting user:", error);
    res.status(500).json({ message: "Failed to delete user" });
  }
});

// Change password endpoint
router.post("/change-password", async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const token = authHeader.substring(7);

    // Get user from session
    const session = await db.query(`
      SELECT 
        user_id, token
      FROM user_sessions
      WHERE token = $1
    `, [token]);

    if (session.rows.length === 0) {
      return res.status(401).json({ message: "Invalid session" });
    }

    const user = await db.query(`
      SELECT 
        id, password_hash
      FROM users
      WHERE id = $1
    `, [session.rows[0].user_id]);

    if (user.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.rows[0].password_hash);

    if (!isValidPassword) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    // Hash new password
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await db.query(`
      UPDATE users
      SET password_hash = $1, updated_at = NOW()
      WHERE id = $2
    `, [newPasswordHash, user.rows[0].id]);

    res.json({ message: "Password changed successfully" });
  } catch (error: any) {
    console.error("Error changing password:", error);
    res.status(500).json({ message: "Failed to change password" });
  }
});

export { router as userRoutes };