import { Router } from "express";
import { authRequired, requireRole } from "../middleware/auth.js";
import { listUsers, getUser, updateUser, deleteUser, banUser, addUserComment, addCommentReply, deleteUserComment, userStats } from "../controllers/userController.js";

const router = Router();

router.get("/", authRequired, requireRole("admin"), listUsers);
router.get("/stats", authRequired, requireRole("admin"), userStats);
router.get("/:id", getUser);
router.put("/:id", authRequired, requireRole("admin"), updateUser);
router.delete("/:id", authRequired, requireRole("admin"), deleteUser);
router.patch("/:id/ban", authRequired, requireRole("admin"), banUser);
router.post("/:id/comments", authRequired, addUserComment);
router.post("/comments/:commentId/reply", authRequired, addCommentReply);
router.delete("/:id/comments/:commentId", authRequired, deleteUserComment);

export default router;
