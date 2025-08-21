
import { Router } from 'express';
import { authenticateToken } from '../middleware/auth-middleware';
import ThresholdManager from '../utils/threshold-manager';

const router = Router();

// Get all thresholds
router.get('/thresholds', authenticateToken, async (req, res) => {
  try {
    const thresholds = ThresholdManager.getAllThresholds();
    const validation = ThresholdManager.validateThresholds();
    
    res.json({
      success: true,
      data: thresholds,
      validation
    });
  } catch (error) {
    console.error('Error fetching thresholds:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch thresholds'
    });
  }
});

// Check threshold breach for specific metric
router.post('/thresholds/check', authenticateToken, async (req, res) => {
  try {
    const { metric, value, minSeverity = 'INFO' } = req.body;
    
    if (!metric || value === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Metric and value are required'
      });
    }
    
    const severity = ThresholdManager.getSeverityLevel(metric, value);
    const isBreached = ThresholdManager.isThresholdBreached(metric, value, minSeverity);
    const threshold = ThresholdManager.getThresholdForSeverity(metric, severity);
    
    res.json({
      success: true,
      data: {
        metric,
        value,
        severity,
        threshold,
        isBreached,
        minSeverity
      }
    });
  } catch (error) {
    console.error('Error checking threshold:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check threshold'
    });
  }
});

// Get threshold info for specific metric
router.get('/thresholds/:metric', authenticateToken, async (req, res) => {
  try {
    const { metric } = req.params;
    const thresholds = ThresholdManager.getAllThresholds();
    
    const metricThresholds = {};
    for (const [severity, values] of Object.entries(thresholds.alert_thresholds)) {
      const metricKey = metric.toLowerCase().replace('_usage', '');
      if (values[metricKey] !== undefined) {
        metricThresholds[severity] = values[metricKey];
      }
    }
    
    res.json({
      success: true,
      data: {
        metric,
        thresholds: metricThresholds
      }
    });
  } catch (error) {
    console.error('Error fetching metric thresholds:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch metric thresholds'
    });
  }
});

export default router;
