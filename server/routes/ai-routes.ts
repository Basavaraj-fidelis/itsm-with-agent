import { Router } from "express";
import { aiService } from "../services/ai-service.js";
import { aiInsightsStorage } from "../models/ai-insights-storage.js";
import { authenticateToken } from "../middleware/auth-middleware.js";

const router = Router();

// Generate and return AI insights for a device
router.get("/insights/:deviceId", async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { refresh } = req.query;

    if (!deviceId) {
      return res
        .status(400)
        .json({ success: false, error: "Device ID is required" });
    }

    // Set timeout to prevent long-running requests
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Request timeout")), 5000),
    );

    let insights = [];

    try {
      const insightsPromise = (async () => {
        // Check if we should generate fresh insights or use cached ones
        if (refresh === "true") {
          const generatedInsights =
            await aiService.generateDeviceInsights(deviceId);

          // Store insights in database for future use (fire and forget)
          if (Array.isArray(generatedInsights)) {
            setImmediate(async () => {
              for (const insight of generatedInsights) {
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
                    is_active: true,
                  });
                } catch (storeError) {
                  console.warn("Failed to store insight:", storeError.message);
                }
              }
            });
          }
          return generatedInsights;
        } else {
          // Try cached insights first
          try {
            const cachedInsights = await aiInsightsStorage.getInsightsForDevice(
              deviceId,
              20,
            );
            if (cachedInsights && cachedInsights.length > 0) {
              return cachedInsights;
            }
          } catch (cacheError) {
            console.warn("Failed to get cached insights:", cacheError.message);
          }

          // Fallback to generating fresh insights
          return await aiService.generateDeviceInsights(deviceId);
        }
      })();

      insights = await Promise.race([insightsPromise, timeout]);

      // Ensure insights is an array
      if (!Array.isArray(insights)) {
        insights = [];
      }

      res.json({ success: true, insights });
    } catch (serviceError) {
      console.warn("AI service timeout or error:", serviceError.message);
      // Return empty insights array on service error/timeout
      res.json({ success: true, insights: [] });
    }
  } catch (error) {
    console.error("Error in AI insights API:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// Get AI recommendations for a device
router.get("/recommendations/:deviceId", async (req, res) => {
  try {
    const { deviceId } = req.params;
    const recommendations = await aiService.getDeviceRecommendations(deviceId);
    res.json({ success: true, recommendations });
  } catch (error) {
    console.error("Error getting AI recommendations:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Batch process insights for multiple devices
router.post("/insights/batch", async (req, res) => {
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
    console.error("Error in batch AI processing:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// AI Insights endpoint for specific device
router.get('/insights/device/:deviceId', authenticateToken, async (req, res) => {
  try {
    const { deviceId } = req.params;
    console.log('Fetching AI insights for device:', deviceId);

    // Check if the method exists before calling it
    if (typeof aiInsightsStorage.getDeviceInsights !== 'function') {
      console.warn('getDeviceInsights method not found, returning empty insights');
      return res.json({
        success: true,
        data: [],
        total: 0,
        message: 'AI insights feature is being initialized'
      });
    }

    const insights = await aiInsightsStorage.getDeviceInsights(deviceId);

    res.json({
      success: true,
      data: insights,
      total: insights.length
    });
  } catch (error) {
    console.error('Error fetching device AI insights:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch AI insights',
      message: error.message
    });
  }
});

// AI-powered insights and recommendations
router.get('/api/ai-insights', authenticateToken, async (req, res) => {
  try {
    // Mock AI insights data for dashboard
    const insights = {
      systemHealth: 'good',
      recommendations: [
        'Consider updating 3 devices with pending security patches',
        'Monitor disk usage on SRV-DATABASE (85% full)',
        'Review failed login attempts from IP 192.168.1.100'
      ],
      predictiveAlerts: [],
      performanceTrends: {
        cpu: 'stable',
        memory: 'increasing',
        disk: 'stable'
      },
      lastUpdated: new Date().toISOString()
    };

    res.json(insights);
  } catch (error) {
    console.error('Error fetching AI insights:', error);
    res.status(500).json({ 
      error: 'Failed to fetch AI insights',
      message: error.message 
    });
  }
});

router.get('/api/ai/insights', authenticateToken, async (req, res) => {

});

export default router;