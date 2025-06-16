
import { Router } from "express";
import { analyticsService } from "./analytics-service";
import { reportsStorage } from "./reports-storage";

const router = Router();

// Generate performance summary report
router.get("/performance", async (req, res) => {
  try {
    const { timeRange = "7d" } = req.query;
    console.log(`Generating performance report for timeRange: ${timeRange}`);
    
    const data = await analyticsService.generatePerformanceSummary(timeRange as string);
    
    const report = {
      id: `perf-${Date.now()}`,
      title: "Performance Summary",
      type: "performance",
      data,
      generated_at: new Date(),
      time_range: timeRange as string
    };

    // Save to database
    try {
      await reportsStorage.saveReport(report);
    } catch (saveError) {
      console.warn("Failed to save report to database:", saveError);
    }

    res.json({
      success: true,
      report
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
    
    const report = {
      id: `avail-${Date.now()}`,
      title: "Availability Report",
      type: "availability", 
      data,
      generated_at: new Date(),
      time_range: timeRange as string
    };

    // Save to database
    try {
      await reportsStorage.saveReport(report);
    } catch (saveError) {
      console.warn("Failed to save report to database:", saveError);
    }

    res.json({
      success: true,
      report
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
    
    const report = {
      id: `inv-${Date.now()}`,
      title: "System Inventory",
      type: "inventory",
      data,
      generated_at: new Date(),
      time_range: "current"
    };

    // Save to database
    try {
      await reportsStorage.saveReport(report);
    } catch (saveError) {
      console.warn("Failed to save report to database:", saveError);
    }

    res.json({
      success: true,
      report
    });
  } catch (error) {
    console.error("Error generating inventory report:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate inventory report"
    });
  }
});

// Generate custom report (defaults to Word format)
router.post("/generate", async (req, res) => {
  // Set timeout for long-running report generation
  req.setTimeout(30000); // 30 seconds
  
  try {
    const { reportType, timeRange = "7d", format = "docx" } = req.body;
    console.log(`Generating custom report: ${reportType}, timeRange: ${timeRange}, format: ${format}`);
    
    // Add timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Report generation timeout')), 25000);
    });
    
    const reportPromise = analyticsService.generateCustomReport(reportType, timeRange, format);
    const data = await Promise.race([reportPromise, timeoutPromise]);
    
    if (format === "csv") {
      const csvData = await analyticsService.exportReport(data, "csv");
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${reportType}-report.csv"`);
      res.send(csvData);
    } else if (format === "docx") {
      console.log("Generating Word document...");
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
      error: error instanceof Error ? error.message : "Failed to generate report"
    });
  }
});

// Get recent reports from database
router.get("/recent", async (req, res) => {
  // Set shorter timeout for this endpoint
  req.setTimeout(5000); // 5 seconds
  
  try {
    console.log("Fetching recent reports from database...");
    
    // Add timeout promise to prevent hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database query timeout')), 3000);
    });
    
    let storedReports = [];
    
    try {
      const dbPromise = reportsStorage.getRecentReports(10);
      storedReports = await Promise.race([dbPromise, timeoutPromise]);
    } catch (dbError) {
      console.warn("Database error when fetching reports, using fallback:", dbError);
      storedReports = [];
    }
    
    // If no stored reports, return some sample data
    const recentReports = storedReports.length > 0 ? storedReports : [
      {
        id: "sample-perf-2024",
        title: "Performance Summary - Sample",
        type: "performance",
        generated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        time_range: "7d"
      },
      {
        id: "sample-avail-2024",
        title: "Availability Report - Sample",
        type: "availability", 
        generated_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        time_range: "7d"
      }
    ];
    
    console.log(`Returning ${recentReports.length} recent reports`);
    
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
// Get specific report by ID
router.get("/report/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Fetching report with ID: ${id}`);
    
    const report = await reportsStorage.getReportById(id);
    
    if (!report) {
      return res.status(404).json({
        success: false,
        error: "Report not found"
      });
    }
    
    res.json({
      success: true,
      report
    });
  } catch (error) {
    console.error("Error fetching report:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch report"
    });
  }
});

// Delete report
router.delete("/report/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Deleting report with ID: ${id}`);
    
    const success = await reportsStorage.deleteReport(id);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        error: "Report not found or could not be deleted"
      });
    }
    
    res.json({
      success: true,
      message: "Report deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting report:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete report"
    });
  }
});

export default router;
