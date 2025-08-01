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
      const { pool } = await import("./db");

      const result = await pool.query(
        `
        INSERT INTO ai_insights (
          device_id, insight_type, severity, title, description, 
          recommendation, confidence, metadata, created_at, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9)
        RETURNING *
      `,
        [
          insight.device_id,
          insight.insight_type,
          insight.severity,
          insight.title,
          insight.description,
          insight.recommendation,
          insight.confidence,
          JSON.stringify(insight.metadata),
          insight.is_active,
        ],
      );

      return result.rows[0];
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
      const { pool } = await import("./db");

      const result = await pool.query(
        `
        SELECT * FROM ai_insights 
        WHERE device_id = $1 AND is_active = true
        ORDER BY created_at DESC 
        LIMIT $2
      `,
        [deviceId, limit],
      );

      return result.rows.map((row) => ({
        ...row,
        metadata:
          typeof row.metadata === "string"
            ? JSON.parse(row.metadata)
            : row.metadata,
      }));
    } catch (error) {
      console.error("Error fetching AI insights:", error);
      return [];
    }
  }

  async createAIInsightsTable(): Promise<void> {
    try {
      const { pool } = await import("./db");

      await pool.query(`
        CREATE TABLE IF NOT EXISTS ai_insights (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
          insight_type VARCHAR(50) NOT NULL,
          severity VARCHAR(20) NOT NULL,
          title VARCHAR(255) NOT NULL,
          description TEXT NOT NULL,
          recommendation TEXT NOT NULL,
          confidence DECIMAL(3,2) NOT NULL,
          metadata JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          is_active BOOLEAN DEFAULT true,
          INDEX (device_id, created_at),
          INDEX (insight_type, severity)
        )
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