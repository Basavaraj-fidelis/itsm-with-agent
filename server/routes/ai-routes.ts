import { Router } from "express";
import { aiService } from "../services/ai-service.js";
import { aiInsightsStorage } from "../models/ai-insights-storage.js";

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

// Get AI insights summary for dashboard
router.get("/insights", async (req, res) => {
  try {
    // Get recent insights from storage
    const insights = await aiInsightsStorage.getRecentInsights(20);

    // Aggregate insights by type and severity
    const summary = {
      total_insights: insights.length,
      critical_insights: insights.filter(i => i.severity === 'critical').length,
      high_insights: insights.filter(i => i.severity === 'high').length,
      by_type: {
        performance: insights.filter(i => i.insight_type === 'performance').length,
        security: insights.filter(i => i.insight_type === 'security').length,
        prediction: insights.filter(i => i.insight_type === 'prediction').length,
        maintenance: insights.filter(i => i.insight_type === 'maintenance').length,
        optimization: insights.filter(i => i.insight_type === 'optimization').length
      },
      recent_insights: insights.slice(0, 5),
      last_updated: new Date().toISOString()
    };

    res.json(summary);
  } catch (error) {
    console.error("Error fetching AI insights summary:", error);
    res.status(500).json({ success: false, error: "Failed to fetch AI insights" });
  }
});

export default router;
