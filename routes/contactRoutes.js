// routes/contactRoutes.js
import express from "express";
import {
  submitContactMessage,
  getContactMessages,
  getDashboardMessages,
  markMessageAsRead,
  deleteMessage
} from "../controllers/contactController.js";

const router = express.Router();

// Public route - submit contact form
router.post("/", submitContactMessage);

// Admin routes - protected (you can add auth middleware later)
router.get("/", getContactMessages);
router.get("/dashboard", getDashboardMessages);
router.put("/:id/read", markMessageAsRead);
router.delete("/:id", deleteMessage);

export default router;