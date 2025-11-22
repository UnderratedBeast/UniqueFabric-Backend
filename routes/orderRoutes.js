// import express from 'express';
// import {
//   createOrder,
//   getMyOrders,
//   getOrderById,
//   getOrders,
//   updateOrderStatus
// } from '../controllers/orderController.js';
// import { protect, adminOnly } from '../middlewares/authMiddleware.js';

// const router = express.Router();

// router.route('/')
//   .post(protect, createOrder)
//   .get(protect, adminOnly, getOrders);

// router.route('/my-orders')
//   .get(protect, getMyOrders);

// router.route('/:id')
//   .get(protect, getOrderById);

// router.route('/:id/status')
//   .put(protect, adminOnly, updateOrderStatus);

// export default router;

// routes/orderRoutes.js
import express from 'express';
import {
  createOrder,
  getMyOrders,
  getOrderById,
  getOrders,
  updateOrderStatus,
  getOrderStats,
  cancelOrder,
  deleteOrder
} from '../controllers/orderController.js';
import { 
  protect, 
  requireRole,
  adminOrManager,
  adminManagerOrStaff 
} from '../middlewares/authMiddleware.js';

const router = express.Router();

// Public routes (protected by auth)
router.route('/')
  .post(protect, createOrder);

router.route('/my-orders')
  .get(protect, getMyOrders);

router.route('/:id')
  .get(protect, getOrderById);

// Admin/Manager/Staff routes
router.route('/')
  .get(protect, adminManagerOrStaff, getOrders); // All staff can view orders

router.route('/stats')
  .get(protect, adminOrManager, getOrderStats); // Only admin/manager can see stats

router.route('/:id/status')
  .put(protect, adminManagerOrStaff, updateOrderStatus); // All staff can update status

router.route('/:id/cancel')
  .put(protect, cancelOrder); // Users can cancel their own orders

router.route('/:id')
  .delete(protect, requireRole(['admin']), deleteOrder); // Only admin can delete

export default router;