import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import PaymentMethod from '../models/PaymentMethod.js';
import Address from '../models/Address.js';

// Helper function for card type detection
const detectCardType = (number) => {
  const cleaned = number.replace(/\D/g, '');
  if (/^4/.test(cleaned)) return 'visa';
  if (/^5[1-5]/.test(cleaned) || /^2[2-7][2-9]/.test(cleaned)) return 'mastercard';
  if (/^3[47]/.test(cleaned)) return 'amex';
  if (/^6011/.test(cleaned) || /^622[1-9]/.test(cleaned) || /^64[4-9]/.test(cleaned) || /^65/.test(cleaned)) return 'discover';
  return 'unknown';
};

// Helper function for expiry date validation
const isValidExpiryDate = (month, year) => {
  if (!/^(0[1-9]|1[0-2])$/.test(month)) {
    return { isValid: false, message: 'Month must be between 01 and 12' };
  }

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  
  let expiryYear = parseInt(year);
  
  if (year.length === 2) {
    expiryYear = 2000 + expiryYear;
  }
  
  const expiryMonth = parseInt(month);
  
  if (expiryYear < currentYear) {
    return { isValid: false, message: 'Card has expired' };
  }
  
  if (expiryYear === currentYear && expiryMonth < currentMonth) {
    return { isValid: false, message: 'Card has expired' };
  }
  
  if (expiryYear > currentYear + 20) {
    return { isValid: false, message: 'Expiry date too far in the future' };
  }
  
  return { isValid: true };
};

