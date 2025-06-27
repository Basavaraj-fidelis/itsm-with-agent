
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function createCommandTables() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS agent_commands (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL CHECK (type IN ('execute', 'upload', 'download', 'patch', 'restart', 'health_check')),
        command TEXT NOT NULL,
        parameters JSONB DEFAULT '{}',
        priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'executing', 'completed', 'failed', 'deferred')),
        output TEXT,
        error TEXT,
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        scheduled_for TIMESTAMP WITH TIME ZONE,
        started_at TIMESTAMP WITH TIME ZONE,
        completed_at TIMESTAMP WITH TIME ZONE,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_agent_commands_device_status 
      ON agent_commands(device_id, status);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_agent_commands_pending 
      ON agent_commands(status, priority, created_at) 
      WHERE status = 'pending';
    `);

    console.log('Command tables created successfully');
  } catch (error) {
    console.error('Error creating command tables:', error);
  } finally {
    await pool.end();
  }
}

createCommandTables();
