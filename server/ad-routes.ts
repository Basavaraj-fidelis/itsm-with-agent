
import { Router } from "express";
import { adService } from "./ad-service";

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

export { router as adRoutes };
