
import bcrypt from "bcrypt";
import { storage } from "../storage";
import { ResponseUtils } from "../utils/response";

export class UserController {
  static async getUsers(req: any, res: any) {
    try {
      console.log("GET /api/users - Fetching users from database");

      const { search, role, page = 1, limit = 20 } = req.query;
      console.log("Query params:", { search, role, page, limit });

      // Initialize demo users if they don't exist
      await storage.initializeDemoUsers();

      const filters: any = {};
      if (search) filters.search = search as string;
      if (role && role !== "all") filters.role = role as string;

      console.log("Calling storage.getUsers with filters:", filters);
      
      // Use proper pagination and filtering from user storage
      const result = await storage.getUsers(
        parseInt(page as string) || 1,
        parseInt(limit as string) || 20,
        filters
      );
      
      console.log(
        `Found ${result.data.length} users out of ${result.total} total:`,
        result.data.map((u) => ({ id: u.id, email: u.email, first_name: u.first_name, last_name: u.last_name })),
      );

      // Format users for compatibility
      const formattedUsers = result.data.map(user => ({
        ...user,
        name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || user.email?.split('@')[0],
        department: user.department_name || user.location || 'N/A',
        status: user.is_active && !user.is_locked ? 'active' : 'inactive'
      }));

      res.json({
        data: formattedUsers,
        pagination: result,
        total: result.total
      });
    } catch (error) {
      console.error("Error fetching users:", error);
      ResponseUtils.internalServerError(res, "Failed to fetch users");
    }
  }

  static async getUser(req: any, res: any) {
    try {
      console.log("GET /api/users/:id - Fetching user:", req.params.id);
      const user = await storage.getUserById(req.params.id);
      if (!user) {
        return ResponseUtils.notFound(res, "User not found");
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      ResponseUtils.internalServerError(res, "Failed to fetch user");
    }
  }

  static async createUser(req: any, res: any) {
    try {
      console.log("POST /api/users - Creating user:", req.body);
      const { name, email, password, role, department, phone } = req.body;

      if (!name || !email || !password) {
        return res
          .status(400)
          .json({ message: "Name, email, and password are required" });
      }

      // Hash password
      const password_hash = await bcrypt.hash(password, 10);

      const userData = {
        name,
        email: email.toLowerCase(),
        password_hash,
        role: role || "user",
        department: department || "",
        phone: phone || "",
        is_active: true,
      };

      const newUser = await storage.createUser(userData);
      console.log("Created user:", newUser);
      res.status(201).json(newUser);
    } catch (error) {
      console.error("Error creating user:", error);
      ResponseUtils.internalServerError(res, "Failed to create user");
    }
  }

  static async updateUser(req: any, res: any) {
    try {
      console.log(
        "PUT /api/users/:id - Updating user:",
        req.params.id,
        req.body,
      );
      const { name, email, password, role, department, phone, is_active } =
        req.body;

      const updates: any = {
        name,
        email: email?.toLowerCase(),
        role,
        department,
        phone,
        is_active,
      };

      // Hash password if provided
      if (password) {
        updates.password_hash = await bcrypt.hash(password, 10);
      }

      // Remove undefined values
      Object.keys(updates).forEach((key) => {
        if (updates[key] === undefined) {
          delete updates[key];
        }
      });

      const updatedUser = await storage.updateUser(req.params.id, updates);
      if (!updatedUser) {
        return ResponseUtils.notFound(res, "User not found");
      }

      console.log("Updated user:", updatedUser);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      ResponseUtils.internalServerError(res, "Failed to update user");
    }
  }

  static async deleteUser(req: any, res: any) {
    try {
      console.log("DELETE /api/users/:id - Deleting user:", req.params.id);
      const success = await storage.deleteUser(req.params.id);
      if (!success) {
        return ResponseUtils.notFound(res, "User not found");
      }
      console.log("User deleted successfully");
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      ResponseUtils.internalServerError(res, "Failed to delete user");
    }
  }
}
