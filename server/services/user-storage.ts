import { db } from "../db";
import {
  users,
  departments,
  userActivity,
  userSessions,
  userGroups,
  userGroupMemberships,
  type User,
  type NewUser,
  type Department,
  type NewDepartment,
  type UserActivity,
  type NewUserActivity,
} from "@shared/user-schema";
import { eq, desc, and, or, like, sql, count, isNull } from "drizzle-orm";
import { randomBytes } from "crypto";

interface UserFilters {
  role?: string;
  department_id?: string;
  is_active?: boolean;
  search?: string;
}

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class UserStorage {
  // User CRUD Operations
  async createUser(userData: Omit<NewUser, "id">): Promise<User> {
    const [newUser] = await db
      .insert(users)
      .values({
        ...userData,
        updated_at: new Date(),
      })
      .returning();

    // Log user creation activity
    await this.logUserActivity(
      newUser.id,
      "user_created",
      "User account created",
    );

    return newUser;
  }

  async getUsers(
    page: number = 1,
    limit: number = 20,
    filters: UserFilters = {},
  ): Promise<PaginatedResult<User & { department_name?: string }>> {
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [];

    if (filters.role) {
      conditions.push(eq(users.role, filters.role));
    }

    if (filters.department_id) {
      conditions.push(eq(users.department_id, filters.department_id));
    }

    if (filters.is_active !== undefined) {
      conditions.push(eq(users.is_active, filters.is_active));
    }

    if (filters.search) {
      conditions.push(
        or(
          like(users.first_name, `%${filters.search}%`),
          like(users.last_name, `%${filters.search}%`),
          like(users.email, `%${filters.search}%`),
          like(users.username, `%${filters.search}%`),
          like(users.employee_id, `%${filters.search}%`),
        ),
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const [{ total }] = await db
      .select({ total: count() })
      .from(users)
      .where(whereClause);

    // Get paginated data with department names
    const data = await db
      .select({
        id: users.id,
        email: users.email,
        username: users.username,
        first_name: users.first_name,
        last_name: users.last_name,
        role: users.role,
        department_id: users.department_id,
        manager_id: users.manager_id,
        phone: users.phone,
        employee_id: users.employee_id,
        job_title: users.job_title,
        location: users.location,
        profile_picture: users.profile_picture,
        permissions: users.permissions,
        preferences: users.preferences,
        is_active: users.is_active,
        is_locked: users.is_locked,
        password_reset_required: users.password_reset_required,
        failed_login_attempts: users.failed_login_attempts,
        last_login: users.last_login,
        last_password_change: users.last_password_change,
        created_at: users.created_at,
        updated_at: users.updated_at,
        department_name: departments.name,
      })
      .from(users)
      .leftJoin(departments, eq(users.department_id, departments.id))
      .where(whereClause)
      .orderBy(desc(users.created_at))
      .limit(limit)
      .offset(offset);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUserById(id: string): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.id, id));

    return user || null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.email, email));

    return user || null;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    updates.updated_at = new Date();

    const [updatedUser] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();

    if (updatedUser) {
      await this.logUserActivity(id, "user_updated", "User profile updated");
    }

    return updatedUser || null;
  }

  async deleteUser(id: string): Promise<boolean> {
    // Soft delete - mark as inactive instead of removing
    const result = await db
      .update(users)
      .set({
        is_active: false,
        updated_at: new Date(),
      })
      .where(eq(users.id, id));

    if (result.rowCount > 0) {
      await this.logUserActivity(
        id,
        "user_deleted",
        "User account deactivated",
      );
      return true;
    }

    return false;
  }

  // Department Operations
  async createDepartment(
    deptData: Omit<NewDepartment, "id">,
  ): Promise<Department> {
    const [newDepartment] = await db
      .insert(departments)
      .values({
        ...deptData,
        updated_at: new Date(),
      })
      .returning();

    return newDepartment;
  }

  async getDepartments(): Promise<Department[]> {
    return await db
      .select()
      .from(departments)
      .where(eq(departments.is_active, true))
      .orderBy(departments.name);
  }

  async getDepartmentById(id: string): Promise<Department | null> {
    const [department] = await db
      .select()
      .from(departments)
      .where(eq(departments.id, id));

    return department || null;
  }

  async updateDepartment(
    id: string,
    updates: Partial<Department>,
  ): Promise<Department | null> {
    updates.updated_at = new Date();

    const [updatedDept] = await db
      .update(departments)
      .set(updates)
      .where(eq(departments.id, id))
      .returning();

    return updatedDept || null;
  }

  // Role-based queries
  async getTechnicians(): Promise<User[]> {
    return await db
      .select({
        id: users.id,
        email: users.email,
        username: users.username,
        first_name: users.first_name,
        last_name: users.last_name,
        role: users.role,
        department_id: users.department_id,
        manager_id: users.manager_id,
        phone: users.phone,
        employee_id: users.employee_id,
        job_title: users.job_title,
        location: users.location,
        profile_picture: users.profile_picture,
        permissions: users.permissions,
        preferences: users.preferences,
        is_active: users.is_active,
        is_locked: users.is_locked,
        password_reset_required: users.password_reset_required,
        failed_login_attempts: users.failed_login_attempts,
        last_login: users.last_login,
        last_password_change: users.last_password_change,
        created_at: users.created_at,
        updated_at: users.updated_at,
      })
      .from(users)
      .where(and(eq(users.role, "technician"), eq(users.is_active, true)))
      .orderBy(users.first_name, users.last_name);
  }

  async getManagers(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(
        and(
          or(eq(users.role, "manager"), eq(users.role, "admin")),
          eq(users.is_active, true),
        ),
      )
      .orderBy(users.first_name, users.last_name);
  }

  async getActiveTechnicians(): Promise<User[]> {
    return await db
      .select({
        id: users.id,
        email: users.email,
        username: users.username,
        first_name: users.first_name,
        last_name: users.last_name,
        role: users.role,
        department_id: users.department_id,
        manager_id: users.manager_id,
        phone: users.phone,
        employee_id: users.employee_id,
        job_title: users.job_title,
        location: users.location,
        profile_picture: users.profile_picture,
        permissions: users.permissions,
        preferences: users.preferences,
        is_active: users.is_active,
        is_locked: users.is_locked,
        password_reset_required: users.password_reset_required,
        failed_login_attempts: users.failed_login_attempts,
        last_login: users.last_login,
        last_password_change: users.last_password_change,
        created_at: users.created_at,
        updated_at: users.updated_at,
      })
      .from(users)
      .where(
        and(
          eq(users.role, "technician"),
          eq(users.is_active, true),
          eq(users.is_locked, false),
        ),
      )
      .orderBy(users.first_name, users.last_name);
  }

  async getNextAvailableTechnician(): Promise<User | null> {
    // Get all active technicians
    const technicians = await this.getActiveTechnicians();

    if (technicians.length === 0) return null;

    // Get ticket counts for each technician to implement round-robin
    const { tickets } = await import("@shared/ticket-schema");
    const { eq, count, and, not, inArray } = await import("drizzle-orm");
    
    const ticketCounts = await db
      .select({
        assigned_to: tickets.assigned_to,
        count: count()
      })
      .from(tickets)
      .where(
        and(
          not(inArray(tickets.status, ["resolved", "closed", "cancelled"])),
          inArray(tickets.assigned_to, technicians.map(t => t.email))
        )
      )
      .groupBy(tickets.assigned_to);

    // Create a map of technician email to ticket count
    const countMap = new Map<string, number>();
    ticketCounts.forEach(tc => {
      if (tc.assigned_to) {
        countMap.set(tc.assigned_to, tc.count);
      }
    });

    // Find technician with least tickets
    let selectedTechnician = technicians[0];
    let minTickets = countMap.get(selectedTechnician.email) || 0;

    for (const technician of technicians) {
      const ticketCount = countMap.get(technician.email) || 0;
      if (ticketCount < minTickets) {
        minTickets = ticketCount;
        selectedTechnician = technician;
      }
    }

    console.log(`Assigning ticket to ${selectedTechnician.email} (current load: ${minTickets} tickets)`);
    return selectedTechnician;
  }

  // User Activity Tracking
  async logUserActivity(
    userId: string,
    activityType: string,
    description: string,
    ipAddress?: string,
    userAgent?: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    try {
      await db.insert(userActivity).values({
        user_id: userId,
        activity_type: activityType,
        description,
        ip_address: ipAddress || null,
        user_agent: userAgent || null,
        metadata: metadata || {},
      });
    } catch (error) {
      console.error("Error logging user activity:", error);
    }
  }

  async getUserActivity(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResult<UserActivity>> {
    const offset = (page - 1) * limit;

    const [{ total }] = await db
      .select({ total: count() })
      .from(userActivity)
      .where(eq(userActivity.user_id, userId));

    const data = await db
      .select()
      .from(userActivity)
      .where(eq(userActivity.user_id, userId))
      .orderBy(desc(userActivity.created_at))
      .limit(limit)
      .offset(offset);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Bulk Operations
  async bulkCreateUsers(usersData: Omit<NewUser, "id">[]): Promise<User[]> {
    const createdUsers = await db
      .insert(users)
      .values(
        usersData.map((user) => ({
          ...user,
          updated_at: new Date(),
        })),
      )
      .returning();

    // Log bulk creation
    for (const user of createdUsers) {
      await this.logUserActivity(
        user.id,
        "user_created",
        "User account created via bulk import",
      );
    }

    return createdUsers;
  }

  async exportUsersCSV(filters: UserFilters = {}): Promise<string> {
    const { data: users } = await this.getUsers(1, 10000, filters); // Get all matching users

    const headers = [
      "Employee ID",
      "Email",
      "Username",
      "First Name",
      "Last Name",
      "Role",
      "Department",
      "Job Title",
      "Phone",
      "Location",
      "Is Active",
      "Last Login",
      "Created At",
    ];

    const csvRows = [
      headers.join(","),
      ...users.map((user) =>
        [
          user.employee_id || "",
          user.email,
          user.username,
          user.first_name || "",
          user.last_name || "",
          user.role,
          user.department_name || "",
          user.job_title || "",
          user.phone || "",
          user.location || "",
          user.is_active ? "Yes" : "No",
          user.last_login?.toISOString() || "",
          user.created_at?.toISOString() || "",
        ]
          .map((field) => `"${String(field).replace(/"/g, '""')}"`)
          .join(","),
      ),
    ];

    return csvRows.join("\n");
  }

  // Password and Security
  async updatePassword(
    userId: string,
    hashedPassword: string,
  ): Promise<boolean> {
    const result = await db
      .update(users)
      .set({
        // Note: In a real app, you'd store password hash
        last_password_change: new Date(),
        password_reset_required: false,
        failed_login_attempts: 0,
        updated_at: new Date(),
      })
      .where(eq(users.id, userId));

    if (result.rowCount > 0) {
      await this.logUserActivity(
        userId,
        "password_changed",
        "User password updated",
      );
      return true;
    }

    return false;
  }

  async lockUser(userId: string, reason: string): Promise<boolean> {
    const result = await db
      .update(users)
      .set({
        is_locked: true,
        updated_at: new Date(),
      })
      .where(eq(users.id, userId));

    if (result.rowCount > 0) {
      await this.logUserActivity(
        userId,
        "user_locked",
        `User account locked: ${reason}`,
      );
      return true;
    }

    return false;
  }

  async unlockUser(userId: string): Promise<boolean> {
    const result = await db
      .update(users)
      .set({
        is_locked: false,
        failed_login_attempts: 0,
        updated_at: new Date(),
      })
      .where(eq(users.id, userId));

    if (result.rowCount > 0) {
      await this.logUserActivity(
        userId,
        "user_unlocked",
        "User account unlocked",
      );
      return true;
    }

    return false;
  }

  // User Groups Management
  async createUserGroup(groupData: {
    name: string;
    description?: string;
    group_type: string;
    manager_id?: string;
    email?: string;
  }) {
    try {
      const [newGroup] = await db
        .insert(userGroups)
        .values({
          ...groupData,
          updated_at: new Date(),
        })
        .returning();

      return newGroup;
    } catch (error) {
      console.error("Error creating user group:", error);
      throw error;
    }
  }

  async getUserGroups() {
    return await db
      .select()
      .from(userGroups)
      .where(eq(userGroups.is_active, true))
      .orderBy(userGroups.name);
  }

  async addUserToGroup(userId: string, groupId: string, role: string = "member") {
    try {
      const [membership] = await db
        .insert(userGroupMemberships)
        .values({
          user_id: userId,
          group_id: groupId,
          role,
        })
        .returning();

      return membership;
    } catch (error) {
      console.error("Error adding user to group:", error);
      throw error;
    }
  }

  async removeUserFromGroup(userId: string, groupId: string) {
    const result = await db
      .delete(userGroupMemberships)
      .where(
        and(
          eq(userGroupMemberships.user_id, userId),
          eq(userGroupMemberships.group_id, groupId)
        )
      );

    return result.rowCount > 0;
  }

  async getUserGroupMemberships(userId: string) {
    return await db
      .select({
        group_id: userGroups.id,
        group_name: userGroups.name,
        group_type: userGroups.group_type,
        role: userGroupMemberships.role,
        joined_at: userGroupMemberships.joined_at,
      })
      .from(userGroupMemberships)
      .innerJoin(userGroups, eq(userGroupMemberships.group_id, userGroups.id))
      .where(eq(userGroupMemberships.user_id, userId));
  }
}

export const userStorage = new UserStorage();
