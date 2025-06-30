
import { db, pool } from "../db";

export class DatabaseUtils {
  /**
   * Get database pool instance
   */
  static async getPool() {
    return pool;
  }

  /**
   * Execute a query with error handling
   */
  static async executeQuery(query: string, params: any[] = []) {
    try {
      const result = await pool.query(query, params);
      return result;
    } catch (error) {
      console.error("Database query error:", error);
      throw error;
    }
  }

  /**
   * Check if table exists
   */
  static async tableExists(tableName: string): Promise<boolean> {
    try {
      const result = await pool.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )`,
        [tableName]
      );
      return result.rows[0].exists;
    } catch (error) {
      console.error(`Error checking table ${tableName}:`, error);
      return false;
    }
  }

  /**
   * Get table columns
   */
  static async getTableColumns(tableName: string) {
    try {
      const result = await pool.query(
        `SELECT column_name, data_type 
         FROM information_schema.columns 
         WHERE table_name = $1 AND table_schema = 'public'
         ORDER BY ordinal_position`,
        [tableName]
      );
      return result.rows;
    } catch (error) {
      console.error(`Error getting columns for ${tableName}:`, error);
      return [];
    }
  }

  /**
   * Build dynamic query with optional columns
   */
  static buildSelectQuery(tableName: string, availableColumns: string[], requiredColumns: string[]) {
    const validColumns = requiredColumns.filter(col => availableColumns.includes(col));
    return `SELECT ${validColumns.join(", ")} FROM ${tableName}`;
  }

  /**
   * Safe column access with fallback
   */
  static getColumnValue(row: any, columnName: string, fallback: any = null) {
    return row && row.hasOwnProperty(columnName) ? row[columnName] : fallback;
  }

  /**
   * Execute transaction
   */
  static async executeTransaction(queries: Array<{ query: string; params?: any[] }>) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const results = [];
      
      for (const { query, params = [] } of queries) {
        const result = await client.query(query, params);
        results.push(result);
      }
      
      await client.query('COMMIT');
      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
