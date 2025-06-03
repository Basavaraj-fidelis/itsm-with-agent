
import { Router } from "express";
import { db } from "./db";
import { users, userSessions } from "../shared/user-schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

const router = Router();

// Get all users
router.get("/", async (req, res) => {
  try {
    const allUsers = await db.select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      department: users.department,
      phone: users.phone,
      is_active: users.is_active,
      created_at: users.created_at,
      last_login: users.last_login
    }).from(users);
    
    res.json(allUsers);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

// Get user by ID
router.get("/:id", async (req, res) => {
  try {
    const user = await db.select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      department: users.department,
      phone: users.phone,
      is_active: users.is_active,
      created_at: users.created_at,
      last_login: users.last_login
    }).from(users).where(eq(users.id, req.params.id));
    
    if (user.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.json(user[0]);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Failed to fetch user" });
  }
});

// Create new user
router.post("/", async (req, res) => {
  try {
    const { email, name, role, password, department, phone } = req.body;
    
    // Hash the password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);
    
    const newUser = await db.insert(users).values({
      email,
      name,
      role: role || "user",
      password_hash,
      department,
      phone,
      is_active: true
    }).returning({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      department: users.department,
      phone: users.phone,
      is_active: users.is_active,
      created_at: users.created_at
    });
    
    res.status(201).json(newUser[0]);
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ message: "Failed to create user" });
  }
});

// Update user
router.put("/:id", async (req, res) => {
  try {
    const { email, name, role, department, phone, is_active } = req.body;
    
    const updatedUser = await db.update(users)
      .set({
        email,
        name,
        role,
        department,
        phone,
        is_active,
        updated_at: new Date()
      })
      .where(eq(users.id, req.params.id))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        department: users.department,
        phone: users.phone,
        is_active: users.is_active,
        created_at: users.created_at
      });
    
    if (updatedUser.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.json(updatedUser[0]);
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ message: "Failed to update user" });
  }
});

// Delete user
router.delete("/:id", async (req, res) => {
  try {
    const deletedUser = await db.delete(users)
      .where(eq(users.id, req.params.id))
      .returning({ id: users.id });
    
    if (deletedUser.length === 0) {
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
