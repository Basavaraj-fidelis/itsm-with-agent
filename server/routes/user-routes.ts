import { Router } from "express";
import { db, pool } from "../db";
import bcrypt from "bcrypt";
import multer from "multer";
import csv from "csv-parser";
import * as XLSX from "xlsx";

const router = Router();

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 124 } // 5MB limit
});

// Import end users from CSV/Excel
router.post("/import-end-users", upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const fileBuffer = req.file.buffer;
    const filename = req.file.originalname.toLowerCase();
    let users: any[] = [];

    // Parse Excel files
    if (filename.endsWith('.xlsx') || filename.endsWith('.xls')) {
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      users = XLSX.utils.sheet_to_json(worksheet);
    }
    // Parse CSV files
    else if (filename.endsWith('.csv')) {
      const csvData = fileBuffer.toString('utf-8');
      users = await new Promise((resolve, reject) => {
        const results: any[] = [];
        const stream = require('stream');
        const readable = new stream.Readable();
        readable.push(csvData);
        readable.push(null);

        readable
          .pipe(csv())
          .on('data', (data: any) => results.push(data))
          .on('end', () => resolve(results))
          .on('error', reject);
      });
    } else {
      return res.status(400).json({ message: "Unsupported file format. Please upload CSV or Excel files." });
    }

    let imported = 0;
    let skipped = 0;

    for (const userData of users) {
      try {
        // Normalize field names (handle different column naming conventions)
        const email = String(userData.email || userData.Email || userData.EMAIL || '').trim().toLowerCase();
        const firstName = String(userData.first_name || userData['First Name'] || userData.firstname || userData.FirstName || '').trim();
        const lastName = String(userData.last_name || userData['Last Name'] || userData.lastname || userData.LastName || '').trim();
        const name = String(userData.name || userData.Name || userData.NAME || `${firstName} ${lastName}`).trim();
        const phone = String(userData.phone || userData.Phone || userData.PHONE || '').trim();
        const department = String(userData.department || userData.Department || userData.DEPARTMENT || '').trim();

        if (!email || !name) {
          console.log(`Skipping user: missing email or name - ${JSON.stringify(userData)}`);
          continue;
        }

        // Check if user already exists
        const existingUser = await pool.query(
          `SELECT id FROM users WHERE email = $1`,
          [email]
        );

        if (existingUser.rows.length > 0) {
          skipped++;
          continue;
        }

        // Generate username from email
        const username = email.split('@')[0];

        // Generate temporary password
        const tempPassword = `TempPass${Math.random().toString(36).slice(-6)}!`;
        const password_hash = await bcrypt.hash(tempPassword, 10);

        // Parse name into first and last name if needed
        let finalFirstName = firstName;
        let finalLastName = lastName;
        if (!firstName && !lastName && name) {
          const nameParts = name.split(' ');
          finalFirstName = nameParts[0] || '';
          finalLastName = nameParts.slice(1).join(' ') || '';
        }

        // Insert new end user
        await pool.query(`
          INSERT INTO users (
            email, username, first_name, last_name, role, 
            password_hash, phone, department, location, is_active,
            preferences, permissions, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
        `, [
          email,
          username,
          finalFirstName,
          finalLastName,
          'end_user',
          password_hash,
          phone || null,
          department || null,
          department || null,
          true,
          JSON.stringify({ temp_password: tempPassword }), // Store temp password in preferences for now
          JSON.stringify([])
        ]);

        imported++;
      } catch (userError) {
        console.error(`Error importing user ${userData.email}:`, userError);
        skipped++;
      }
    }

    res.json({
      message: `Import completed: ${imported} users imported, ${skipped} skipped`,
      imported,
      skipped,
      total: users.length
    });

  } catch (error: any) {
    console.error("Error importing end users:", error);
    res.status(500).json({ 
      message: "Failed to import end users",
      error: error.message 
    });
  }
});

import { storage } from '../storage';
import { DatabaseUtils } from '../utils/database';

