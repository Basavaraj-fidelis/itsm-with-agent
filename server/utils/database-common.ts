
import { Pool } from 'pg';

export class DatabaseCommon {
  private static pool: Pool;

  static initializePool(connectionString: string) {
    if (!this.pool) {
      this.pool = new Pool({
        connectionString,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      });
    }
    return this.pool;
  }

  static async executeQuery(query: string, params: any[] = []) {
    try {
      const result = await this.pool.query(query, params);
      return result;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  static async executeBatch(queries: Array<{ query: string; params?: any[] }>) {
    const client = await this.pool.connect();
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

  static buildSelectQuery(
    table: string, 
    availableColumns: string[], 
    requestedColumns: string[],
    whereClause?: string
  ): string {
    const validColumns = requestedColumns.filter(col => availableColumns.includes(col));
    const columns = validColumns.length > 0 ? validColumns.join(', ') : '*';
    
    let query = `SELECT ${columns} FROM ${table}`;
    if (whereClause) {
      query += ` WHERE ${whereClause}`;
    }
    
    return query;
  }

  static async getTableColumns(tableName: string) {
    const query = `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = $1
    `;
    const result = await this.executeQuery(query, [tableName]);
    return result.rows;
  }
}
