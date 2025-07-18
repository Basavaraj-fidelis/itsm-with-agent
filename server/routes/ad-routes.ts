
import { Router } from "express";

const router = Router();

// AD integration completely removed
router.all('*', (req, res) => {
  res.status(404).json({ 
    message: "Active Directory endpoints no longer exist",
    error: "AD_REMOVED" 
  });
});

export { router as adRoutes };