// Get user statistics
router.get('/stats', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_users,
        COUNT(CASE WHEN is_locked = true THEN 1 END) as locked_users,
		COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_users
      FROM users
    `);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get all users with enhanced filtering
router.get('/', async (req, res) => {
  try {
    const { search, role, department, status, page = 1, limit = 50, sync_source } = req.query;

    console.log("GET /api/users - Enhanced query with filters:", { search, role, department, status, sync_source });

    let query = `
      SELECT 
        id, email, username, first_name, last_name, role,
        phone, job_title, location, employee_id, department,
        is_active, is_locked, failed_login_attempts,
        created_at, updated_at, last_login, last_password_change,
        manager_id, 
        COALESCE(preferences, '{}') as preferences, 
        COALESCE(permissions, '[]') as permissions,
        CASE 
          WHEN COALESCE(preferences, '{}')->>'ad_synced' = 'true' THEN 'ad'
          ELSE 'local'
        END as sync_source,
        COALESCE(preferences, '{}')->>'ad_last_sync' as last_ad_sync,
        COALESCE(preferences, '{}')->>'ad_groups' as ad_groups
      FROM users
    `;

    const conditions: string[] = [];
    const params: any[] = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      conditions.push(`(
        LOWER(COALESCE(first_name, '')) LIKE LOWER($${paramCount}) OR 
        LOWER(COALESCE(last_name, '')) LIKE LOWER($${paramCount}) OR 
        LOWER(email) LIKE LOWER($${paramCount}) OR 
        LOWER(COALESCE(username, '')) LIKE LOWER($${paramCount}) OR
        LOWER(COALESCE(employee_id, '')) LIKE LOWER($${paramCount})
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
      conditions.push(`COALESCE(department, location, '') = $${paramCount}`);
      params.push(department);
    }

    if (sync_source && sync_source !== 'all') {
      if (sync_source === 'ad') {
        conditions.push(`COALESCE(preferences, '{}')->>'ad_synced' = 'true'`);
      } else if (sync_source === 'local') {
        conditions.push(`(COALESCE(preferences, '{}')->>'ad_synced' IS NULL OR COALESCE(preferences, '{}')->>'ad_synced' = 'false')`);
      }
    }

    if (status === 'active') {
      conditions.push('COALESCE(is_active, true) = true AND COALESCE(is_locked, false) = false');
    } else if (status === 'inactive') {
      conditions.push('COALESCE(is_active, true) = false OR COALESCE(is_locked, false) = true');
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

    const result = await pool.query(query, params);

    let countQuery = `SELECT COUNT(*) as total FROM users`;
    if (conditions.length > 0) {
      countQuery += ` WHERE ${conditions.join(' AND ')}`;
    }

    const countResult = await pool.query(countQuery, params.slice(0, -2));
    const total = parseInt(countResult.rows[0]?.total || 0);

    // Get user statistics with proper null handling
    const statsQuery = `
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN COALESCE(is_active, true) = true AND COALESCE(is_locked, false) = false THEN 1 END) as active_users,
        COUNT(CASE WHEN COALESCE(is_active, true) = false OR COALESCE(is_locked, false) = true THEN 1 END) as inactive_users,
        COUNT(CASE WHEN COALESCE(preferences, '{}')->>'ad_synced' = 'true' THEN 1 END) as ad_synced_users,
        COUNT(CASE WHEN COALESCE(preferences, '{}')->>'ad_synced' IS NULL OR COALESCE(preferences, '{}')->>'ad_synced' = 'false' THEN 1 END) as local_users
      FROM users
    `;

    const statsResult = await pool.query(statsQuery);
    const stats = statsResult.rows[0];

    const users = result.rows.map(user => {
      // Parse preferences and permissions safely
      let preferences = {};
      let permissions = [];

      try {
        preferences = typeof user.preferences === 'string' ? JSON.parse(user.preferences) : (user.preferences || {});
      } catch (e) {
        console.warn('Failed to parse user preferences:', e);
        preferences = {};
      }

      try {
        permissions = typeof user.permissions === 'string' ? JSON.parse(user.permissions) : (user.permissions || []);
      } catch (e) {
        console.warn('Failed to parse user permissions:', e);
        permissions = [];
      }

      return {
        ...user,
        name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || user.email?.split('@')[0],
        department: user.department || user.location || 'N/A',
        status: (user.is_active !== false) && (user.is_locked !== true) ? 'active' : 'inactive',
        security_status: (user.failed_login_attempts || 0) > 0 ? 'warning' : 'normal',
        ad_synced: user.sync_source === 'ad',
        ad_groups: user.ad_groups ? (typeof user.ad_groups === 'string' ? 
          (() => {
            try { return JSON.parse(user.ad_groups); } catch { return []; }
          })() 
          : user.ad_groups) : [],
        last_ad_sync: user.last_ad_sync,
        preferences,
        permissions
      };
    });

    console.log(`Enhanced users query returned ${users.length} users out of ${total} total`);

    res.json({
      data: users,
      stats: {
        total: parseInt(stats.total_users) || 0,
        active: parseInt(stats.active_users) || 0,
        inactive: parseInt(stats.inactive_users) || 0,
        ad_synced: parseInt(stats.ad_synced_users) || 0,
        local: parseInt(stats.local_users) || 0
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
    const result = await pool.query(`
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
    const result = await pool.query(`
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
    const { email, name, first_name, last_name, role, password, department, phone } = req.body;

    if (!email || (!name && !first_name)) {
      return res.status(400).json({ message: "Email and name/first_name are required" });
    }

    if (!password) {
      return res.status(400).json({ message: "Password is required" });
    }

    // Use provided first_name/last_name or parse from name
    let firstName, lastName;
    if (first_name || last_name) {
      firstName = first_name || '';
      lastName = last_name || '';
    } else {
      const nameParts = (name || '').trim().split(' ');
      firstName = nameParts[0] || '';
      lastName = nameParts.slice(1).join(' ') || '';
    }
    const username = email.split('@')[0]; // Generate username from email

    // Check if user already exists
    const existingUser = await pool.query(`
      SELECT id FROM users WHERE email = $1 OR username = $2
    `, [email.toLowerCase(), username]);

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: "User with this email or username already exists" });
    }

    // Hash the password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    const result = await pool.query(`
      INSERT INTO users (
        email, username, first_name, last_name, role, 
        password_hash, phone, location, department, is_active,
        preferences, permissions, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
      RETURNING id, email, username, first_name, last_name, role, phone, location, department, is_active, created_at
    `, [
      email.toLowerCase(),
      username,
      firstName,
      lastName,
      role || "end_user",
      password_hash,
      phone || null,
      department || null,
      department || null,
      true,
      JSON.stringify({}), // empty preferences
      JSON.stringify([])  // empty permissions
    ]);

    const newUser = result.rows[0];
    newUser.name = `${newUser.first_name || ''} ${newUser.last_name || ''}`.trim();
    newUser.department = department || 'N/A';
    newUser.status = 'active';

    console.log("User created successfully:", { id: newUser.id, email: newUser.email, name: newUser.name });

    res.status(201).json(newUser);
  } catch (error: any) {
    console.error("Error creating user:", error);
    res.status(500).json({ 
      message: "Failed to create user",
      error: error.message 
    });
  }
});

// Update user
router.put("/:id", async (req, res) => {
  try {
    console.log("PUT /api/users/:id - Updating user:", req.params.id);
    console.log("Request body:", req.body);

    const { email, name, first_name, last_name, role, department, phone, is_active, is_locked, password } = req.body;

    // Validate required fields
    if (!email || (!name && !first_name) || !role) {
      return res.status(400).json({ message: "Email, name/first_name, and role are required" });
    }

    // Check if user exists first
    const userCheck = await pool.query(`SELECT id, email, is_locked, first_name, last_name FROM users WHERE id = $1`, [req.params.id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    // Use provided first_name/last_name or parse from name
    let firstName, lastName;
    if (first_name !== undefined || last_name !== undefined) {
      firstName = first_name || '';
      lastName = last_name || '';
    } else if (name) {
      const nameParts = (name || '').trim().split(' ');
      firstName = nameParts[0] || '';
      lastName = nameParts.slice(1).join(' ') || '';
    } else {
      // Keep existing values if no name data provided
      const currentUser = userCheck.rows[0];
      firstName = currentUser.first_name || '';
      lastName = currentUser.last_name || '';
    }
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if email is being changed and if it conflicts with another user
    const currentUser = userCheck.rows[0];
    if (email.toLowerCase() !== currentUser.email.toLowerCase()) {
      const emailCheck = await pool.query(`SELECT id FROM users WHERE email = $1 AND id != $2`, [email.toLowerCase(), req.params.id]);
      if (emailCheck.rows.length > 0) {
        return res.status(400).json({ message: "Email already exists for another user" });
      }
    }

    let updateQuery = `
      UPDATE users 
      SET email = $1, first_name = $2, last_name = $3, role = $4, 
          phone = $5, location = $6, department = $7, is_active = $8, 
          is_locked = $9, updated_at = NOW()
    `;
    let values = [
      email.toLowerCase(), 
      firstName, 
      lastName, 
      role, 
      phone || null, 
      department || null, 
      department || null, 
      is_active !== undefined ? is_active : true,
      is_locked !== undefined ? is_locked : false
    ];

    // If password is provided, update it too
    if (password && password.trim()) {
      const saltRounds = 10;
      const password_hash = await bcrypt.hash(password, saltRounds);
      updateQuery += `, password_hash = $10, last_password_change = NOW() WHERE id = $11`;
      values.push(password_hash, req.params.id);
    } else {
      updateQuery += ` WHERE id = $10`;
      values.push(req.params.id);
    }

    updateQuery += ` RETURNING id, email, username, first_name, last_name, role, phone, location, department, is_active, is_locked, created_at, updated_at`;

    console.log("Executing update query:", updateQuery);
    console.log("With values (excluding password):", values.map((v, i) => i === values.length - 2 && password ? '[PASSWORD HASH]' : v));

    const result = await pool.query(updateQuery, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found or update failed" });
    }

    const updatedUser = result.rows[0];
    updatedUser.name = `${updatedUser.first_name || ''} ${updatedUser.last_name || ''}`.trim();
    updatedUser.department = updatedUser.department || updatedUser.location || 'N/A';
    updatedUser.status = (updatedUser.is_active !== false) && (updatedUser.is_locked !== true) ? 'active' : 'inactive';

    console.log("User updated successfully:", { 
      id: updatedUser.id, 
      email: updatedUser.email, 
      name: updatedUser.name,
      status: updatedUser.status 
    });

    res.json(updatedUser);
  } catch (error: any) {
    console.error("Error updating user:", error);
    res.status(500).json({ 
      message: "Failed to update user",
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Delete user (soft delete)
router.delete("/:id", async (req, res) => {
  try {
    const result = await pool.query(`
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

// Lock user endpoint
router.post("/:id/lock", async (req, res) => {
  try {
    const { reason } = req.body;
    const userId = req.params.id;

    console.log(`Attempting to lock user ${userId} with reason: ${reason}`);

    // First check if user exists
    const userCheck = await pool.query(`SELECT id, email, username, is_locked FROM users WHERE id = $1`, [userId]);

    if (userCheck.rows.length === 0) {
      console.log(`User ${userId} not found`);
      return res.status(404).json({ message: "User not found" });
    }

    const user = userCheck.rows[0];

    if (user.is_locked) {
      console.log(`User ${userId} is already locked`);
      return res.status(400).json({ message: "User is already locked" });
    }

    // Update user to locked status
    const result = await pool.query(`
      UPDATE users 
      SET is_locked = true, updated_at = NOW() 
      WHERE id = $1 
      RETURNING id, email, username, first_name, last_name, is_locked
    `, [userId]);

    if (result.rows.length === 0) {
      console.log(`Failed to lock user ${userId} - no rows updated`);
      return res.status(500).json({ message: "Failed to update user status" });
    }

    // Log the action in audit trail
    try {
      await pool.query(`
        INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values, ip_address)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        userId, 
        'user_locked', 
        'users', 
        userId, 
        JSON.stringify({ is_locked: true, reason: reason || 'Manual lock' }),
        req.ip || req.connection.remoteAddress
      ]);
    } catch (auditError) {
      console.log("Audit log failed but user lock succeeded:", auditError);
    }

    const lockedUser = result.rows[0];
    console.log("User locked successfully:", lockedUser);

    res.json({ 
      message: "User locked successfully", 
      user: {
        ...lockedUser,
        status: 'inactive'
      }
    });
  } catch (error: any) {
    console.error("Error locking user:", error);
    console.error("Error details:", error.message, error.stack);
    res.status(500).json({ 
      message: "Failed to lock user", 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Unlock user endpoint
router.post("/:id/unlock", async (req, res) => {
  try {
    const userId = req.params.id;

    console.log(`Attempting to unlock user ${userId}`);

    // First check if user exists
    const userCheck = await pool.query(`SELECT id, email, username, is_locked FROM users WHERE id = $1`, [userId]);

    if (userCheck.rows.length === 0) {
      console.log(`User ${userId} not found`);
      return res.status(404).json({ message: "User not found" });
    }

    const user = userCheck.rows[0];

    if (!user.is_locked) {
      console.log(`User ${userId} is already unlocked`);
      return res.status(400).json({ message: "User is already unlocked" });
    }

    // Update user to unlocked status
    const result = await pool.query(`
      UPDATE users 
      SET is_locked = false, failed_login_attempts = 0, updated_at = NOW() 
      WHERE id = $1 
      RETURNING id, email, username, first_name, last_name, is_locked
    `, [userId]);

    if (result.rows.length === 0) {
      console.log(`Failed to unlock user ${userId} - no rows updated`);
      return res.status(500).json({ message: "Failed to update user status" });
    }

    // Log the action in audit trail
    try {
      await pool.query(`
        INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values, ip_address)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        userId, 
        'user_unlocked', 
        'users', 
        userId, 
        JSON.stringify({ is_locked: false }),
        req.ip || req.connection.remoteAddress
      ]);
    } catch (auditError) {
      console.log("Audit log failed but user unlock succeeded:", auditError);
    }

    const unlockedUser = result.rows[0];
    console.log("User unlocked successfully:", unlockedUser);

    res.json({ 
      message: "User unlocked successfully", 
      user: {
        ...unlockedUser,
        status: 'active'
      }
    });
  } catch (error: any) {
    console.error("Error unlocking user:", error);
    console.error("Error details:", error.message, error.stack);
    res.status(500).json({ 
      message: "Failed to unlock user", 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
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
    const session = await pool.query(`
      SELECT 
        user_id, token
      FROM user_sessions
      WHERE token = $1
    `, [token]);

    if (session.rows.length === 0) {
      return res.status(401).json({ message: "Invalid session" });
    }

    const user = await pool.query(`
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
    await pool.query(`
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

// Add authMiddleware import
import { authenticateToken as authMiddleware } from '../middleware/auth-middleware';

// Lock user endpoint
router.post('/:id/lock', authMiddleware, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ message: 'Reason for locking is required' });
    }

    const success = await storage.lockUser(id, reason);
    if (!success) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = await storage.getUserById(id);
    res.json({ 
      message: 'User locked successfully',
      user: user
    });
  } catch (error) {
    console.error('Error locking user:', error);
    res.status(500).json({ message: 'Failed to lock user' });
  }
});

// Unlock user endpoint
router.post('/:id/unlock', authMiddleware, async (req: any, res: any) => {
  try {
    const { id } = req.params;

    const success = await storage.unlockUser(id);
    if (!success) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = await storage.getUserById(id);
    res.json({ 
      message: 'User unlocked successfully',
      user: user
    });
  } catch (error) {
    console.error('Error unlocking user:', error);
    res.status(500).json({ message: 'Failed to unlock user' });
  }
});

export { router as userRoutes };