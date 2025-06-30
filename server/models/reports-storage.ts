import { db } from "../db";
import { sql } from "drizzle-orm";

export interface StoredReport {
  id: string;
  title: string;
  type: string;
  data: any;
  generated_at: Date;
  time_range: string;
  user_id?: string;
}

class ReportsStorage {
  async createReportsTable() {
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS reports (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          type TEXT NOT NULL,
          data JSONB NOT NULL,
          generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          time_range TEXT NOT NULL,
          user_id TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log("Reports table created successfully");
    } catch (error) {
      console.error("Error creating reports table:", error);
    }
  }

  async saveReport(report: StoredReport): Promise<void> {
    try {
      await db.execute(sql`
        INSERT INTO reports (id, title, type, data, generated_at, time_range, user_id)
        VALUES (${report.id}, ${report.title}, ${report.type}, ${JSON.stringify(report.data)}, 
                ${report.generated_at}, ${report.time_range}, ${report.user_id})
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          type = EXCLUDED.type,
          data = EXCLUDED.data,
          generated_at = EXCLUDED.generated_at,
          time_range = EXCLUDED.time_range
      `);
      console.log(`Report ${report.id} saved successfully`);
    } catch (error) {
      console.error("Error saving report:", error);
      throw error;
    }
  }

  async getRecentReports(limit: number = 10): Promise<StoredReport[]> {
    try {
      const result = await db.execute(sql`
        SELECT id, title, type, data, generated_at, time_range, user_id
        FROM reports
        ORDER BY generated_at DESC
        LIMIT ${limit}
      `);

      return result.rows.map(row => ({
        id: row.id as string,
        title: row.title as string,
        type: row.type as string,
        data: typeof row.data === 'string' ? JSON.parse(row.data) : row.data,
        generated_at: new Date(row.generated_at as string),
        time_range: row.time_range as string,
        user_id: row.user_id as string
      }));
    } catch (error) {
      console.error("Error fetching recent reports:", error);
      return [];
    }
  }

  async getReportById(id: string): Promise<StoredReport | null> {
    try {
      const result = await db.execute(sql`
        SELECT id, title, type, data, generated_at, time_range, user_id
        FROM reports
        WHERE id = ${id}
      `);

      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      return {
        id: row.id as string,
        title: row.title as string,
        type: row.type as string,
        data: typeof row.data === 'string' ? JSON.parse(row.data) : row.data,
        generated_at: new Date(row.generated_at as string),
        time_range: row.time_range as string,
        user_id: row.user_id as string
      };
    } catch (error) {
      console.error("Error fetching report by ID:", error);
      return null;
    }
  }

  async deleteReport(id: string): Promise<boolean> {
    try {
      await db.execute(sql`DELETE FROM reports WHERE id = ${id}`);
      console.log(`Report ${id} deleted successfully`);
      return true;
    } catch (error) {
      console.error("Error deleting report:", error);
      return false;
    }
  }
}

export const reportsStorage = new ReportsStorage();