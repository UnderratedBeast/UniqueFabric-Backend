import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true,
    unique: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  orderItems: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    name: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true
    },
    quantity: {
      type: Number,
      required: true
    },
    image: {
      type: String,
      required: false
    }
  }],
  shippingAddress: {
    fullName: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: false
    },
    address: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    state: {
      type: String,
      required: true
    },
    zipCode: {
      type: String,
      required: true
    },
    country: {
      type: String,
      required: true,
      default: 'United States'
    }
  },
  paymentMethod: {
    type: String,
    required: true,
    default: 'card'
  },
  // Reference to saved payment method if used
  paymentMethodId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PaymentMethod',
    required: false
  },
  // Reference to saved address if used
  shippingAddressId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Address',
    required: false
  },
  itemsPrice: {
    type: Number,
    required: true,
    default: 0.0
  },
  taxPrice: {
    type: Number,
    required: true,
    default: 0.0
  },
  shippingPrice: {
    type: Number,
    required: true,
    default: 0.0
  },
  totalPrice: {
    type: Number,
    required: true,
    default: 0.0
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  statusHistory: [{
    status: String,
    date: {
      type: Date,
      default: Date.now
    },
    note: String
  }],
  trackingNumber: String,
  estimatedDelivery: Date,
  orderNotes: String,
  paidAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Generate order number before saving
orderSchema.pre('save', async function(next) {
  if (this.isNew && !this.orderNumber) {
    try {
      // Get the count of existing orders
      const OrderModel = mongoose.model('Order');
      const count = await OrderModel.countDocuments();
      
      // Generate unique order number
      this.orderNumber = `ORD-${Date.now()}-${String(count + 1).padStart(6, '0')}`;
      
      // Add initial status to history
      this.statusHistory = [{
        status: this.status,
        date: new Date(),
        note: 'Order created'
      }];
      
      // Set paidAt if not already set
      if (!this.paidAt) {
        this.paidAt = new Date();
      }
      
      next();
    } catch (error) {
      console.error('Error generating order number:', error);
      // Fallback order number
      this.orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      next();
    }
  } else {
    next();
  }
});

// Virtual for formatted order date
orderSchema.virtual('formattedDate').get(function() {
  return this.createdAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

// Virtual for order total with currency
orderSchema.virtual('totalWithCurrency').get(function() {
  return `$${this.totalPrice.toFixed(2)}`;
});

// Static method to get orders by user
orderSchema.statics.getUserOrders = async function(userId) {
  return await this.find({ user: userId })
    .sort({ createdAt: -1 })
    .populate('paymentMethodId', 'lastFour cardType cardHolder')
    .populate('shippingAddressId', 'fullName street city state zipCode phone');
};

// Static method to get order statistics
orderSchema.statics.getUserStats = async function(userId) {
  const stats = await this.aggregate([
    { $match: { user: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalSpent: { $sum: '$totalPrice' },
        averageOrderValue: { $avg: '$totalPrice' }
      }
    }
  ]);
  
  return stats[0] || { totalOrders: 0, totalSpent: 0, averageOrderValue: 0 };
};

export default mongoose.model('Order', orderSchema);