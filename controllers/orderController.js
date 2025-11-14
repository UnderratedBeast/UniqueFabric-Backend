// #############################

import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Product from '../models/Product.js';

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
export const createOrder = async (req, res) => {
  try {
    const {
      orderItems,
      shippingAddress,
      paymentMethod,
      itemsPrice,
      taxPrice,
      shippingPrice,
      totalPrice,
      orderNotes,
    } = req.body;

    console.log('Received order data:', req.body);

    // 1. Basic required fields validation
    if (!orderItems || orderItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No order items provided',
      });
    }

    if (!shippingAddress || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Shipping address and payment method are required',
      });
    }

    // 2. Shipping address validation
    const requiredFields = ['fullName', 'address', 'city', 'state', 'zipCode', 'email'];
    for (const field of requiredFields) {
      if (!shippingAddress[field]?.trim()) {
        return res.status(400).json({
          success: false,
          message: `${field.charAt(0).toUpperCase() + field.slice(1)} is required`,
        });
      }
    }

    // 3. Validate products and check stock (using 'stock' field consistently)
    const stockUpdates = [];

    for (const item of orderItems) {
      if (!item.product || !item.quantity || !item.price) {
        return res.status(400).json({
          success: false,
          message: 'Each item must include product ID, quantity, and price',
        });
      }

      const product = await Product.findById(item.product).select('name stock price image');
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product not found: ${item.product}`,
        });
      }

      const orderedQty = Number(item.quantity);
      const availableStock = Number(product.stock) || 0;

      if (availableStock < orderedQty) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${product.name}". Available: ${availableStock}, Requested: ${orderedQty}`,
        });
      }

      stockUpdates.push({ product, orderedQty });
    }

    // 4. Generate unique order number
    const orderCount = await Order.countDocuments();
    const orderNumber = `ORD-${Date.now()}-${String(orderCount + 1).padStart(6, '0')}`;

    // 5. Create the order
    const order = new Order({
      user: req.user._id,
      orderItems: orderItems.map((item) => ({
        product: item.product,
        name: item.name || '', // optional fallback
        quantity: Number(item.quantity),
        price: Number(item.price),
        image: item.image || '',
      })),
      shippingAddress: {
        fullName: shippingAddress.fullName.trim(),
        address: shippingAddress.address.trim(),
        city: shippingAddress.city.trim(),
        state: shippingAddress.state.trim(),
        zipCode: shippingAddress.zipCode.trim(),
        email: shippingAddress.email.trim(),
        phone: shippingAddress.phone?.trim() || '',
      },
      paymentMethod,
      itemsPrice: Number(itemsPrice) || 0,
      taxPrice: Number(taxPrice) || 0,
      shippingPrice: Number(shippingPrice) || 0,
      totalPrice: Number(totalPrice) || 0,
      orderNotes: orderNotes?.trim() || '',
      orderNumber,
    });

    // 6. Deduct stock from products (bulk operation style for better performance)
    for (const { product, orderedQty } of stockUpdates) {
      product.stock = Math.max(0, Number(product.stock) - orderedQty);
      await product.save();
      console.log(`Stock updated: ${product.name} → ${product.stock} remaining`);
    }

    // 7. Save order
    const createdOrder = await order.save();

    // 8. Populate and return full order details
    const populatedOrder = await Order.findById(createdOrder._id)
      .populate('user', 'name email')
      .populate('orderItems.product', 'name image price category stock');

    res.status(201).json({
      success: true,
      order: populatedOrder,
      message: 'Order created successfully',
    });
  } catch (error) {
    console.error('Create order error:', error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Order number conflict. Please try again.',
      });
    }

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error creating order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// ==================== OTHER CONTROLLERS (UNCHANGED BUT CLEANED) ====================

// Get my orders
export const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate('user', 'name email')
      .populate('orderItems.product', 'name image price category');

    res.json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    console.error('Get my orders error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get order by ID
export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email')
      .populate('orderItems.product', 'name image price category');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.user._id.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    res.json({ success: true, order });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(error.name === 'CastError' ? 400 : 500).json({
      success: false,
      message: error.name === 'CastError' ? 'Invalid order ID' : 'Server error',
    });
  }
};

// Admin: Get all orders
export const getOrders = async (req, res) => {
  try {
    const orders = await Order.find({})
      .sort({ createdAt: -1 })
      .populate('user', 'name email')
      .populate('orderItems.product', 'name image price');

    res.json({ success: true, count: orders.length, orders });
  } catch (error) {
    console.error('Get all orders error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Admin: Update order status
export const updateOrderStatus = async (req, res) => {
  try {
    const { status, trackingNumber, note } = req.body;
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Valid status required' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    order.status = status;
    if (trackingNumber) order.trackingNumber = trackingNumber.trim();

    order.statusHistory.push({
      status,
      date: new Date(),
      note: note?.trim() || `Status updated to ${status}`,
    });

    const updatedOrder = await order.save();

    const populated = await Order.findById(updatedOrder._id)
      .populate('user', 'name email')
      .populate('orderItems.product', 'name image price');

    res.json({ success: true, order: populated, message: 'Status updated' });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(error.name === 'CastError' ? 400 : 500).json({
      success: false,
      message: error.name === 'CastError' ? 'Invalid ID' : 'Server error',
    });
  }
};

// Cancel order (user or admin)
export const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    // Auth check
    if (order.user.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (!['pending', 'processing'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel order in "${order.status}" status`,
      });
    }

    // Restore stock
    for (const item of order.orderItems) {
      await Product.updateOne(
        { _id: item.product },
        { $inc: { stock: item.quantity } }
      );
    }

    order.status = 'cancelled';
    order.statusHistory.push({
      status: 'cancelled',
      date: new Date(),
      note: req.user.isAdmin ? 'Cancelled by admin' : 'Cancelled by customer',
    });

    await order.save();

    res.json({ success: true, message: 'Order cancelled and stock restored' });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Admin: Delete order (restore stock if needed)
export const deleteOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    // Restore stock if not already cancelled
    if (order.status !== 'cancelled') {
      for (const item of order.orderItems) {
        await Product.updateOne(
          { _id: item.product },
          { $inc: { stock: item.quantity } }
        );
      }
    }

    await Order.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Delete order error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Admin: Order statistics
export const getOrderStats = async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();

    const statusCounts = await Order.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const statusMap = { pending: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0 };
    statusCounts.forEach((s) => {
      if (statusMap.hasOwnProperty(s._id)) statusMap[s._id] = s.count;
    });

    const revenueResult = await Order.aggregate([
      { $match: { status: { $nin: ['cancelled', 'pending'] } } },
      { $group: { _id: null, totalRevenue: { $sum: '$totalPrice' } } },
    ]);

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentOrders = await Order.countDocuments({ createdAt: { $gte: sevenDaysAgo } });

    res.json({
      success: true,
      stats: {
        totalOrders,
        ...statusMap,
        totalRevenue: Number((revenueResult[0]?.totalRevenue || 0).toFixed(2)),
        recentOrders,
      },
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};