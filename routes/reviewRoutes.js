import express from 'express';
import {
  createReview,
  getPendingReviews,
  getMyReviews,
  getProductReviews,
  updateReview,
  deleteReview,
  markHelpful,
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

// Protected routes (user only)
router.use(protect);

router.get('/pending', getPendingReviews);
router.get('/my-reviews', getMyReviews);
router.post('/', createReview);
router.put('/:id', updateReview);
router.delete('/:id', deleteReview);
router.post('/:id/helpful', markHelpful);
router.post('/:id/report', reportReview);

// Admin/Manager routes
router.get('/admin/all', adminOrManager, getAllReviews);
router.put('/admin/:id/remove', adminOrManager, adminRemoveReview);
router.put('/admin/:id/restore', adminOrManager, adminRestoreReview);
router.delete('/admin/:id', adminOrManager, adminDeleteReview);
router.get('/stats', adminOrManager, getReviewStats);

export default router;