import { Router } from "express";
import { AuthController } from "../controllers/auth-controller";
import { authMiddleware } from "../middleware/auth-middleware";

const router = Router();

// Main login routes
router.post("/login", AuthController.login);
router.post("/signup", AuthController.signup);
router.post("/logout", AuthController.logout);
router.get("/verify", authMiddleware, AuthController.verifyToken);

// Portal login route for end users
router.post("/portal-login", AuthController.portalLogin);

export { router as authRoutes };