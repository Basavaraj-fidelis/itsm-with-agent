import { Router } from "express";
import { AuthController } from "../controllers/auth-controller";
import { authenticateToken } from "../middleware/auth-middleware";

const router = Router();

// Main login routes
router.post("/login", AuthController.login);
router.post("/signup", AuthController.signup);
router.post("/logout", AuthController.logout);
router.get("/verify", authenticateToken, AuthController.verifyToken);

// Portal login route for end users with logging
router.post("/portal-login", (req, res, next) => {
  console.log(`🔍 Portal login request received at ${new Date().toISOString()}`);
  console.log("Request method:", req.method);
  console.log("Request URL:", req.url);
  console.log("Request body exists:", !!req.body);
  next();
}, AuthController.portalLogin);

export { router as authRoutes };