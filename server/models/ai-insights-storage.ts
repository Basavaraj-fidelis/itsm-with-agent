import { storage } from "./storage";

export interface StoredAIInsight {
  id: string;
  device_id: string;
  insight_type:
    | "performance"
    | "security"
    | "maintenance"
    | "prediction"
    | "optimization";
  severity: "low" | "medium" | "high" | "critical" | "info";
  title: string;
  description: string;
  recommendation: string;
  confidence: number;
  metadata: any;
  created_at: Date;
  is_active: boolean;
}

class AIInsightsStorage {
  async storeInsight(
    insight: Omit<StoredAIInsight, "id" | "created_at">,
  ): Promise<StoredAIInsight> {
    try {
      const { db, sql } = await import("../db");

      const results = await db.execute(sql`
        INSERT INTO ai_insights (
          device_id, insight_type, severity, title, description, 
          recommendation, confidence, metadata, is_active
        ) VALUES (
          ${insight.device_id}, 
          ${insight.insight_type}, 
          ${insight.severity}, 
          ${insight.title}, 
          ${insight.description}, 
          ${insight.recommendation}, 
          ${insight.confidence}, 
          ${JSON.stringify(insight.metadata || {})}, 
          ${insight.is_active}
        )
        RETURNING *
      `);

      // Handle different database result formats
      const rows = Array.isArray(results) ? results : (results.rows || []);
      const result = rows[0];
      
      return {
        ...result,
        metadata: typeof result.metadata === "string" 
          ? JSON.parse(result.metadata) 
          : (result.metadata || {}),
      };
    } catch (error) {
      console.error("Error storing AI insight:", error);
      throw error;
    }
  }

  async getInsightsForDevice(
    deviceId: string,
    limit: number = 50,
  ): Promise<StoredAIInsight[]> {
    try {
      const { db, sql } = await import("../db");

      const results = await db.execute(sql`
        SELECT * FROM ai_insights 
        WHERE device_id = ${deviceId} AND is_active = true
        ORDER BY created_at DESC 
        LIMIT ${limit}
      `);

      // Handle different database result formats
      const rows = Array.isArray(results) ? results : (results.rows || []);
      
      return rows.map((row: any) => ({
        ...row,
        metadata: typeof row.metadata === "string" 
          ? JSON.parse(row.metadata) 
          : (row.metadata || {}),
      }));
    } catch (error) {
      console.error("Error fetching AI insights:", error);
      return [];
    }
  }

  // Alias method for backwards compatibility
  async getDeviceInsights(deviceId: string, limit: number = 50): Promise<StoredAIInsight[]> {
    return this.getInsightsForDevice(deviceId, limit);
  }

  async createAIInsightsTable(): Promise<void> {
    try {
      const { db, sql } = await import("../db");

      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS ai_insights (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
          insight_type VARCHAR(50) NOT NULL,
          severity VARCHAR(20) NOT NULL,
          title VARCHAR(255) NOT NULL,
          description TEXT NOT NULL,
          recommendation TEXT NOT NULL,
          confidence DECIMAL(3,2) NOT NULL,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          is_active BOOLEAN DEFAULT true
        )
      `);

      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_ai_insights_device_created 
        ON ai_insights(device_id, created_at)
      `);

      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_ai_insights_type_severity 
        ON ai_insights(insight_type, severity)
      `);

      console.log("AI insights table created successfully");
    } catch (error) {
      console.error("Error creating AI insights table:", error);
    }
  }
}

export const aiInsightsStorage = new AIInsightsStorage();
import { storage } from "./storage";

export interface AIInsightRecord {
  device_id: string;
  insight_type: string;
  severity: string;
  title: string;
  description: string;
  recommendation: string;
  confidence: number;
  metadata: any;
  is_active: boolean;
}