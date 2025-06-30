import { Router } from "express";
import { adService } from "../services/ad-service";

const router = Router();

// Configure AD settings
router.post("/configure", async (req, res) => {
  try {
    const config = req.body;
    adService.updateConfig(config);

    res.json({ 
      message: "Active Directory configuration updated successfully",
      configured: true
    });
  } catch (error) {
    res.status(500).json({ 
      message: "Error updating AD configuration",
      error: error.message 
    });
  }
});

// Test AD connection with optional config
router.post("/test-connection", async (req, res) => {
  try {
    const testConfig = req.body;
    const result = await adService.testConnection(testConfig);
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      connected: false, 
      message: "Error testing AD connection",
      error: error.message 
    });
  }
});

// Legacy test connection endpoint
router.get("/test-connection", async (req, res) => {
  try {
    const result = await adService.testConnection();
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      connected: false, 
      message: "Error testing AD connection",
      error: error.message 
    });
  }
});

// Sync specific user from AD
router.post("/sync-user", async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ message: "Username is required" });
    }

    // Get user from AD
    const adUser = await adService.getUserByUsername(username);

    if (!adUser) {
      return res.status(404).json({ 
        message: `User '${username}' not found in Active Directory` 
      });
    }

    // Sync to database
    const localUser = await adService.syncUserToDatabase(adUser);

    res.json({ 
      message: `User '${username}' synced successfully`,
      user: {
        username: adUser.username,
        email: adUser.email,
        displayName: adUser.displayName,
        department: adUser.department,
        role: localUser.role
      }
    });
  } catch (error) {
    res.status(500).json({ 
      message: "Error syncing user from AD",
      error: error.message 
    });
  }
});

// Sync all users from AD
router.post("/sync-all-users", async (req, res) => {
  try {
    const adUsers = await adService.getAllUsers();
    const syncedUsers = [];
    let successCount = 0;
    let errorCount = 0;

    for (const adUser of adUsers) {
      try {
        const localUser = await adService.syncUserToDatabase(adUser);
        syncedUsers.push({
          username: adUser.username,
          email: adUser.email,
          displayName: adUser.displayName,
          department: adUser.department,
          role: localUser.role
        });
        successCount++;
      } catch (error) {
        console.error(`Failed to sync user ${adUser.username}:`, error);
        errorCount++;
      }
    }

    res.json({ 
      message: `Bulk sync completed: ${successCount} users synced successfully, ${errorCount} errors`,
      syncedCount: successCount,
      errorCount,
      users: syncedUsers
    });
  } catch (error) {
    res.status(500).json({ 
      message: "Error during bulk user sync",
      error: error.message 
    });
  }
});

// Get AD groups
router.get("/groups", async (req, res) => {
  try {
    const groups = await adService.getGroups();
    res.json(groups.map(group => ({
      name: group.name,
      dn: group.dn,
      description: group.description,
      memberCount: group.members.length
    })));
  } catch (error) {
    res.status(500).json({ 
      message: "Error fetching AD groups",
      error: error.message 
    });
  }
});

// Get AD configuration
router.get("/config", async (req, res) => {
  try {
    // Return current AD configuration (without sensitive data)
    const config = {
      server: process.env.AD_SERVER || "",
      baseDN: process.env.AD_BASE_DN || "",
      bindDN: process.env.AD_BIND_DN || "",
      enabled: !!process.env.AD_ENABLED,
    };
    res.json(config);
  } catch (error) {
    console.error("Error getting AD config:", error);
    res.status(500).json({ error: "Failed to get AD configuration" });
  }
});

// Get sync history
router.get("/sync-history", async (req, res) => {
  try {
    // In a real implementation, this would come from a database
    const mockHistory = [
      {
        type: "Manual Sync",
        scope: "All Users",
        summary: "Synced 25 users, 3 new, 2 updated",
        timestamp: new Date(Date.now() - 2 * 60 * 1000),
        initiated_by: "admin@company.com",
        status: "success",
        duration: 1250,
        errors: []
      },
      {
        type: "Scheduled Sync",
        scope: "Daily",
        summary: "Synced 25 users, 0 new, 1 updated",
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
        initiated_by: "system",
        status: "success",
        duration: 890,
        errors: []
      }
    ];
    res.json(mockHistory);
  } catch (error) {
    console.error("Error getting sync history:", error);
    res.status(500).json({ error: "Failed to get sync history" });
  }
});

// Get group mappings
router.get("/group-mappings", async (req, res) => {
  try {
    const mockMappings = [
      { ad_group: "IT-Admins", system_role: "admin", user_count: 3 },
      { ad_group: "IT-Support", system_role: "technician", user_count: 8 },
      { ad_group: "Managers", system_role: "manager", user_count: 12 },
      { ad_group: "Employees", system_role: "user", user_count: 45 }
    ];
    res.json(mockMappings);
  } catch (error) {
    console.error("Error getting group mappings:", error);
    res.status(500).json({ error: "Failed to get group mappings" });
  }
});

// Get real-time sync status
router.get("/real-time-status", async (req, res) => {
  try {
    const mockStatus = {
      status: 'idle',
      last_sync: new Date(Date.now() - 2 * 60 * 1000),
      synced_users: 68,
      total_users: 70,
      conflicts: 0,
      current_operation: null,
      progress: 0
    };
    res.json(mockStatus);
  } catch (error) {
    console.error("Error getting real-time status:", error);
    res.status(500).json({ error: "Failed to get real-time status" });
  }
});

// Get orphaned accounts
router.get("/orphaned-accounts", async (req, res) => {
  try {
    // Mock orphaned accounts data
    const mockOrphaned = [];
    res.json(mockOrphaned);
  } catch (error) {
    console.error("Error getting orphaned accounts:", error);
    res.status(500).json({ error: "Failed to get orphaned accounts" });
  }
});

// Save scheduled sync settings
router.post("/scheduled-sync", async (req, res) => {
  try {
    const { enabled, interval, time, sync_users, sync_groups } = req.body;

    // In a real implementation, save these settings to database
    console.log("Scheduled sync settings updated:", {
      enabled, interval, time, sync_users, sync_groups
    });

    res.json({ message: "Scheduled sync settings saved successfully" });
  } catch (error) {
    console.error("Error saving scheduled sync settings:", error);
    res.status(500).json({ error: "Failed to save scheduled sync settings" });
  }
});

export { router as adRoutes };