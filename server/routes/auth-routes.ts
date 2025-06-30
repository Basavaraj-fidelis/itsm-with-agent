
import type { Express } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { storage } from "../storage";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

export function registerAuthRoutes(app: Express) {
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
          // No password hash stored, check against default passwords
          const validPasswords = [
            "Admin123!",
            "Tech123!",
            "Manager123!",
            "User123!",
          ];
          if (!validPasswords.includes(password)) {
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
            return res.status(401).json({ message: "Invalid credentials" });
          }

          // For demo users, check simple password
          const validPasswords = [
            "Admin123!",
            "Tech123!",
            "Manager123!",
            "User123!",
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
