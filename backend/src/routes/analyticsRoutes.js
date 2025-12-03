import { Router } from "express";
import { authRequired, requireRole } from "../middleware/auth.js";
import { dashboard, eventAnalytics, platformAnalytics } from "../controllers/analyticsController.js";

const router = Router();

router.get("/dashboard", authRequired, requireRole("admin"), dashboard);
router.get("/events/:eventId", authRequired, requireRole("admin"), eventAnalytics);
router.get("/platform", authRequired, requireRole("admin"), platformAnalytics);

export default router;
