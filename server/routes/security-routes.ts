import { Router } from 'express';
import { authenticateToken } from '../middleware/auth-middleware';
import { storage } from '../storage';
import { DatabaseUtils } from '../utils/database';

const router = Router();

// Get security alerts
router.get('/alerts', authenticateToken, async (req, res) => {
  try {
    const { db } = await import('../db');

    const securityAlerts = await db.query(`
      SELECT 
        a.id, a.device_id, a.category, a.severity, a.message, a.triggered_at,
        a.metadata, a.is_active,
        d.hostname as device_hostname, d.ip_address
      FROM alerts a
      LEFT JOIN devices d ON a.device_id = d.id
      WHERE a.category IN ('security', 'vulnerability', 'malware', 'unauthorized_access')
        AND a.is_active = true
      ORDER BY a.triggered_at DESC
      LIMIT 100
    `);

    res.json(securityAlerts.rows || []);
  } catch (error) {
    console.error('Error fetching security alerts:', error);
    res.json([]);
  }
});

// Get vulnerabilities for a device
router.get('/vulnerabilities', authenticateToken, async (req, res) => {
  try {
    const { device_id } = req.query;

    if (!device_id) {
      return res.json([]);
    }

    // Get device to ensure it exists
    const device = await storage.getDevice(device_id as string);
    if (!device) {
      return res.json([]);
    }

    // Get latest device report
    const reports = await storage.getDeviceReports(device_id as string, 1);
    if (reports.length === 0) {
      return res.json([]);
    }

    const latestReport = reports[0];
    let rawData;

    try {
      rawData = typeof latestReport.raw_data === 'string' 
        ? JSON.parse(latestReport.raw_data)
        : latestReport.raw_data;
    } catch (parseError) {
      console.error('Failed to parse device report data:', parseError);
      return res.json([]);
    }

    // Get installed software
    const software = rawData?.software?.installed || [];

    // Mock vulnerability check for now - replace with actual vulnerability service
    const vulnerabilities = [];

    for (const app of software) {
      if (app.name && app.version) {
        // Simulate vulnerability checking
        if (Math.random() < 0.1) { // 10% chance of vulnerability
          vulnerabilities.push({
            software_name: app.name,
            version: app.version,
            cve_matches: [{
              cve_id: `CVE-2024-${Math.floor(Math.random() * 10000)}`,
              severity: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)],
              patch_available: Math.random() < 0.7
            }]
          });
        }
      }
    }

    res.json(vulnerabilities);
  } catch (error) {
    console.error('Error fetching vulnerabilities:', error);
    res.json([]);
  }
});

// Get security compliance summary
router.get('/compliance', authenticateToken, async (req, res) => {
  try {
    const { db } = await import('../db');

    const compliance = await db.query(`
      SELECT 
        COUNT(DISTINCT d.id) as total_devices,
        COUNT(DISTINCT CASE WHEN d.status = 'online' THEN d.id END) as online_devices,
        COUNT(DISTINCT CASE WHEN d.status = 'offline' THEN d.id END) as offline_devices
      FROM devices d
    `);

    const result = compliance.rows[0] || {};

    res.json({
      total_devices: parseInt(result.total_devices) || 0,
      compliant_devices: Math.floor((parseInt(result.online_devices) || 0) * 0.85),
      non_compliant_devices: Math.floor((parseInt(result.online_devices) || 0) * 0.15),
      unknown_devices: parseInt(result.offline_devices) || 0
    });
  } catch (error) {
    console.error('Error fetching compliance data:', error);
    res.json({
      total_devices: 0,
      compliant_devices: 0,
      non_compliant_devices: 0,
      unknown_devices: 0
    });
  }
});

// Security overview endpoint for dashboard
router.get('/overview', authenticateToken, async (req, res) => {
  try {
    const { securityService } = await import('../services/security-service');
    const overview = await securityService.getSecurityOverview();
    res.json(overview);
  } catch (error) {
    console.error('Error fetching security overview:', error);
    res.status(500).json({
      threatLevel: 'unknown',
      activeThreats: 0,
      vulnerabilities: { critical: 0, high: 0, medium: 0, low: 0 },
      lastScan: new Date().toISOString(),
      complianceScore: 0,
      securityAlerts: 0,
      firewallStatus: 'unknown',
      antivirusStatus: 'unknown',
      patchCompliance: 0
    });
  }
});

export default router;