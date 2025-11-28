import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import {
  getRecentlyViewed,
  addToRecentlyViewed,
  clearRecentlyViewed
} from '../controllers/recentlyViewedController.js';

const router = express.Router();

// Get user's recently viewed items
router.get('/', protect, getRecentlyViewed);

// Add product to recently viewed
router.post('/', protect, addToRecentlyViewed);

// Clear all recently viewed items
router.delete('/', protect, clearRecentlyViewed);

export default router;