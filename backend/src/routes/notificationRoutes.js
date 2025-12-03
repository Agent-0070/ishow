import { Router } from "express";
import { authRequired } from "../middleware/auth.js";
import { listNotifications, markRead, markAllRead, deleteNotification, clearNotifications, getSettings, updateSettings, cleanupNotifications, subscribeToPush, unsubscribeFromPush } from "../controllers/notificationController.js";


const router = Router();

router.get("/", authRequired, listNotifications);
router.patch("/:id/read", authRequired, markRead);
router.patch("/read-all", authRequired, markAllRead);
router.delete("/:id", authRequired, deleteNotification);
router.delete("/", authRequired, clearNotifications);
router.post("/cleanup", authRequired, cleanupNotifications);
router.get("/settings", authRequired, getSettings);
router.put("/settings", authRequired, updateSettings);

// Push notification endpoints
router.post("/subscribe", authRequired, subscribeToPush);
router.post("/unsubscribe", authRequired, unsubscribeFromPush);





export default router;
