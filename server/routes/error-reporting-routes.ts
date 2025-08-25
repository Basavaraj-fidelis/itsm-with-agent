import express from 'express';
import { Pool } from 'pg';
import { authenticateToken } from '../middleware/auth-middleware';

const router = express.Router();

// Error reporting endpoint
router.post('/error-reports', async (req, res) => {
  try {
    const {
      errorId,
      message,
      stack,
      componentStack,
      context,
      timestamp,
      userAgent,
      url,
      retryCount,
    } = req.body;

    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    // Store error report
    await pool.query(`
      INSERT INTO error_reports (
        error_id, message, stack, component_stack, context,
        timestamp, user_agent, url, retry_count, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (error_id) DO UPDATE SET
        retry_count = error_reports.retry_count + 1,
        metadata = $10
    `, [
      errorId, message, stack, componentStack, context,
      new Date(timestamp), userAgent, url, retryCount || 0,
      JSON.stringify(req.body)
    ]);

    await pool.end();

    res.json({ success: true, errorId });
  } catch (error) {
    console.error('Error storing error report:', error);
    res.status(500).json({ error: 'Failed to store error report' });
  }
});

// Get error reports (for admin dashboard)
router.get('/error-reports', authenticateToken, async (req, res) => {
  try {
    const { limit = 50, resolved = 'false' } = req.query;

    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    const result = await pool.query(`
      SELECT 
        error_id, message, context, timestamp, retry_count,
        resolved, resolved_at, created_at
      FROM error_reports 
      WHERE resolved = $1
      ORDER BY created_at DESC 
      LIMIT $2
    `, [resolved === 'true', parseInt(limit as string)]);

    await pool.end();

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching error reports:', error);
    res.status(500).json({ error: 'Failed to fetch error reports' });
  }
});

// Mark error as resolved
router.put('/error-reports/:errorId/resolve', authenticateToken, async (req, res) => {
  try {
    const { errorId } = req.params;

    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    await pool.query(`
      UPDATE error_reports 
      SET resolved = true, resolved_at = NOW()
      WHERE error_id = $1
    `, [errorId]);

    await pool.end();

    res.json({ success: true });
  } catch (error) {
    console.error('Error resolving error report:', error);
    res.status(500).json({ error: 'Failed to resolve error report' });
  }
});

export default router;