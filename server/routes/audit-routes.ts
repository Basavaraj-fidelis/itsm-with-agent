
import { Router } from 'express';
import { DatabaseUtils } from '../utils/database';

const router = Router();

// Get audit logs
router.get('/logs', async (req, res) => {
  try {
    const { user, action, resource, startDate, endDate } = req.query;
    const { db } = await import('../db');
    
    let query = `
      SELECT 
        al.id, al.user_id, al.action, al.resource_type, al.resource_id,
        al.details, al.ip_address, al.user_agent, al.timestamp,
        u.name as user_name, u.email as user_email
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (user) {
      query += ` AND (u.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
      params.push(`%${user}%`);
      paramIndex++;
    }
    
    if (action) {
      query += ` AND al.action = $${paramIndex}`;
      params.push(action);
      paramIndex++;
    }
    
    if (resource) {
      query += ` AND al.resource_type = $${paramIndex}`;
      params.push(resource);
      paramIndex++;
    }
    
    if (startDate) {
      query += ` AND al.timestamp >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }
    
    if (endDate) {
      query += ` AND al.timestamp <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }
    
    query += ` ORDER BY al.timestamp DESC LIMIT 1000`;
    
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create audit log entry
router.post('/logs', async (req, res) => {
  try {
    const { user_id, action, resource_type, resource_id, details, ip_address, user_agent } = req.body;
    const { db } = await import('../db');
    
    const result = await db.query(`
      INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent, timestamp)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING id, timestamp
    `, [user_id, action, resource_type, resource_id, JSON.stringify(details), ip_address, user_agent]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating audit log:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
