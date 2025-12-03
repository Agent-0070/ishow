import express from "express";
import { authRequired } from "../middleware/auth.js";
import {
  validateReceiptUpload,
  uploadPaymentReceipt,
  getPaymentReceipts,
  confirmPaymentReceipt,
  rejectPaymentReceipt,
  getUserPaymentReceipts,
  getPaymentReceiptImage,
  getPaymentReceiptById
} from "../controllers/paymentReceiptController.js";

const router = express.Router();

// Upload payment receipt (for users)
router.post("/upload", authRequired, validateReceiptUpload, uploadPaymentReceipt);

// Get payment receipts for event creator
router.get("/", authRequired, getPaymentReceipts);

// Get user's own payment receipts
router.get("/my-receipts", authRequired, getUserPaymentReceipts);

// Get payment receipt image (for event creators and receipt owners)
router.get("/:receiptId/image", authRequired, getPaymentReceiptImage);

// Get single payment receipt by id (for event creators and receipt owners)
router.get("/:receiptId", authRequired, getPaymentReceiptById);

// Confirm payment receipt (for event creators)
router.patch("/:receiptId/confirm", authRequired, confirmPaymentReceipt);

// Reject payment receipt (for event creators)
router.patch("/:receiptId/reject", authRequired, rejectPaymentReceipt);

export default router;
