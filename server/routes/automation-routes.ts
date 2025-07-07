
import { Router } from "express";
import { storage } from "../storage";

const router = Router();

// Get software packages
router.get("/software-packages", async (req, res) => {
  try {
    const { automationService } = await import("../services/automation-service");
    const packages = automationService.getSoftwarePackages();
    res.json(packages);
  } catch (error) {
    console.error("Error fetching software packages:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Deploy software
router.post("/deploy-software", async (req, res) => {
  try {
    const { device_ids, package_id, scheduled_time } = req.body;

    if (!device_ids || !package_id) {
      return res.status(400).json({ message: "device_ids and package_id are required" });
    }

    const { automationService } = await import("../services/automation-service");
    const scheduledTime = scheduled_time ? new Date(scheduled_time) : new Date();

    const deploymentIds = await automationService.scheduleDeployment(
      device_ids,
      package_id,
      scheduledTime,
    );

    res.json({
      deployment_ids: deploymentIds,
      message: "Software deployment scheduled",
      target_devices: device_ids.length,
      scheduled_time: scheduledTime,
    });
  } catch (error) {
    console.error("Error scheduling software deployment:", error);
    res.status(500).json({ message: error.message || "Internal server error" });
  }
});

// Get deployment status
router.get("/deployment/:deploymentId", async (req, res) => {
  try {
    const { automationService } = await import("../services/automation-service");
    const deployment = await automationService.getDeploymentStatus(req.params.deploymentId);

    if (!deployment) {
      return res.status(404).json({ message: "Deployment not found" });
    }

    res.json(deployment);
  } catch (error) {
    console.error("Error fetching deployment status:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Initiate remediation
router.post("/remediation/:deviceId", async (req, res) => {
  try {
    const { issue_type, remediation_action } = req.body;
    const deviceId = req.params.deviceId;

    // Log remediation action
    await storage.createAlert({
      device_id: deviceId,
      category: "automation",
      severity: "info",
      message: `Automated remediation initiated: ${issue_type}`,
      metadata: {
        issue_type: issue_type,
        remediation_action: remediation_action,
        initiated_by: req.user.email,
        automation_type: "remediation",
        status: "in_progress",
      },
      is_active: true,
    });

    res.json({
      message: "Remediation initiated",
      remediation_id: Date.now().toString(),
      status: "in_progress",
    });
  } catch (error) {
    console.error("Error initiating remediation:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get deployments
router.get("/deployments", async (req, res) => {
  try {
    const alerts = await storage.getActiveAlerts();
    const deployments = alerts.filter(
      (alert) =>
        alert.category === "automation" &&
        alert.metadata?.automation_type === "software_deployment",
    );

    res.json(deployments);
  } catch (error) {
    console.error("Error fetching deployments:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
