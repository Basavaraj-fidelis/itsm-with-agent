
import { Router } from "express";
import { db } from "./db";
import { users } from "../shared/user-schema";
import { eq } from "drizzle-orm";

const router = Router();

// Get all users
router.get("/", async (req, res) => {
  try {
    const allUsers = await db.select({
      id: users.id,
      email: users.email,
      full_name: users.full_name,
      role: users.role,
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
      full_name: users.full_name,
      role: users.role,
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
    const { email, full_name, role, password } = req.body;
    
    const newUser = await db.insert(users).values({
      email,
      full_name,
      role,
      password_hash: password, // In production, this should be hashed
      is_active: true,
      created_at: new Date().toISOString()
    }).returning({
      id: users.id,
      email: users.email,
      full_name: users.full_name,
      role: users.role,
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
    const { email, full_name, role, is_active } = req.body;
    
    const updatedUser = await db.update(users)
      .set({
        email,
        full_name,
        role,
        is_active,
        updated_at: new Date().toISOString()
      })
      .where(eq(users.id, req.params.id))
      .returning({
        id: users.id,
        email: users.email,
        full_name: users.full_name,
        role: users.role,
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

export { router as userRoutes };
