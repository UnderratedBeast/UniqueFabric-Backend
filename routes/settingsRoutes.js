import express from 'express';
import { getSettings, updateSettings } from '../controllers/settingsController.js';
import { protect, requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', getSettings);
router.put('/', protect, requireRole(['admin', 'manager']), updateSettings);

export default router;