import { Router } from "express";
import { authRequired } from "../middleware/auth.js";
import { validateRegister, validateLogin, validateUpdateProfile, register, login, me, updateProfile, updatePassword } from "../controllers/authController.js";

const router = Router();

router.post("/register", validateRegister, register);
router.post("/login", validateLogin, login);
router.get("/me", authRequired, me);
router.put("/profile", authRequired, validateUpdateProfile, updateProfile);
router.put("/password", authRequired, updatePassword);

export default router;
