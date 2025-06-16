
import { Router } from "express";
import { analyticsService } from "./analytics-service";

const router = Router();

// Generate performance summary report
router.get("/performance", async (req, res) => {
  try {
    const { timeRange = "7d" } = req.query;
    console.log(`Generating performance report for timeRange: ${timeRange}`);
    
    const data = await analyticsService.generatePerformanceSummary(timeRange as string);
    
    res.json({
      success: true,
      report: {
        id: `perf-${Date.now()}`,
        title: "Performance Summary",
        type: "performance",
        data,
        generated_at: new Date(),
        time_range: timeRange
      }
    });
  } catch (error) {
    console.error("Error generating performance report:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate performance report"
    });
  }
});

// Generate availability report
router.get("/availability", async (req, res) => {
  try {
    const { timeRange = "7d" } = req.query;
    console.log(`Generating availability report for timeRange: ${timeRange}`);
    
    const data = await analyticsService.generateAvailabilityReport(timeRange as string);
    
    res.json({
      success: true,
      report: {
        id: `avail-${Date.now()}`,
        title: "Availability Report",
        type: "availability", 
        data,
        generated_at: new Date(),
        time_range: timeRange
      }
    });
  } catch (error) {
    console.error("Error generating availability report:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate availability report"
    });
  }
});

// Generate system inventory report
router.get("/inventory", async (req, res) => {
  try {
    console.log("Generating system inventory report");
    
    const data = await analyticsService.generateSystemInventory();
    
    res.json({
      success: true,
      report: {
        id: `inv-${Date.now()}`,
        title: "System Inventory",
        type: "inventory",
        data,
        generated_at: new Date(),
        time_range: "current"
      }
    });
  } catch (error) {
    console.error("Error generating inventory report:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate inventory report"
    });
  }
});

// Generate custom report
router.post("/generate", async (req, res) => {
  try {
    const { reportType, timeRange = "7d", format = "json" } = req.body;
    console.log(`Generating custom report: ${reportType}, timeRange: ${timeRange}, format: ${format}`);
    
    const data = await analyticsService.generateCustomReport(reportType, timeRange, format);
    
    if (format === "csv") {
      const csvData = await analyticsService.exportReport(data, "csv");
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${reportType}-report.csv"`);
      res.send(csvData);
    } else if (format === "docx") {
      const wordData = await analyticsService.exportReport(data, "docx");
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${reportType}-report.docx"`);
      res.send(wordData);
    } else {
      res.json({
        success: true,
        report: {
          id: `${reportType}-${Date.now()}`,
          title: `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`,
          type: reportType,
          data,
          generated_at: new Date(),
          time_range: timeRange
        }
      });
    }
  } catch (error) {
    console.error("Error generating custom report:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to generate report"
    });
  }
});

// Get recent reports (placeholder for stored reports)
router.get("/recent", async (req, res) => {
  try {
    console.log("Fetching recent reports...");
    
    // Mock recent reports data - simplified to avoid any potential issues
    const recentReports = [
      {
        id: "perf-march-2024",
        title: "Performance Summary - March 2024",
        type: "performance",
        generated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        time_range: "30d"
      },
      {
        id: "avail-weekly",
        title: "Availability Report - Weekly",
        type: "availability", 
        generated_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        time_range: "7d"
      },
      {
        id: "inv-full-export",
        title: "System Inventory - Full Export",
        type: "inventory",
        generated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        time_range: "current"
      }
    ];
    
    console.log(`Returning ${recentReports.length} recent reports`);
    
    // Add a small delay to prevent overwhelming the system
    await new Promise(resolve => setTimeout(resolve, 100));
    
    res.json({
      success: true,
      reports: recentReports
    });
  } catch (error) {
    console.error("Error fetching recent reports:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch recent reports"
    });
  }
});

export default router;
