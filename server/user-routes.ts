
import { Router } from "express";
import { db } from "./db";
import bcrypt from "bcrypt";

const router = Router();

// Get all users
router.get("/", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        id, email, username, first_name, last_name, role,
        phone, job_title, location, is_active, is_locked,
        created_at, last_login
      FROM users 
      ORDER BY created_at DESC
    `);
    
    const users = result.rows.map(user => ({
      ...user,
      name: `${user.first_name || ''} ${user.last_name || ''}`.trim()
    }));
    
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Failed to fetch users" });
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
  } catch (error) {
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
        password_hash, phone, location, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, email, username, first_name, last_name, role, phone, location, is_active, created_at
    `, [
      email.toLowerCase(),
      username,
      first_name,
      last_name,
      role || "end_user",
      password_hash,
      phone,
      department,
      true
    ]);
    
    const newUser = result.rows[0];
    newUser.name = `${newUser.first_name || ''} ${newUser.last_name || ''}`.trim();
    newUser.department = department;
    
    res.status(201).json(newUser);
  } catch (error) {
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
          phone = $5, location = $6, is_active = $7, updated_at = NOW()
    `;
    let values = [email, first_name, last_name, role, phone, department, is_active];
    
    // If password is provided, update it too
    if (password) {
      const saltRounds = 10;
      const password_hash = await bcrypt.hash(password, saltRounds);
      updateQuery += `, password_hash = $8 WHERE id = $9`;
      values.push(password_hash, req.params.id);
    } else {
      updateQuery += ` WHERE id = $8`;
      values.push(req.params.id);
    }
    
    updateQuery += ` RETURNING id, email, username, first_name, last_name, role, phone, location, is_active, created_at`;
    
    const result = await db.query(updateQuery, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    
    const updatedUser = result.rows[0];
    updatedUser.name = `${updatedUser.first_name || ''} ${updatedUser.last_name || ''}`.trim();
    updatedUser.department = department;
    
    res.json(updatedUser);
  } catch (error) {
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
  } catch (error) {
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
    const session = await db.select({
      user_id: userSessions.user_id
    }).from(userSessions).where(eq(userSessions.token, token));
    
    if (session.length === 0) {
      return res.status(401).json({ message: "Invalid session" });
    }
    
    const user = await db.select().from(users).where(eq(users.id, session[0].user_id));
    
    if (user.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user[0].password_hash);
    
    if (!isValidPassword) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }
    
    // Hash new password
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);
    
    // Update password
    await db.update(users)
      .set({ 
        password_hash: newPasswordHash,
        updated_at: new Date()
      })
      .where(eq(users.id, user[0].id));
    
    res.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({ message: "Failed to change password" });
  }
});

export { router as userRoutes };
