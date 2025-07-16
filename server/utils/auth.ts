
import jwt from "jsonwebtoken";
import { DatabaseUtils } from "./database";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

export class AuthUtils {
  /**
   * Verify JWT token and return decoded payload
   */
  static verifyToken(token: string): any {
    try {
      if (!token) {
        throw new Error("No token provided");
      }
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error("Token expired");
      }
      if (error.name === 'JsonWebTokenError') {
        throw new Error("Invalid token format");
      }
      throw new Error("Token verification failed");
    }
  }

  /**
   * Generate JWT token
   */
  static generateToken(payload: any, expiresIn: string = "24h"): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn });
  }

  /**
   * Extract token from authorization header
   */
  static extractTokenFromHeader(authHeader: string): string | null {
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }
    return authHeader.substring(7);
  }

  /**
   * Get user from database by ID with fallback
   */
  static async getUserById(userId: string) {
    try {
      // Try database first
      const result = await DatabaseUtils.executeQuery(
        `SELECT id, email, role, first_name, last_name, username, is_active, phone, location 
         FROM users WHERE id = $1`,
        [userId]
      );

      if (result.rows.length > 0) {
        const user = result.rows[0];
        return this.buildUserDisplayName(user);
      }
    } catch (dbError) {
      console.log("Database user lookup failed:", dbError.message);
    }
    
    return null;
  }

  /**
   * Build user display name from available fields
   */
  static buildUserDisplayName(user: any) {
    let displayName = "";
    if (user.first_name || user.last_name) {
      displayName = `${user.first_name || ""} ${user.last_name || ""}`.trim();
    } else if (user.username) {
      displayName = user.username;
    } else if (user.email) {
      displayName = user.email.split("@")[0];
    } else {
      displayName = "Unknown User";
    }

    return {
      ...user,
      name: displayName
    };
  }

  /**
   * Check if user has required role
   */
  static hasRole(userRole: string, requiredRoles: string | string[]): boolean {
    const allowedRoles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
    return userRole === "admin" || allowedRoles.includes(userRole);
  }

  /**
   * Validate user account status
   */
  static validateUserStatus(user: any): { valid: boolean; message?: string } {
    if (!user.is_active) {
      return { valid: false, message: "User account is inactive" };
    }
    
    if (user.is_locked) {
      return { valid: false, message: "Account is locked. Contact administrator." };
    }
    
    return { valid: true };
  }

  /**
   * Update user last login timestamp
   */
  static async updateLastLogin(userId: string) {
    try {
      await DatabaseUtils.executeQuery(
        `UPDATE users SET last_login = NOW() WHERE id = $1`,
        [userId]
      );
    } catch (error) {
      console.warn("Failed to update last login:", error);
    }
  }
}
