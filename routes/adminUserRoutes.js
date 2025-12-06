import express from 'express';
import { protect, requireRole } from '../middlewares/authMiddleware.js';
import User from '../models/User.js';

const router = express.Router();

// Get all admin users (excluding customers)
router.get('/', protect, requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const users = await User.find({ 
      role: { $in: ['admin', 'manager', 'staff'] } 
    }).select('-password');
    
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching users' });
  }
});

// Create admin user
router.post('/', protect, requireRole(['admin']), async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }
    
    const user = await User.create({
      name,
      email,
      password,
      role: role || 'staff'
    });
    
    res.status(201).json({ 
      success: true, 
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: 'Active'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error creating user' });
  }
});

// Update user status/role
router.put('/:id', protect, requireRole(['admin']), async (req, res) => {
  try {
    const { status, role } = req.body;
    const updates = {};
    
    if (status) updates.status = status;
    if (role) updates.role = role;
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true }
    ).select('-password');
    
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating user' });
  }
});

// Delete user
router.delete('/:id', protect, requireRole(['admin']), async (req, res) => {
  try {
    // Prevent deleting yourself
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot delete your own account' });
    }
    
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting user' });
  }
});

export default router;