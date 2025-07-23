import jwt from "jsonwebtoken";
import { storage } from "../storage";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

// Auth middleware
export const authenticateToken = async (req: any, res: any, next: any) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      console.log("No auth token provided for", req.path);
      return res.status(401).json({ message: "Access token required" });
    }

    console.log("Authenticating token for", req.path);

    const decoded: any = jwt.verify(token, JWT_SECRET);
    console.log("Decoded token:", decoded);

    // Try to get user from database first
    try {
      const { pool } = await import("../db");
      const result = await pool.query(
        `
        SELECT id, email, role, first_name, last_name, username, is_active, phone, location 
        FROM users WHERE id = $1
      `,
        [decoded.userId || decoded.id],
      );

      if (result.rows.length > 0) {
        const user = result.rows[0];

        // Build name from available fields
        let displayName = "";
        if (user.first_name || user.last_name) {
          displayName =
            `${user.first_name || ""} ${user.last_name || ""}`.trim();
        } else if (user.username) {
          displayName = user.username;
        } else {
          displayName = user.email.split("@")[0];
        }

        user.name = displayName;

        if (!user.is_active) {
          return res.status(403).json({ message: "User account is inactive" });
        }

        req.user = user;
        return next();
      }
    } catch (dbError) {
      console.log(
        "Database lookup failed, trying file storage:",
        dbError.message,
      );
    }

    // Fallback to file storage
    const user = await storage.getUserById(decoded.userId || decoded.id);
    if (!user) {
      return res.status(403).json({ message: "User not found" });
    }

    if (user.is_active === false) {
      return res.status(403).json({ message: "User account is inactive" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Authentication error for", req.path, ":", error);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: "Token expired" });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: "Invalid token format" });
    }
    return res.status(403).json({ message: "Invalid token" });
  }
};

// Role check middleware
export const requireRole = (roles: string | string[]) => {
  return (req: any, res: any, next: any) => {
    const userRole = req.user?.role;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (userRole === "admin" || allowedRoles.includes(userRole)) {
      next();
    } else {
      res.status(403).json({ message: "Insufficient permissions" });
    }
  };
};

