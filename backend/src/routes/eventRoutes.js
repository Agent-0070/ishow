import { Router } from "express";
import { authRequired } from "../middleware/auth.js";
import { validateEvent, validateEventUpdate, listEvents, getEvent, createEvent, updateEvent, deleteEvent, updateStatus, myEvents, addEventComment, sendEventNotification } from "../controllers/eventController.js";

const router = Router();

router.get("/", listEvents);
router.get("/host/my-events", authRequired, myEvents);
router.get("/:id", getEvent);

// Only accept Cloudinary URLs via req.body.images; no direct file uploads here
router.post("/", authRequired, validateEvent, createEvent);
router.put("/:id", authRequired, validateEventUpdate, updateEvent);
router.delete("/:id", authRequired, deleteEvent);
router.patch("/:id/status", authRequired, updateStatus);
router.post("/:id/notify", authRequired, sendEventNotification);
router.post("/:id/comments", authRequired, addEventComment);

export default router;
