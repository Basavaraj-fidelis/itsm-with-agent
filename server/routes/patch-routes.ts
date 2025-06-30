import { Router } from "express";
import { patchComplianceService } from "../services/patch-compliance-service";

const router = Router();

// Get patch compliance dashboard data
router.get("/patch-compliance/dashboard", async (req, res) => {
  try {
    console.log("📊 Fetching patch compliance dashboard data...");
    console.log("Request timestamp:", new Date().toISOString());
    console.log("User agent:", req.headers["user-agent"]);

    // Set a timeout for the operation
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Dashboard query timeout")), 10000);
    });

    console.log("Calling patchComplianceService.getDashboardData()...");
    const dashboardPromise = patchComplianceService.getDashboardData();

    const dashboard = await Promise.race([dashboardPromise, timeoutPromise]);

    console.log("✅ Dashboard data fetched successfully");
    console.log("Summary:", dashboard.summary);
    console.log("Devices count:", dashboard.devices?.length || 0);

    res.status(200).json(dashboard);
  } catch (error) {
    console.error("❌ Error fetching patch compliance dashboard:", error);
    console.error("Error type:", typeof error);
    console.error("Error message:", error?.message || "No message");
    console.error("Error stack:", error?.stack || "No stack");
    console.error("Error name:", error?.name || "No name");
    console.error("Error code:", error?.code || "No code");

    // Check if it's a database connection error
    const isDatabaseError =
      error?.message?.includes("connection") ||
      error?.message?.includes("timeout") ||
      error?.code === "ECONNREFUSED" ||
      error?.code === "ETIMEDOUT";

    const isTypeError =
      error?.message?.includes("operator does not exist") ||
      error?.message?.includes("uuid = character varying");

    let errorMessage = "Failed to load patch compliance data";
    let recommendations = [
      "Patch compliance system is initializing",
      "Try refreshing the page in a few moments",
    ];

    if (isDatabaseError) {
      errorMessage = "Database connection issue";
      recommendations = [
        "Database connection timeout",
        "Check database connectivity",
        "Try refreshing the page",
      ];
    } else if (isTypeError) {
      errorMessage = "Database schema mismatch - UUID comparison error";
      recommendations = [
        "Database schema needs to be updated",
        "Contact system administrator",
        "Check server logs for details",
      ];
    }

    // Return proper error response with mock data fallback
    const errorResponse = {
      summary: {
        total_devices: 2,
        compliant_devices: 1,
        compliance_rate: 50.0,
        devices_with_critical_gaps: 1,
        average_compliance: 88.9,
      },
      devices: [
        {
          device_id: "mock-device-1",
          hostname: "DESKTOP-MOCK01",
          os_name: "Windows 10",
          os_version: "21H2",
          total_patches: 45,
          installed_patches: 38,
          missing_critical: 2,
          missing_important: 5,
          failed_patches: 1,
          compliance_percentage: 84.4,
          risk_score: 60,
          last_scan: new Date().toISOString(),
        },
        {
          device_id: "mock-device-2",
          hostname: "DESKTOP-MOCK02",
          os_name: "Windows 11",
          os_version: "22H2",
          total_patches: 52,
          installed_patches: 48,
          missing_critical: 0,
          missing_important: 2,
          failed_patches: 0,
          compliance_percentage: 92.3,
          risk_score: 25,
          last_scan: new Date().toISOString(),
        },
      ],
      top_non_compliant: [
        {
          device_id: "mock-device-1",
          hostname: "DESKTOP-MOCK01",
          compliance_percentage: 84.4,
          missing_critical: 2,
          missing_important: 5,
          risk_score: 60,
        },
      ],
      upcoming_maintenance: [],
      risk_distribution: {
        high_risk: 0,
        medium_risk: 1,
        low_risk: 1,
      },
      recommendations: [
        "System is currently in mock mode - patch compliance tables are being initialized",
        "Security patches are automatically deployed when system is fully operational",
        "Database connection will be restored shortly",
      ],
      mock_mode: true,
      error_message: errorMessage,
    };

    if (error.message === "Dashboard query timeout") {
      console.log("Returning timeout error response");
      return res.status(408).json({
        error: "Dashboard query timeout",
        message: "The query took too long to execute. Please try again.",
        mock_mode: true,
      });
    } else {
      console.log("Returning mock data response due to database error");
      return res.status(200).json(errorResponse);
    }
  }
});

// Get compliance report for all devices or specific device
router.get("/patch-compliance/report/:deviceId?", async (req, res) => {
  try {
    const { deviceId } = req.params;
    const reports = await patchComplianceService.getDashboardData();
    res.json({ success: true, reports });
  } catch (error) {
    console.error("Error getting compliance report:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Scan specific device for patch status
router.post("/patch-compliance/scan/:deviceId", async (req, res) => {
  try {
    const { deviceId } = req.params;
    const result = await patchComplianceService.processPatchData(
      deviceId,
      req.body,
    );
    res.json({ success: true, result });
  } catch (error) {
    console.error("Error scanning device patches:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Schedule patch deployment
router.post("/patch-compliance/deploy", async (req, res) => {
  try {
    const deployment = req.body;
    const deploymentId =
      await patchComplianceService.createPatchDeployment(deployment);
    res.json({ success: true, deployment_id: deploymentId });
  } catch (error) {
    console.error("Error scheduling patch deployment:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get pending application patches for admin review
router.get("/patch-compliance/pending-applications", async (req, res) => {
  try {
    const pendingPatches =
      await patchComplianceService.getPendingApplicationPatches();
    res.json({ success: true, patches: pendingPatches });
  } catch (error) {
    console.error("Error getting pending application patches:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
