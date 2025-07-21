import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { storage } from "../storage";
import { DatabaseUtils } from "../utils/database";
import { AuthUtils } from "../utils/auth";
import { ResponseUtils } from "../utils/response";
import { UserUtils } from "../utils/user";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

export class AuthController {
  static async login(req: any, res: any) {
    try {
      const { email, password } = req.body;
      console.log("Login attempt for:", email);

      if (!email || !password) {
        return res
          .status(400)
          .json({ message: "Email and password are required" });
      }

      try {
        // Try database query using raw SQL - use only columns that definitely exist
        const availableColumns = await DatabaseUtils.getTableColumns("users");
        const columnNames = availableColumns.map(col => col.column_name);
        console.log("Available columns in users table:", columnNames);

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
          if (columnNames.includes(col)) {
            selectColumns.push(col);
          }
        });

        const query = DatabaseUtils.buildSelectQuery("users", columnNames, selectColumns) + " WHERE email = $1";
        console.log("Executing query:", query);

        const result = await DatabaseUtils.executeQuery(query, [email.toLowerCase()]);

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
          const { pool } = await import("../db");
          await pool.query(
            `UPDATE users SET last_login = NOW() WHERE id = $1`,
            [user.id],
          );
        }

        // Generate JWT token
        const token = AuthUtils.generateToken({
          userId: user.id, 
          id: user.id, 
          email: user.email, 
          role: user.role
        });

        // Return user data without password
        const { password_hash, ...userWithoutPassword } = user;

        // Build name from available fields using utility
        userWithoutPassword.name = UserUtils.buildDisplayName(user);

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
  }

  static async signup(req: any, res: any) {
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
  }

  static async verifyToken(req: any, res: any) {
    try {
      const { password_hash, ...userWithoutPassword } = req.user as any;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  }

  static async logout(req: any, res: any) {
    try {
      // In a real implementation, you might want to blacklist the token
      res.json({ message: "Logout successful" });
    } catch (error) {
      console.error("Error during logout:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  static async portalLogin(req: any, res: any) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      console.log("Portal login attempt for:", email);

      try {
        // Try database first
        const availableColumns = await DatabaseUtils.getTableColumns("users");
        const columnNames = availableColumns.map(col => col.column_name);

        let selectColumns = ["id", "email", "role"];
        let optionalColumns = [
          "password_hash",
          "is_active",
          "is_locked",
          "first_name",
          "last_name",
          "username",
          "name",
          "phone",
          "location"
        ];

        optionalColumns.forEach((col) => {
          if (columnNames.includes(col)) {
            selectColumns.push(col);
          }
        });

        const query = DatabaseUtils.buildSelectQuery("users", columnNames, selectColumns) + " WHERE email = $1";
        const result = await DatabaseUtils.executeQuery(query, [email.toLowerCase()]);

        if (result.rows.length === 0) {
          console.log("Portal user not found in database:", email);
          throw new Error("User not found in database, trying file storage");
        }

        const user = result.rows[0];
        console.log("Found portal user:", user.email, "Role:", user.role);

        // Check if user is locked
        if (user.is_locked) {
          return res.status(401).json({ error: "Account is locked. Contact administrator." });
        }

        // Check if user is active
        if (user.is_active === false) {
          return res.status(401).json({ error: "User account is inactive" });
        }

        // Verify password if password_hash exists
        if (user.password_hash) {
          const isValidPassword = await bcrypt.compare(password, user.password_hash);
          if (!isValidPassword) {
            console.log("Invalid password for portal user:", email);
            return res.status(401).json({ error: "Invalid credentials" });
          }
        } else {
          // Check against demo passwords for end users
          const validPasswords = [
            "TempPass123!",
            "TempPass456!",
            "Admin123!",
            "Tech123!",
            "Manager123!",
            "User123!"
          ];
          if (!validPasswords.includes(password)) {
            return res.status(401).json({ error: "Invalid credentials" });
          }
        }

        // Generate JWT token for portal users
        const token = AuthUtils.generateToken({
          userId: user.id,
          id: user.id,
          email: user.email,
          role: user.role
        });

        // Build user response without password
        const { password_hash, ...userWithoutPassword } = user;
        userWithoutPassword.name = UserUtils.buildDisplayName(user);

        console.log("Portal login successful for:", email);
        res.json({
          message: "Portal login successful",
          token,
          user: userWithoutPassword
        });

      } catch (dbError) {
        console.log("Database lookup failed for portal, trying file storage:", dbError.message);

        // Fallback to file storage for demo users
        try {
          const demoUsers = await storage.getUsers({ search: email });
          const user = demoUsers.find(
            (u) => u.email.toLowerCase() === email.toLowerCase()
          );

          if (!user) {
            return res.status(401).json({ error: "Invalid credentials" });
          }

          // Check demo passwords for end users
          const validPasswords = [
            "TempPass123!",
            "TempPass456!",
            "Admin123!",
            "Tech123!",
            "Manager123!",
            "User123!"
          ];
          if (!validPasswords.includes(password)) {
            return res.status(401).json({ error: "Invalid credentials" });
          }

          // Generate JWT token
          const token = jwt.sign(
            { userId: user.id, id: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: "24h" }
          );

          console.log("Portal file storage login successful for:", email);
          res.json({
            message: "Portal login successful",
            token,
            user: user
          });
        } catch (fileError) {
          console.error("Portal file storage also failed:", fileError);
          return res.status(401).json({ error: "Invalid credentials" });
        }
      }
    } catch (error) {
      console.error("Portal login error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
}