import { Router } from 'express';
import { aiService } from './ai-service';
import { aiInsightsStorage } from './ai-insights-storage';

const router = Router();

// Generate and return AI insights for a device
router.get('/insights/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { refresh } = req.query;

    if (!deviceId) {
      return res.status(400).json({ success: false, error: 'Device ID is required' });
    }

    let insights = [];

    try {
      // Check if we should generate fresh insights or use cached ones
      if (refresh === 'true') {
        insights = await aiService.generateDeviceInsights(deviceId);

        // Store insights in database for future use
        if (Array.isArray(insights)) {
          for (const insight of insights) {
            try {
              await aiInsightsStorage.storeInsight({
                device_id: deviceId,
                insight_type: insight.type,
                severity: insight.severity,
                title: insight.title,
                description: insight.description,
                recommendation: insight.recommendation,
                confidence: insight.confidence,
                metadata: insight.metadata || {},
                is_active: true
              });
            } catch (storeError) {
              console.warn('Failed to store insight:', storeError);
            }
          }
        }
      } else {
        // Return cached insights
        try {
          insights = await aiInsightsStorage.getInsightsForDevice(deviceId, 20);
        } catch (cacheError) {
          console.warn('Failed to get cached insights, generating fresh ones:', cacheError);
          insights = await aiService.generateDeviceInsights(deviceId);
        }
      }

      // Ensure insights is an array
      if (!Array.isArray(insights)) {
        insights = [];
      }

      res.json({ success: true, insights });
    } catch (serviceError) {
      console.error('AI service error:', serviceError);
      // Return empty insights array on service error
      res.json({ success: true, insights: [] });
    }
  } catch (error) {
    console.error('Error in AI insights API:', error);
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

// Get AI recommendations for a device
router.get('/recommendations/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const recommendations = await aiService.getDeviceRecommendations(deviceId);
    res.json({ success: true, recommendations });
  } catch (error) {
    console.error('Error getting AI recommendations:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Batch process insights for multiple devices
router.post('/insights/batch', async (req, res) => {
  try {
    const { deviceIds } = req.body;
    const results = [];

    for (const deviceId of deviceIds) {
      try {
        const insights = await aiService.generateDeviceInsights(deviceId);
        results.push({ deviceId, success: true, insights });
      } catch (error) {
        results.push({ deviceId, success: false, error: error.message });
      }
    }

    res.json({ success: true, results });
  } catch (error) {
    console.error('Error in batch AI processing:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;