
import { Router } from 'express';
import { storage } from '../storage';
import { DatabaseUtils } from '../utils/database';

const router = Router();

// Get security alerts
router.get('/alerts', async (req, res) => {
  try {
    const { db } = await import('../db');
    
    const securityAlerts = await db.query(`
      SELECT 
        a.id, a.device_id, a.category, a.severity, a.message, a.triggered_at,
        d.hostname, d.ip_address
      FROM alerts a
      JOIN devices d ON a.device_id = d.id
      WHERE a.category IN ('security', 'vulnerability', 'malware', 'unauthorized_access')
        AND a.is_active = true
      ORDER BY a.triggered_at DESC
      LIMIT 100
    `);
    
    res.json(securityAlerts.rows);
  } catch (error) {
    console.error('Error fetching security alerts:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get vulnerabilities for a device
router.get('/vulnerabilities/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { db } = await import('../db');
    
    const vulnerabilities = await db.query(`
      SELECT 
        v.id, v.cve_id, v.severity, v.description, v.solution,
        v.discovered_at, v.patched_at, v.status
      FROM vulnerabilities v
      WHERE v.device_id = $1
      ORDER BY v.severity DESC, v.discovered_at DESC
    `, [deviceId]);
    
    res.json(vulnerabilities.rows);
  } catch (error) {
    console.error('Error fetching vulnerabilities:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get security compliance summary
router.get('/compliance', async (req, res) => {
  try {
    const { db } = await import('../db');
    
    const compliance = await db.query(`
      SELECT 
        COUNT(DISTINCT d.id) as total_devices,
        COUNT(DISTINCT CASE WHEN pc.compliance_status = 'compliant' THEN d.id END) as compliant_devices,
        COUNT(DISTINCT CASE WHEN pc.compliance_status = 'non_compliant' THEN d.id END) as non_compliant_devices,
        COUNT(DISTINCT CASE WHEN pc.compliance_status = 'unknown' THEN d.id END) as unknown_devices
      FROM devices d
      LEFT JOIN patch_compliance pc ON d.id = pc.device_id
    `);
    
    res.json(compliance.rows[0]);
  } catch (error) {
    console.error('Error fetching compliance data:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get audit logs
router.get('/audit', async (req, res) => {
  try {
    const { user, action, resource } = req.query;
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
    
    query += ` ORDER BY al.timestamp DESC LIMIT 100`;
    
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
import { Router } from 'express';
import { authenticateToken } from '../middleware/auth-middleware.js';

const router = Router();

// Security overview endpoint for dashboard
router.get('/api/security-overview', authenticateToken, async (req, res) => {
  try {
    // Mock security overview data - replace with actual security service calls
    const securityOverview = {
      threatLevel: 'low',
      activeThreats: 0,
      vulnerabilities: {
        critical: 0,
        high: 2,
        medium: 5,
        low: 8
      },
      lastScan: new Date().toISOString(),
      complianceScore: 92,
      securityAlerts: 0,
      firewallStatus: 'active',
      antivirusStatus: 'active',
      patchCompliance: 85
    };

    res.json(securityOverview);
  } catch (error) {
    console.error('Error fetching security overview:', error);
    res.status(500).json({ 
      error: 'Failed to fetch security overview',
      message: error.message 
    });
  }
});

export default router;
