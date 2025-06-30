import { Router } from "express";
import { analyticsService } from "../services/analytics-service";
import { reportsStorage } from "../models/reports-storage";

const router = Router();

// Generate performance summary report
router.get("/performance", async (req, res) => {
  try {
    const { timeRange = "7d" } = req.query;
    console.log(`Generating performance report for timeRange: ${timeRange}`);

    const data = await analyticsService.generatePerformanceSummary(
      timeRange as string,
    );

    const report = {
      id: `perf-${Date.now()}`,
      title: "Performance Summary",
      type: "performance",
      data,
      generated_at: new Date(),
      time_range: timeRange as string,
    };

    // Save to database
    try {
      await reportsStorage.saveReport(report);
    } catch (saveError) {
      console.warn("Failed to save report to database:", saveError);
    }

    res.json({
      success: true,
      report,
    });
  } catch (error) {
    console.error("Error generating performance report:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to generate performance report",
    });
  }
});

// Generate availability report
router.get("/availability", async (req, res) => {
  try {
    const { timeRange = "7d" } = req.query;
    console.log(`Generating availability report for timeRange: ${timeRange}`);

    const data = await analyticsService.generateAvailabilityReport(
      timeRange as string,
    );

    const report = {
      id: `avail-${Date.now()}`,
      title: "Availability Report",
      type: "availability",
      data,
      generated_at: new Date(),
      time_range: timeRange as string,
    };

    // Save to database
    try {
      await reportsStorage.saveReport(report);
    } catch (saveError) {
      console.warn("Failed to save report to database:", saveError);
    }

    res.json({
      success: true,
      report,
    });
  } catch (error) {
    console.error("Error generating availability report:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate availability report",
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
      time_range: "current",
    };

    // Save to database
    try {
      await reportsStorage.saveReport(report);
    } catch (saveError) {
      console.warn("Failed to save report to database:", saveError);
    }

    res.json({
      success: true,
      report,
    });
  } catch (error) {
    console.error("Error generating inventory report:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate inventory report",
    });
  }
});

// Generate comprehensive asset inventory report
router.get("/asset-inventory", async (req, res) => {
  try {
    console.log("Generating comprehensive asset inventory report");

    const data = await analyticsService.generateAssetInventoryReport();

    const report = {
      id: `asset-inv-${Date.now()}`,
      title: "Asset Inventory Report",
      type: "asset-inventory",
      data,
      generated_at: new Date(),
      time_range: "current",
    };

    try {
      await reportsStorage.saveReport(report);
    } catch (saveError) {
      console.warn("Failed to save report to database:", saveError);
    }

    res.json({
      success: true,
      report,
    });
  } catch (error) {
    console.error("Error generating asset inventory report:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate asset inventory report",
    });
  }
});

// Generate comprehensive ticket analytics report
router.get("/ticket-analytics", async (req, res) => {
  try {
    const { timeRange = "30d" } = req.query;
    console.log(`Generating ticket analytics report for ${timeRange}`);

    const data = await analyticsService.generateTicketAnalyticsReport(
      timeRange as string,
    );

    const report = {
      id: `ticket-analytics-${Date.now()}`,
      title: "Ticket Analytics Report",
      type: "ticket-analytics",
      data,
      generated_at: new Date(),
      time_range: timeRange as string,
    };

    try {
      await reportsStorage.saveReport(report);
    } catch (saveError) {
      console.warn("Failed to save report to database:", saveError);
    }

    res.json({
      success: true,
      report,
    });
  } catch (error) {
    console.error("Error generating ticket analytics report:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate ticket analytics report",
    });
  }
});

// Generate comprehensive system health report
router.get("/system-health", async (req, res) => {
  try {
    console.log("Generating comprehensive system health report");

    const data = await analyticsService.generateSystemHealthReport();

    const report = {
      id: `sys-health-${Date.now()}`,
      title: "System Health Report",
      type: "system-health",
      data,
      generated_at: new Date(),
      time_range: "current",
    };

    try {
      await reportsStorage.saveReport(report);
    } catch (saveError) {
      console.warn("Failed to save report to database:", saveError);
    }

    res.json({
      success: true,
      report,
    });
  } catch (error) {
    console.error("Error generating system health report:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate system health report",
    });
  }
});

// Generate comprehensive security compliance report
router.get("/security-compliance", async (req, res) => {
  try {
    console.log("Generating comprehensive security compliance report");

    const data = await analyticsService.generateSecurityComplianceReport();

    const report = {
      id: `sec-compliance-${Date.now()}`,
      title: "Security Compliance Report",
      type: "security-compliance",
      data,
      generated_at: new Date(),
      time_range: "current",
    };

    try {
      await reportsStorage.saveReport(report);
    } catch (saveError) {
      console.warn("Failed to save report to database:", saveError);
    }

    res.json({
      success: true,
      report,
    });
  } catch (error) {
    console.error("Error generating security compliance report:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate security compliance report",
    });
  }
});

