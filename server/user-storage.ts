
import { db } from "./db";
import { users } from "@shared/user-schema";
import { eq, desc } from "drizzle-orm";

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  department?: string;
  is_active: boolean;
  created_at: Date;
}

export class UserStorage {
  async getActiveTechnicians(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.is_active, true))
      .orderBy(desc(users.created_at));
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));
    
    return user || null;
  }

  async createUser(userData: Omit<User, 'id' | 'created_at'>): Promise<User> {
    const [newUser] = await db
      .insert(users)
      .values({
        ...userData,
        created_at: new Date()
      })
      .returning();

    return newUser;
  }

  // Round-robin assignment logic
  async getNextAvailableTechnician(): Promise<User | null> {
    const technicians = await this.getActiveTechnicians();
    
    if (technicians.length === 0) return null;

    // Simple round-robin - you could enhance this with workload balancing
    const randomIndex = Math.floor(Math.random() * technicians.length);
    return technicians[randomIndex];
  }
}

export const userStorage = new UserStorage();
