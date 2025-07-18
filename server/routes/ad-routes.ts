
import { Router } from "express";

const router = Router();

// AD integration has been removed
router.all('*', (req, res) => {
  res.status(410).json({ 
    message: "Active Directory integration has been removed",
    error: "AD_INTEGRATION_DISABLED" 
  });
});

export { router as adRoutes };
