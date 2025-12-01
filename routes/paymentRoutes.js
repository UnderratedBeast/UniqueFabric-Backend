import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import {
  getPaymentMethods,
  getPaymentMethodById,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  setDefaultPaymentMethod,
  getDefaultPaymentMethod,
  getPaymentLimits  // Add this import
} from '../controllers/paymentController.js';

const router = express.Router();

router.route('/')
  .get(protect, getPaymentMethods)
  .post(protect, createPaymentMethod);

router.route('/limits')
  .get(protect, getPaymentLimits);  // Add this route

router.route('/default')
  .get(protect, getDefaultPaymentMethod);

router.route('/:id')
  .get(protect, getPaymentMethodById)
  .put(protect, updatePaymentMethod)
  .delete(protect, deletePaymentMethod);

router.route('/:id/default')
  .put(protect, setDefaultPaymentMethod);

export default router;