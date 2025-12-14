import express from 'express';
import {
  createReview,
  getPendingReviews,
  getMyReviews,
  getProductReviews,
  updateReview,
  deleteReview,
  toggleHelpful,
  getHelpfulStatus,
  getUserHelpfulVotes,
  reportReview,
  getAllReviews,
  adminRemoveReview,
  adminRestoreReview,
  adminDeleteReview,
  getReviewStats
} from '../controllers/reviewController.js';
import { protect, adminOrManager } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Public routes
router.get('/product/:productId', getProductReviews);

// User routes - Authentication required
router.use(protect);

// Review management
router.get('/pending', getPendingReviews);
router.get('/my-reviews', getMyReviews);
router.post('/', createReview);
router.put('/:id', updateReview);
router.delete('/:id', deleteReview);

// Helpful functionality
router.post('/:id/helpful', toggleHelpful); // Toggle helpful status
router.get('/:id/helpful-status', getHelpfulStatus); // Check if user marked as helpful
router.get('/helpful/user-votes', getUserHelpfulVotes); // Get all user's helpful votes

// Report review
router.post('/:id/report', reportReview);

// Admin/Manager routes
router.get('/admin/all', adminOrManager, getAllReviews);
router.put('/admin/:id/remove', adminOrManager, adminRemoveReview);
router.put('/admin/:id/restore', adminOrManager, adminRestoreReview);
router.delete('/admin/:id', adminOrManager, adminDeleteReview);
router.get('/stats', adminOrManager, getReviewStats);

export default router;