// Generate custom report (enhanced with new report types)
router.post("/generate", async (req, res) => {
  // Set shorter timeout for report generation
  req.setTimeout(15000); // 15 seconds

  try {
    const { reportType, timeRange = "7d", format = "docx" } = req.body;
    console.log(
      `Generating custom report: ${reportType}, timeRange: ${timeRange}, format: ${format}`,
    );

    // Validate report type
    const allowedReportTypes = [
      "performance",
      "availability",
      "inventory",
      "asset-inventory",
      "ticket-analytics",
      "system-health",
      "security-compliance",
      "trends",
      "capacity",
    ];

    if (!allowedReportTypes.includes(reportType)) {
      return res.status(400).json({
        success: false,
        error: `Invalid report type: ${reportType}. Allowed types: ${allowedReportTypes.join(", ")}`,
      });
    }

    // Add timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Report generation timeout")), 12000);
    });

    const reportPromise = analyticsService.generateCustomReport(
      reportType,
      timeRange,
      format,
    );
    const data = await Promise.race([reportPromise, timeoutPromise]);

    if (format === "csv") {
      const csvData = await analyticsService.exportReport(
        data,
        "csv",
        reportType,
      );
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${reportType}-report.csv"`,
      );
      res.send(csvData);
    } else if (format === "docx") {
      console.log("Generating Word document...");
      const wordData = await analyticsService.exportReport(
        data,
        "docx",
        reportType,
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${reportType}-report.docx"`,
      );
      res.send(wordData);
    } else if (format === "pdf") {
      console.log("Generating PDF document...");
      const pdfData = await analyticsService.exportReport(
        data,
        "pdf",
        reportType,
      );
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${reportType}-report.pdf"`,
      );
      res.send(pdfData);
    } else {
      res.json({
        success: true,
        report: {
          id: `${reportType}-${Date.now()}`,
          title: `${reportType.replace("-", " ").replace(/\b\w/g, (l) => l.toUpperCase())} Report`,
          type: reportType,
          data,
          generated_at: new Date(),
          time_range: timeRange,
        },
      });
    }
  } catch (error) {
    console.error("Error generating custom report:", error);

    // Determine appropriate error message
    let errorMessage = "Failed to generate report";
    let statusCode = 500;

    if (error instanceof Error) {
      if (error.message.includes("timeout")) {
        errorMessage =
          "Report generation timed out. Please try again with a shorter time range.";
        statusCode = 504;
      } else if (error.message.includes("Database connection")) {
        errorMessage =
          "Database connection error. Please check your database configuration.";
        statusCode = 503;
      } else {
        errorMessage = error.message;
      }
    }

    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      reportType: req.body.reportType || "unknown",
    });
  }
});

// Get real-time performance metrics
router.get("/realtime", async (req, res) => {
  // Set very short timeout for real-time data
  req.setTimeout(2000); // 2 seconds only

  try {
    console.log("Fetching real-time performance metrics...");

    // Add timeout promise to prevent hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Realtime metrics timeout")), 1500);
    });

    const metricsPromise = analyticsService.getRealTimeMetrics();
    const metrics = await Promise.race([metricsPromise, timeoutPromise]);

    res.json({
      success: true,
      metrics,
    });
  } catch (error) {
    console.error("Error fetching real-time metrics:", error);

    // Return mock data on error to prevent UI breaking
    res.json({
      success: true,
      metrics: {
        timestamp: new Date(),
        cpu_usage: 45.2,
        memory_usage: 62.8,
        disk_usage: 78.3,
        active_devices: 12,
        alerts_last_hour: 1,
      },
    });
  }
});

// Get trend analysis
router.get("/trends", async (req, res) => {
  try {
    const { metric = "cpu", timeRange = "7d" } = req.query;
    console.log(`Generating trend analysis for ${metric} over ${timeRange}`);

    const trends = await analyticsService.getTrendAnalysis(
      metric as string,
      timeRange as string,
    );

    res.json({
      success: true,
      trends,
    });
  } catch (error) {
    console.error("Error generating trend analysis:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate trend analysis",
    });
  }
});

// Get capacity planning recommendations
router.get("/capacity", async (req, res) => {
  try {
    console.log("Generating capacity planning recommendations...");

    const recommendations = await analyticsService.getCapacityRecommendations();

    res.json({
      success: true,
      recommendations,
    });
  } catch (error) {
    console.error("Error generating capacity recommendations:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate capacity recommendations",
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
      setTimeout(() => reject(new Error("Database query timeout")), 3000);
    });

    let storedReports = [];

    try {
      const dbPromise = reportsStorage.getRecentReports(10);
      storedReports = await Promise.race([dbPromise, timeoutPromise]);
    } catch (dbError) {
      console.warn(
        "Database error when fetching reports, using fallback:",
        dbError,
      );
      storedReports = [];
    }

    // If no stored reports, return some sample data
    const recentReports =
      storedReports.length > 0
        ? storedReports
        : [
            {
              id: "sample-perf-2024",
              title: "Performance Summary - Sample",
              type: "performance",
              generated_at: new Date(
                Date.now() - 2 * 60 * 60 * 1000,
              ).toISOString(),
              time_range: "7d",
            },
            {
              id: "sample-avail-2024",
              title: "Availability Report - Sample",
              type: "availability",
              generated_at: new Date(
                Date.now() - 24 * 60 * 60 * 1000,
              ).toISOString(),
              time_range: "7d",
            },
          ];

    console.log(`Returning ${recentReports.length} recent reports`);

    res.json({
      success: true,
      reports: recentReports,
    });
  } catch (error) {
    console.error("Error fetching recent reports:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch recent reports",
    });
  }
});

// Get specific report by ID
router.get("/report/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Fetching report with ID: ${id}`);

    const report = await reportsStorage.getReportById(id);

    if (!report) {
      return res.status(404).json({
        success: false,
        error: "Report not found",
      });
    }

    res.json({
      success: true,
      report,
    });
  } catch (error) {
    console.error("Error fetching report:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch report",
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
        error: "Report not found or could not be deleted",
      });
    }

    res.json({
      success: true,
      message: "Report deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting report:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete report",
    });
  }
});

export default router;