// @desc    Create new order with optional address/payment saving
// @route   POST /api/orders
// @access  Private
export const createOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      orderItems,
      shippingAddress,
      paymentMethod,
      paymentDetails,
      savePaymentMethod = false,
      saveShippingAddress = true,
      itemsPrice,
      taxPrice,
      shippingPrice,
      totalPrice,
      orderNotes,
    } = req.body;

    console.log('Received order data:', { 
      orderItemsLength: orderItems?.length,
      paymentMethod,
      savePaymentMethod,
      saveShippingAddress
    });

    // 1. Basic required fields validation
    if (!orderItems || orderItems.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'No order items provided',
      });
    }

    if (!shippingAddress || !paymentMethod) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Shipping address and payment method are required',
      });
    }

    // 2. Shipping address validation
    const requiredFields = ['fullName', 'address', 'city', 'state', 'zipCode', 'email'];
    for (const field of requiredFields) {
      if (!shippingAddress[field]?.trim()) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: `${field.charAt(0).toUpperCase() + field.slice(1)} is required`,
        });
      }
    }

    // 3. Validate products and check stock
    const stockUpdates = [];

    for (const item of orderItems) {
      if (!item.product || !item.quantity || !item.price) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: 'Each item must include product ID, quantity, and price',
        });
      }

      const product = await Product.findById(item.product).select('name stock price image').session(session);
      if (!product) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({
          success: false,
          message: `Product not found: ${item.product}`,
        });
      }

      const orderedQty = Number(item.quantity);
      const availableStock = Number(product.stock) || 0;

      if (availableStock < orderedQty) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${product.name}". Available: ${availableStock}, Requested: ${orderedQty}`,
        });
      }

      stockUpdates.push({ product, orderedQty });
    }

    // 4. Handle payment method
    let savedPaymentMethodId = null;
    
    if (paymentDetails?.paymentMethodId) {
      // Using existing saved payment method
      const savedPayment = await PaymentMethod.findOne({
        _id: paymentDetails.paymentMethodId,
        user: req.user._id
      }).session(session);
      
      if (!savedPayment) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({
          success: false,
          message: 'Saved payment method not found',
        });
      }
      
      savedPaymentMethodId = savedPayment._id;
    } else if (savePaymentMethod && paymentDetails) {
      // Save new payment method
      const { cardNumber, expiryDate, cvv, nameOnCard } = paymentDetails;
      
      // Validate required payment fields
      if (!cardNumber || !expiryDate || !cvv || !nameOnCard) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: 'All payment details are required to save card',
        });
      }

      // Check payment method limit
      const paymentCount = await PaymentMethod.countDocuments({ user: req.user._id }).session(session);
      if (paymentCount >= 5) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: 'Payment method limit reached. Maximum 5 saved cards.',
        });
      }

      // Parse and validate expiry date
      const [expiryMonth, expiryYear] = expiryDate.split('/');
      if (!expiryMonth || !expiryYear) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid expiry date format (use MM/YY)' 
        });
      }

      const expiryValidation = isValidExpiryDate(expiryMonth, expiryYear);
      if (!expiryValidation.isValid) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ 
          success: false, 
          message: expiryValidation.message 
        });
      }

      // Validate card number
      const cleanedCardNumber = cardNumber.replace(/\D/g, '');
      if (cleanedCardNumber.length < 13 || cleanedCardNumber.length > 19) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid card number length' 
        });
      }

      // Validate CVV
      const cleanedCvv = cvv.replace(/\D/g, '');
      const cardType = detectCardType(cleanedCardNumber);
      if (cardType === 'amex') {
        if (cleanedCvv.length !== 4) {
          await session.abortTransaction();
          session.endSession();
          return res.status(400).json({ 
            success: false, 
            message: 'American Express cards require a 4-digit CVV' 
          });
        }
      } else {
        if (cleanedCvv.length !== 3) {
          await session.abortTransaction();
          session.endSession();
          return res.status(400).json({ 
            success: false, 
            message: 'CVV must be 3 digits' 
          });
        }
      }

      // Validate card holder name
      if (!/^[a-zA-Z\s]+$/.test(nameOnCard.trim())) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: 'Card holder name can only contain letters and spaces'
        });
      }

      // Create payment method
      const paymentMethodData = {
        user: req.user._id,
        lastFour: cleanedCardNumber.slice(-4),
        cardHolder: nameOnCard.trim(),
        expiryMonth: expiryMonth.padStart(2, '0'),
        expiryYear: expiryYear.length === 2 ? `20${expiryYear}` : expiryYear,
        cardType: cardType,
        isDefault: paymentCount === 0, // Set as default if it's the first one
      };

      const newPaymentMethod = await PaymentMethod.create([paymentMethodData], { session });
      savedPaymentMethodId = newPaymentMethod[0]._id;
    }

    // 5. Handle shipping address saving
    let savedAddressId = null;
    
    if (saveShippingAddress) {
      // Check if address already exists
      const existingAddress = await Address.findOne({
        user: req.user._id,
        street: shippingAddress.address.trim(),
        city: shippingAddress.city.trim(),
        state: shippingAddress.state.trim(),
        zipCode: shippingAddress.zipCode.trim()
      }).session(session);

      if (!existingAddress) {
        // Create new address
        const addressData = {
          user: req.user._id,
          fullName: shippingAddress.fullName.trim(),
          phone: shippingAddress.phone?.trim() || '',
          street: shippingAddress.address.trim(),
          city: shippingAddress.city.trim(),
          state: shippingAddress.state.trim(),
          zipCode: shippingAddress.zipCode.trim(),
          country: shippingAddress.country || 'United States',
          isDefault: false, // Don't automatically make it default
          addressType: 'home'
        };

        const newAddress = await Address.create([addressData], { session });
        savedAddressId = newAddress[0]._id;
      } else {
        savedAddressId = existingAddress._id;
      }
    }

    // 6. Generate unique order number
    const orderCount = await Order.countDocuments().session(session);
    const orderNumber = `ORD-${Date.now()}-${String(orderCount + 1).padStart(6, '0')}`;

    // 7. Create the order
    const orderData = {
      user: req.user._id,
      orderItems: orderItems.map((item) => ({
        product: item.product,
        name: item.name || '',
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
        country: shippingAddress.country || 'United States',
      },
      paymentMethod,
      paymentMethodId: savedPaymentMethodId,
      shippingAddressId: savedAddressId,
      itemsPrice: Number(itemsPrice) || 0,
      taxPrice: Number(taxPrice) || 0,
      shippingPrice: Number(shippingPrice) || 0,
      totalPrice: Number(totalPrice) || 0,
      orderNotes: orderNotes?.trim() || '',
      orderNumber,
      paidAt: Date.now()
    };

    const order = new Order(orderData);
    const createdOrder = await order.save({ session });

    // 8. Update product stock
    for (const { product, orderedQty } of stockUpdates) {
      product.stock = Math.max(0, Number(product.stock) - orderedQty);
      await product.save({ session });
      console.log(`Stock updated: ${product.name} → ${product.stock} remaining`);
    }

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    // 9. Populate and return order details
    const populatedOrder = await Order.findById(createdOrder._id)
      .populate('user', 'name email')
      .populate('orderItems.product', 'name image price category stock');

    res.status(201).json({
      success: true,
      order: populatedOrder,
      savedAddressId,
      savedPaymentMethodId,
      message: 'Order created successfully',
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
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

// Get my orders
export const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate('user', 'name email')
      .populate('orderItems.product', 'name image price category')
      .populate('paymentMethodId', 'lastFour cardType cardHolder')
      .populate('shippingAddressId', 'fullName street city state zipCode');

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
      .populate('orderItems.product', 'name image price category')
      .populate('paymentMethodId', 'lastFour cardType cardHolder expiryMonth expiryYear')
      .populate('shippingAddressId', 'fullName phone street city state zipCode country');

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
      .populate('orderItems.product', 'name image price')
      .populate('paymentMethodId', 'lastFour cardType')
      .populate('shippingAddressId', 'fullName city state');

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
      .populate('orderItems.product', 'name image price')
      .populate('paymentMethodId', 'lastFour cardType')
      .populate('shippingAddressId', 'fullName city state');

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
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await Order.findById(req.params.id).session(session);
    if (!order) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Auth check
    if (order.user.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (!['pending', 'processing'].includes(order.status)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: `Cannot cancel order in "${order.status}" status`,
      });
    }

    // Restore stock
    for (const item of order.orderItems) {
      await Product.updateOne(
        { _id: item.product },
        { $inc: { stock: item.quantity } },
        { session }
      );
    }

    order.status = 'cancelled';
    order.statusHistory.push({
      status: 'cancelled',
      date: new Date(),
      note: req.user.isAdmin ? 'Cancelled by admin' : 'Cancelled by customer',
    });

    await order.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.json({ success: true, message: 'Order cancelled and stock restored' });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Cancel order error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Admin: Delete order (restore stock if needed)
export const deleteOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await Order.findById(req.params.id).session(session);
    if (!order) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Restore stock if not already cancelled
    if (order.status !== 'cancelled') {
      for (const item of order.orderItems) {
        await Product.updateOne(
          { _id: item.product },
          { $inc: { stock: item.quantity } },
          { session }
        );
      }
    }

    await Order.findByIdAndDelete(req.params.id, { session });

    await session.commitTransaction();
    session.endSession();

    res.json({ success: true, message: 'Order deleted successfully' });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
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

    // Payment method statistics
    const paymentMethodStats = await Order.aggregate([
      { $group: { _id: '$paymentMethod', count: { $sum: 1 } } },
    ]);

    res.json({
      success: true,
      stats: {
        totalOrders,
        ...statusMap,
        totalRevenue: Number((revenueResult[0]?.totalRevenue || 0).toFixed(2)),
        recentOrders,
        paymentMethods: paymentMethodStats,
      },
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};