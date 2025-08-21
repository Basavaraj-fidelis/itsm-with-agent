import { Router } from "express";
import { storage } from "../storage";

const router = Router();

// Get all alerts
router.get("/", async (req, res) => {
  try {
    console.log("Fetching alerts for user:", req.user?.email);
    const alerts = await storage.getAlerts();
    console.log(`Found ${alerts.length} alerts`);

    // Ensure we return an array
    const alertsArray = Array.isArray(alerts) ? alerts : [];
    res.json(alertsArray);
  } catch (error) {
    console.error("Error fetching alerts:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
});

// Get single alert endpoint
router.get("/:id", async (req, res) => {
  try {
    const alertId = req.params.id;
    console.log(`Fetching alert: ${alertId}`);

    const alert = await storage.getAlertById(alertId);

    if (!alert) {
      return res.status(404).json({ message: "Alert not found" });
    }

    res.json(alert);
  } catch (error) {
    console.error("Error fetching alert:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Mark alert as read endpoint
router.post("/:id/read", async (req, res) => {
  try {
    const alertId = req.params.id;
    const userId = req.user?.id || req.user?.email;
    console.log(`User ${userId} marking alert as read: ${alertId}`);

    if (!alertId) {
      return res.status(400).json({
        message: "Alert ID is required",
        success: false,
      });
    }

    // Check if alert exists first
    const alert = await storage.getAlertById(alertId);
    if (!alert) {
      return res.status(404).json({
        message: "Alert not found",
        alertId: alertId,
        success: false,
      });
    }

    try {
      await storage.markAlertAsRead(alertId, userId);
      console.log(`Alert ${alertId} marked as read by ${userId}`);

      res.json({
        message: "Alert marked as read successfully",
        alertId: alertId,
        success: true,
        readBy: userId,
        readAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error(`Error marking alert as read ${alertId}:`, error);
      res.status(500).json({
        message: "Failed to mark alert as read",
        error: error.message,
        alertId: alertId,
        success: false,
      });
    }
  } catch (error) {
    console.error("Error in mark alert as read endpoint:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error.message,
      success: false,
    });
  }
});

// Resolve alert endpoint
router.post("/:id/resolve", async (req, res) => {
  try {
    const alertId = req.params.id;
    const userId = req.user?.id || req.user?.email;
    console.log(`User ${userId} attempting to resolve alert: ${alertId}`);

    if (!alertId) {
      return res.status(400).json({
        message: "Alert ID is required",
        success: false,
      });
    }

    // Check if alert exists first
    let alert;
    try {
      alert = await storage.getAlertById(alertId);
    } catch (fetchError) {
      console.error(`Error fetching alert ${alertId}:`, fetchError);
      return res.status(500).json({
        message: "Error fetching alert",
        error: fetchError.message,
        success: false,
      });
    }

    if (!alert) {
      console.log(`Alert ${alertId} not found`);
      return res.status(404).json({
        message: "Alert not found",
        alertId: alertId,
        success: false,
      });
    }

    if (!alert.is_active) {
      console.log(`Alert ${alertId} is already resolved`);
      return res.status(400).json({
        message: "Alert is already resolved",
        alertId: alertId,
        success: false,
      });
    }

    try {
      await storage.resolveAlert(alertId);
      console.log(`Alert ${alertId} resolved successfully by ${userId}`);

      res.json({
        message: "Alert resolved successfully",
        alertId: alertId,
        success: true,
        resolvedBy: userId,
        resolvedAt: new Date().toISOString(),
      });
    } catch (resolveError) {
      console.error(`Error resolving alert ${alertId}:`, resolveError);
      res.status(500).json({
        message: "Failed to resolve alert",
        error: resolveError.message,
        alertId: alertId,
        success: false,
      });
    }
  } catch (error) {
    console.error("Error in resolve alert endpoint:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error.message,
      success: false,
    });
  }
});

export default router;