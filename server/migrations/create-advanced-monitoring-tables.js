
import { Pool } from 'pg';

async function createAdvancedMonitoringTables() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Creating advanced monitoring tables...');

    // Create detailed_performance_metrics table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS detailed_performance_metrics (
        id SERIAL PRIMARY KEY,
        device_id VARCHAR(255) NOT NULL,
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        cpu_metrics JSONB NOT NULL,
        memory_metrics JSONB NOT NULL,
        disk_metrics JSONB NOT NULL,
        network_metrics JSONB NOT NULL,
        process_metrics JSONB NOT NULL,
        health_metrics JSONB NOT NULL,
        security_metrics JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Create indexes for time-series queries
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_detailed_metrics_device_timestamp 
      ON detailed_performance_metrics(device_id, timestamp DESC);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_detailed_metrics_timestamp 
      ON detailed_performance_metrics(timestamp DESC);
    `);

    // Create GIN indexes for JSONB columns for faster queries
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_detailed_metrics_cpu_gin 
      ON detailed_performance_metrics USING GIN (cpu_metrics);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_detailed_metrics_memory_gin 
      ON detailed_performance_metrics USING GIN (memory_metrics);
    `);

    // Create performance_trends table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS performance_trends (
        id SERIAL PRIMARY KEY,
        device_id VARCHAR(255) NOT NULL,
        metric_name VARCHAR(100) NOT NULL,
        time_period VARCHAR(10) NOT NULL,
        trend_direction VARCHAR(20) NOT NULL,
        trend_rate DECIMAL(10,6) NOT NULL,
        confidence_score DECIMAL(3,2) NOT NULL,
        prediction_next_24h DECIMAL(10,2) NOT NULL,
        recommendation TEXT,
        last_calculated TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(device_id, metric_name, time_period)
      );
    `);

    // Create error_reports table for enhanced error boundaries
    await pool.query(`
      CREATE TABLE IF NOT EXISTS error_reports (
        id SERIAL PRIMARY KEY,
        error_id VARCHAR(255) UNIQUE NOT NULL,
        message TEXT NOT NULL,
        stack TEXT,
        component_stack TEXT,
        context VARCHAR(255),
        timestamp TIMESTAMPTZ NOT NULL,
        user_agent TEXT,
        url TEXT,
        retry_count INTEGER DEFAULT 0,
        resolved BOOLEAN DEFAULT FALSE,
        resolved_at TIMESTAMPTZ,
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Create performance_alerts table for advanced alerts
    await pool.query(`
      CREATE TABLE IF NOT EXISTS performance_alerts (
        id SERIAL PRIMARY KEY,
        alert_id VARCHAR(255) UNIQUE NOT NULL,
        device_id VARCHAR(255) NOT NULL,
        metric_type VARCHAR(100) NOT NULL,
        alert_type VARCHAR(50) NOT NULL,
        severity VARCHAR(20) NOT NULL,
        current_value DECIMAL(10,2),
        threshold_value DECIMAL(10,2),
        trend_direction VARCHAR(20),
        trend_rate DECIMAL(10,6),
        message TEXT NOT NULL,
        recommendation TEXT NOT NULL,
        triggered_at TIMESTAMPTZ NOT NULL,
        acknowledged BOOLEAN DEFAULT FALSE,
        acknowledged_by VARCHAR(255),
        acknowledged_at TIMESTAMPTZ,
        resolved BOOLEAN DEFAULT FALSE,
        resolved_at TIMESTAMPTZ,
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Create indexes for performance_alerts
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_performance_alerts_device_severity 
      ON performance_alerts(device_id, severity, triggered_at DESC);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_performance_alerts_unresolved 
      ON performance_alerts(resolved, triggered_at DESC) WHERE resolved = FALSE;
    `);

    // Create data retention policy for detailed metrics (keep last 90 days)
    await pool.query(`
      CREATE OR REPLACE FUNCTION cleanup_old_detailed_metrics() 
      RETURNS void AS $$
      BEGIN
        DELETE FROM detailed_performance_metrics 
        WHERE timestamp < NOW() - INTERVAL '90 days';
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Create periodic cleanup job (if pg_cron extension is available)
    try {
      await pool.query(`
        SELECT cron.schedule('cleanup-detailed-metrics', '0 2 * * *', 'SELECT cleanup_old_detailed_metrics();');
      `);
      console.log('✅ Scheduled cleanup job for detailed metrics');
    } catch (cronError) {
      console.log('ℹ️  pg_cron extension not available, manual cleanup required');
    }

    console.log('✅ Advanced monitoring tables created successfully');

  } catch (error) {
    console.error('Error creating advanced monitoring tables:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Check if this file is being run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createAdvancedMonitoringTables()
    .then(() => {
      console.log('Advanced monitoring setup completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('Setup failed:', error);
      process.exit(1);
    });
}

export { createAdvancedMonitoringTables };
