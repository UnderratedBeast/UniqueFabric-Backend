import express from "express";
import {
  register,
  login,
  getMe,
  forgotPassword,
  verifyOTP,
  resetPassword,
} from "../controllers/userController.js";
// import { protect } from "../middleware/authMiddleware.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", protect, getMe);
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyOTP);
router.post("/reset-password", resetPassword);
export default router;
