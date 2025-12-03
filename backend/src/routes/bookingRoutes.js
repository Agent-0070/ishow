import { Router } from "express";
import { authRequired } from "../middleware/auth.js";
import { validateBooking, createBooking, myBookings, eventBookings, checkinBooking } from "../controllers/bookingController.js";

const router = Router();

router.post("/", authRequired, validateBooking, createBooking);
router.get("/me", authRequired, myBookings);
router.get("/event/:eventId", authRequired, eventBookings);
router.patch("/:id/checkin", authRequired, checkinBooking);

export default router;
