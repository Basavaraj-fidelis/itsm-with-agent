import { Router } from "express";
import { aiService } from "../services/ai-service.js";
import { aiInsightsStorage } from "../models/ai-insights-storage.js";
import { authenticateToken } from "../middleware/auth-middleware.js";
import { db } from "../db.js";
import { tickets, knowledgeBase } from "../../shared/ticket-schema.js";
import { eq, ilike, and, or } from 'drizzle-orm';

const router = Router();

// Generate and return AI insights for a device (main endpoint)
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

// Dashboard AI insights endpoint
router.get('/dashboard-insights', authenticateToken, async (req, res) => {
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

// Enhance article suggestions with ChatGPT
router.get("/article-suggestions/:ticketId", async (req, res) => {
  try {
    const ticketId = req.params.ticketId;

    // Get ticket details from ticket storage
    const ticketStorage = await import("../services/ticket-storage.js");
    const ticket = await ticketStorage.ticketStorage.getTicketById(ticketId);

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    // Search for related articles using knowledge AI service
    const knowledgeAIService = await import("../services/knowledge-ai-service.js");
    const relatedArticles = await knowledgeAIService.knowledgeAIService.findRelevantArticles(ticket);

    let suggestions = relatedArticles.map(match => ({
      id: match.article.id,
      title: match.article.title,
      category: match.article.category,
      relevanceScore: Math.round(match.relevanceScore * 100),
      snippet: match.article.content.substring(0, 200) + "...",
      type: 'existing'
    }));

    // If no relevant articles found, generate one with AI
    if (suggestions.length === 0) {
      try {
        const knowledgeAIService = await import("../services/knowledge-ai-service.js");
        const aiArticle = await knowledgeAIService.knowledgeAIService.generateDraftArticle({
          title: ticket.title,
          description: ticket.description,
          category: ticket.category || 'General',
          type: ticket.type,
          tags: ticket.tags || []
        });

        if (aiArticle) {
          suggestions.push({
            id: 'ai-generated',
            title: aiArticle.title,
            category: aiArticle.category,
            relevanceScore: 95,
            snippet: aiArticle.content.substring(0, 200) + "...",
            type: 'ai-generated',
            fullContent: aiArticle.content
          });
        }
      } catch (error) {
        console.error("Error generating AI article:", error);
      }
    }

    res.json({ suggestions: suggestions.sort((a, b) => b.relevanceScore - a.relevanceScore) });
  } catch (error) {
    console.error("Error getting article suggestions:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

function calculateRelevanceScore(ticket: any, article: any): number {
  let score = 50;

  // Title similarity
  const titleWords = ticket.title.toLowerCase().split(' ');
  const articleTitleWords = article.title.toLowerCase().split(' ');
  const titleMatches = titleWords.filter(word => 
    articleTitleWords.some(articleWord => articleWord.includes(word) || word.includes(articleWord))
  ).length;
  score += (titleMatches / titleWords.length) * 30;

  // Category match
  if (ticket.category && article.category && 
      ticket.category.toLowerCase() === article.category.toLowerCase()) {
    score += 20;
  }

  return Math.min(Math.round(score), 100);
}

async function generateAIArticle(ticket: any) {
  const prompt = `Create a knowledge base article to help resolve this IT support ticket:

Title: ${ticket.title}
Description: ${ticket.description}
Category: ${ticket.category || 'General'}
Type: ${ticket.type}

Generate a comprehensive article with:
1. A clear, searchable title
2. Step-by-step resolution instructions
3. Common causes and troubleshooting tips
4. Prevention recommendations

Format as JSON with 'title' and 'content' fields.`;

  // Mock AI response (replace with actual OpenAI/ChatGPT integration)
  const aiResponse = {
    title: `How to Resolve: ${ticket.title}`,
    content: `# Resolution Guide: ${ticket.title}

## Overview
This article provides step-by-step instructions for resolving issues related to: ${ticket.title}

## Common Causes
- System configuration issues
- Network connectivity problems
- User permission conflicts
- Software compatibility issues

## Resolution Steps
1. **Initial Assessment**
   - Verify the reported symptoms
   - Check system logs for error messages
   - Confirm user permissions and access levels

2. **Troubleshooting**
   - Restart affected services
   - Clear application cache and temporary files
   - Update software to latest version
   - Check network connectivity

3. **Advanced Solutions**
   - Review configuration settings
   - Reinstall problematic software
   - Contact vendor support if needed

## Prevention
- Regular system updates
- Periodic user training
- Proactive monitoring
- Regular backup verification

## Related Articles
- System Maintenance Best Practices
- User Access Management
- Network Troubleshooting Guide

For additional assistance, please contact the IT Support team.`
  };

  return aiResponse;
}

export default router;