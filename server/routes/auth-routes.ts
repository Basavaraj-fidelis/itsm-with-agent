import type { Express } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { storage } from "../storage";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

export function registerAuthRoutes(app: Express) {
  // Test endpoint for portal connectivity
  app.get("/api/auth/portal-test", (req, res) => {
    res.json({ 
      message: "Portal API is accessible", 
      timestamp: new Date().toISOString(),
      server: "Express"
    });
  });

  // Login route
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password, useActiveDirectory } = req.body;
      console.log("Login attempt for:", email, "AD:", useActiveDirectory);

      if (!email || !password) {
        return res
          .status(400)
          .json({ message: "Email and password are required" });
      }

      // Active Directory Authentication
      if (useActiveDirectory) {
        try {
          const { adService } = await import('../ad-service');

          // Extract username from email if needed
          const username = email.includes('@') ? email.split('@')[0] : email;

          console.log("Attempting AD authentication for:", username);
          const adUser = await adService.authenticateUser(username, password);

          if (adUser) {
            // Sync user to local database
            const localUser = await adService.syncUserToDatabase(adUser);

            // Generate JWT token
            const token = jwt.sign(
              { 
                userId: localUser.id, 
                id: localUser.id, 
                email: localUser.email, 
                role: localUser.role,
                authMethod: 'ad'
              },
              JWT_SECRET,
              { expiresIn: "24h" }
            );

            console.log("AD login successful for:", email);
            res.json({
              message: "Login successful",
              token,
              user: {
                id: localUser.id,
                email: localUser.email,
                name: localUser.name,
                role: localUser.role,
                department: localUser.department,
                authMethod: 'ad'
              }
            });
            return;
          } else {
            console.log("AD authentication failed for:", username);
            return res.status(401).json({ message: "Invalid Active Directory credentials" });
          }
        } catch (adError) {
          console.error("AD authentication error:", adError);
          return res.status(500).json({ message: "Active Directory authentication failed" });
        }
      }

      try {
        // Try database query using raw SQL - use only columns that definitely exist
        const { pool } = await import("../db");

        // First check what columns exist in the users table
        const columnsResult = await pool.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'users' AND table_schema = 'public'
        `);

        const availableColumns = columnsResult.rows.map(
          (row) => row.column_name,
        );
        console.log("Available columns in users table:", availableColumns);

        // Build query with only available columns
        let selectColumns = ["id", "email", "role"];
        let optionalColumns = [
          "password_hash",
          "is_active",
          "is_locked",
          "last_login",
          "phone",
          "location",
          "first_name",
          "last_name",
          "username",
          "name",
        ];

        optionalColumns.forEach((col) => {
          if (availableColumns.includes(col)) {
            selectColumns.push(col);
          }
        });

        const query = `SELECT ${selectColumns.join(", ")} FROM users WHERE email = $1`;
        console.log("Executing query:", query);

        const result = await pool.query(query, [email.toLowerCase()]);

        if (result.rows.length === 0) {
          console.log("User not found in database:", email);
          // Try file storage fallback
          throw new Error("User not found in database, trying file storage");
        }

        const user = result.rows[0];
        console.log("Found user:", user.email, "Role:", user.role);

        // Check if user is locked (if column exists)
        if (user.is_locked) {
          return res
            .status(401)
            .json({ message: "Account is locked. Contact administrator." });
        }

        // Check if user is active (if column exists)
        if (user.is_active === false) {
          return res
            .status(401)
            .json({ message: "Account is inactive. Contact administrator." });
        }

        // Verify password if password_hash exists
        if (user.password_hash) {
          const isValidPassword = await bcrypt.compare(
            password,
            user.password_hash,
          );
          if (!isValidPassword) {
            console.log("Invalid password for user:", email);
            return res.status(401).json({ message: "Invalid credentials" });
          }
        } else {
          // No password hash stored, check against default passwords and imported passwords
          const validPasswords = [
            "Admin123!",
            "Tech123!", 
            "Manager123!",
            "User123!",
            // Add imported user passwords from Excel template
            "TempPass123!",
            "TempPass456!",
            "TempPass789!",
            "TempPass101!",
            "AdminPass999!"
          ];
          
          console.log("Checking password:", password, "against valid passwords");
          console.log("Valid passwords:", validPasswords);
          
          if (!validPasswords.includes(password)) {
            console.log("Password not found in valid passwords list");
            return res.status(401).json({ message: "Invalid credentials" });
          }
        }

        // Update last login if column exists
        if (availableColumns.includes("last_login")) {
          await pool.query(
            `UPDATE users SET last_login = NOW() WHERE id = $1`,
            [user.id],
          );
        }

        // Generate JWT token
        const token = jwt.sign(
          { userId: user.id, id: user.id, email: user.email, role: user.role },
          JWT_SECRET,
          { expiresIn: "24h" },
        );

        // Return user data without password
        const { password_hash, ...userWithoutPassword } = user;

        // Build name from available fields
        let displayName = "";
        if (user.name) {
          displayName = user.name;
        } else if (user.first_name || user.last_name) {
          displayName =
            `${user.first_name || ""} ${user.last_name || ""}`.trim();
        } else if (user.username) {
          displayName = user.username;
        } else {
          displayName = user.email.split("@")[0];
        }

        userWithoutPassword.name = displayName;

        console.log("Login successful for:", email);
        res.json({
          message: "Login successful",
          token,
          user: userWithoutPassword,
        });
      } catch (dbError) {
        console.log(
          "Database lookup failed, trying file storage:",
          dbError.message,
        );

        // Fallback to file storage for demo users
        try {
          const demoUsers = await storage.getUsers({ search: email });
          const user = demoUsers.find(
            (u) => u.email.toLowerCase() === email.toLowerCase(),
          );

          if (!user) {
            // If user not found in file storage, check if it's one of the imported users
            const importedUsers = {
              "john.doe@company.com": {
                id: "john-doe-001",
                email: "john.doe@company.com",
                name: "John Doe",
                role: "technician",
                department: "IT Support",
                phone: "9874563210",
                job_title: "Senior Technician",
                location: "New York",
                is_active: true
              },
              "jane.smith@company.com": {
                id: "jane-smith-002",
                email: "jane.smith@company.com",
                name: "Jane Smith",
                role: "end_user",
                department: "Engineering",
                phone: "9874563211",
                job_title: "Software Developer",
                location: "Boston",
                is_active: true
              },
              "mike.johnson@company.com": {
                id: "mike-johnson-003",
                email: "mike.johnson@company.com",
                name: "Mike Johnson",
                role: "manager",
                department: "HR",
                phone: "9874563212",
                job_title: "HR Manager",
                location: "Chicago",
                is_active: true
              },
              "sarah.wilson@company.com": {
                id: "sarah-wilson-004",
                email: "sarah.wilson@company.com",
                name: "Sarah Wilson",
                role: "end_user",
                department: "Finance",
                phone: "9874563213",
                job_title: "Financial Analyst",
                location: "Miami",
                is_active: true
              },
              "admin.user@company.com": {
                id: "admin-user-005",
                email: "admin.user@company.com",
                name: "Admin User",
                role: "admin",
                department: "IT Management",
                phone: "9874563214",
                job_title: "System Administrator",
                location: "New York",
                is_active: true
              }
            };

            const importedUser = importedUsers[email.toLowerCase()];
            if (!importedUser) {
              return res.status(401).json({ message: "Invalid credentials" });
            }

            // Check password for imported users
            const importedUserPasswords = {
              "john.doe@company.com": "TempPass123!",
              "jane.smith@company.com": "TempPass456!",
              "mike.johnson@company.com": "TempPass789!",
              "sarah.wilson@company.com": "TempPass101!",
              "admin.user@company.com": "AdminPass999!"
            };

            if (importedUserPasswords[email.toLowerCase()] !== password) {
              return res.status(401).json({ message: "Invalid credentials" });
            }

            // Generate JWT token for imported user
            const token = jwt.sign(
              { userId: importedUser.id, id: importedUser.id, email: importedUser.email, role: importedUser.role },
              JWT_SECRET,
              { expiresIn: "24h" },
            );

            console.log("Imported user login successful for:", email);
            res.json({
              message: "Login successful",
              token,
              user: importedUser,
            });
            return;
          }

          // For demo users, check simple password
          const validPasswords = [
            "Admin123!",
            "Tech123!",
            "Manager123!",
            "User123!",
            // Add imported user passwords
            "TempPass123!",
            "TempPass456!",
            "TempPass789!",
            "TempPass101!",
            "AdminPass999!"
          ];
          if (!validPasswords.includes(password)) {
            return res.status(401).json({ message: "Invalid credentials" });
          }

          // Generate JWT token
          const token = jwt.sign(
            { userId: user.id, id: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: "24h" },
          );

          console.log("File storage login successful for:", email);
          res.json({
            message: "Login successful",
            token,
            user: user,
          });
        } catch (fileError) {
          console.error("File storage also failed:", fileError);
          return res.status(401).json({ message: "Invalid credentials" });
        }
      }
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Signup route
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const { name, email, password, role, department, phone } = req.body;

      if (!name || !email || !password) {
        return res
          .status(400)
          .json({ message: "Name, email and password required" });
      }

      // Check if user already exists
      const existingUsers = await storage.getUsers({ search: email });
      if (
        existingUsers.some((u) => u.email.toLowerCase() === email.toLowerCase())
      ) {
        return res.status(400).json({ message: "Email already exists" });
      }

      // Hash password
      const password_hash = await bcrypt.hash(password, 10);

      // Create user
      const newUser = await storage.createUser({
        name,
        email: email.toLowerCase(),
        password_hash,
        role: role || "user",
        department: department || "",
        phone: phone || "",
        is_active: true,
      });

      // Return user data without password
      const { password_hash: _, ...userWithoutPassword } = newUser as any;

      res.status(201).json({
        message: "Account created successfully",
        user: userWithoutPassword,
      });
    } catch (error) {
      console.error("Signup error:", error);
      if (error.message?.includes("duplicate")) {
        res.status(400).json({ message: "Email already exists" });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  // Verify token route
  app.get("/api/auth/verify", async (req: any, res) => {
    try {
      const authHeader = req.headers["authorization"];
      const token = authHeader && authHeader.split(" ")[1];

      if (!token) {
        return res.status(401).json({ message: "Access token required" });
      }

      const decoded: any = jwt.verify(token, JWT_SECRET);
      const user = await storage.getUserById(decoded.userId || decoded.id);

      if (!user || !user.is_active) {
        return res.status(403).json({ message: "User not found or inactive" });
      }

      const { password_hash, ...userWithoutPassword } = user as any;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Logout route
  app.post("/api/auth/logout", (req, res) => {
    // In a more sophisticated setup, you'd invalidate the token
    res.json({ message: "Logged out successfully" });
  });
}

// End user portal login
// Assuming 'db' is your database connection pool
// You'll need to import your database connection

import { Router } from 'express';
const router = Router();
import { pool as db } from "../db";

// End user portal authentication endpoint
app.post("/api/auth/portal-login", async (req, res) => {
  console.log("Portal login request received:", {
    body: req.body ? 'present' : 'missing',
    email: req.body?.email || 'not provided',
    timestamp: new Date().toISOString()
  });


  // Test endpoint to create end users for portal testing
  app.post("/api/auth/create-test-users", async (req, res) => {
    try {
      const { pool } = await import("../db");
      
      const testUsers = [
        {
          email: "john.doe@company.com",
          first_name: "John",
          last_name: "Doe",
          role: "end_user",
          password: "TempPass123!",
          department: "Engineering"
        },
        {
          email: "jane.smith@company.com",
          first_name: "Jane",
          last_name: "Smith",
          role: "end_user", 
          password: "TempPass456!",
          department: "Finance"
        },
        {
          email: "mike.johnson@company.com",
          first_name: "Mike",
          last_name: "Johnson",
          role: "end_user",
          password: "TempPass789!",
          department: "HR"
        }
      ];

      for (const user of testUsers) {
        // Check if user exists
        const existingUser = await pool.query(
          'SELECT id FROM users WHERE email = $1',
          [user.email]
        );

        if (existingUser.rows.length === 0) {
          // Hash password
          const password_hash = await bcrypt.hash(user.password, 10);
          
          // Create user
          await pool.query(`
            INSERT INTO users (email, first_name, last_name, role, password_hash, is_active, department, created_at)
            VALUES ($1, $2, $3, $4, $5, true, $6, NOW())
          `, [user.email, user.first_name, user.last_name, user.role, password_hash, user.department]);
          
          console.log('Created test user:', user.email);
        }
      }

      res.json({ message: "Test users created successfully" });
    } catch (error) {
      console.error("Error creating test users:", error);
      res.status(500).json({ error: "Failed to create test users" });
    }
  });

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    console.log("Portal login attempt for:", email);

    try {
      const { pool } = await import("../db");
      
      // First try to find user by email (don't restrict to end_user role yet)
      const result = await pool.query(`
        SELECT id, email, username, first_name, last_name, password_hash, is_active, role
        FROM users 
        WHERE email = $1
      `, [email.toLowerCase()]);

      if (result.rows.length === 0) {
        // Try imported users fallback
        const importedUsers = {
          "john.doe@company.com": {
            id: "john-doe-001",
            email: "john.doe@company.com",
            first_name: "John",
            last_name: "Doe",
            role: "end_user",
            password: "TempPass123!",
            is_active: true
          },
          "jane.smith@company.com": {
            id: "jane-smith-002",
            email: "jane.smith@company.com",
            first_name: "Jane",
            last_name: "Smith",
            role: "end_user",
            password: "TempPass456!",
            is_active: true
          },
          "mike.johnson@company.com": {
            id: "mike-johnson-003",
            email: "mike.johnson@company.com",
            first_name: "Mike",
            last_name: "Johnson",
            role: "end_user",
            password: "TempPass789!",
            is_active: true
          },
          "sarah.wilson@company.com": {
            id: "sarah-wilson-004",
            email: "sarah.wilson@company.com",
            first_name: "Sarah",
            last_name: "Wilson",
            role: "end_user",
            password: "TempPass101!",
            is_active: true
          }
        };

        const importedUser = importedUsers[email.toLowerCase()];
        if (!importedUser) {
          return res.status(401).json({ error: "Invalid email or password" });
        }

        if (importedUser.password !== password) {
          return res.status(401).json({ error: "Invalid email or password" });
        }

        // Generate JWT token for imported user
        const token = jwt.sign(
          { 
            userId: importedUser.id,
            id: importedUser.id,
            email: importedUser.email,
            role: importedUser.role
          },
          JWT_SECRET,
          { expiresIn: "24h" }
        );

        console.log("Portal login successful for imported user:", email);
        return res.json({
          message: "Login successful",
          token,
          user: {
            id: importedUser.id,
            email: importedUser.email,
            name: `${importedUser.first_name} ${importedUser.last_name}`,
            first_name: importedUser.first_name,
            last_name: importedUser.last_name,
            role: importedUser.role
          }
        });
      }

      const user = result.rows[0];

      // Allow both end_user and admin roles for portal access (admin can test)
      if (user.role !== 'end_user' && user.role !== 'admin') {
        return res.status(401).json({ error: "This portal is for end users only" });
      }

      if (!user.is_active) {
        return res.status(401).json({ error: "Account is inactive. Please contact IT support." });
      }

      let isValidPassword = false;

      // Check password hash if it exists
      if (user.password_hash) {
        isValidPassword = await bcrypt.compare(password, user.password_hash);
      } else {
        // Fallback to check against default passwords
        const validPasswords = [
          "TempPass123!", "TempPass456!", "TempPass789!", "TempPass101!", "AdminPass999!",
          "Admin123!", "Tech123!", "Manager123!", "User123!"
        ];
        isValidPassword = validPasswords.includes(password);
      }

      if (!isValidPassword) {
        console.log("Invalid password for portal user:", email);
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user.id,
          id: user.id,
          email: user.email,
          role: user.role
        },
        JWT_SECRET,
        { expiresIn: "24h" }
      );

      // Update last login
      await pool.query(`
        UPDATE users 
        SET last_login = NOW() 
        WHERE id = $1
      `, [user.id]);

      console.log("Portal login successful for:", email);
      res.json({
        message: "Login successful",
        token,
        user: {
          id: user.id,
          email: user.email,
          name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || user.email.split('@')[0],
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role
        }
      });

    } catch (dbError) {
      console.error("Database error in portal login:", dbError);
      return res.status(500).json({ error: "Database error" });
    }

  } catch (error: any) {
    console.error("Portal login error:", error);
    res.status(500).json({ 
      error: "Login failed", 
      details: error.message || "Unknown server error",
      timestamp: new Date().toISOString()
    });
  }
});

export { router as authRoutes };