
import { Router } from "express";
import { adService } from "./ad-service";

const router = Router();

// Test AD connection
router.get("/test-connection", async (req, res) => {
  try {
    const isConnected = await adService.validateConnection();
    res.json({ 
      connected: isConnected,
      message: isConnected ? "Active Directory connection successful" : "Failed to connect to Active Directory"
    });
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

    // This would require a separate method to get user info without authentication
    // For now, return a placeholder response
    res.json({ 
      message: "User sync functionality would be implemented here",
      username 
    });
  } catch (error) {
    res.status(500).json({ 
      message: "Error syncing user from AD",
      error: error.message 
    });
  }
});

export { router as adRoutes };
