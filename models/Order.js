// // models/Order.js
// import mongoose from "mongoose";

// const orderSchema = new mongoose.Schema(
//   {
//     user: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//     },
//     orderItems: [
//       {
//         name: { type: String, required: true },
//         qty: { type: Number, required: true },
//         image: { type: String, required: true },
//         price: { type: Number, required: true },
//         product: {
//           type: mongoose.Schema.Types.ObjectId,
//           ref: "Product",
//           required: true,
//         },
//       },
//     ],
//     shippingAddress: {
//       address: { type: String, required: true },
//       city: { type: String, required: true },
//       postalCode: { type: String, required: true },
//       country: { type: String, required: true },
//     },
//     paymentMethod: {
//       type: String,
//       required: true,
//     },
//     paymentResult: {
//       id: { type: String },
//       status: { type: String },
//       update_time: { type: String },
//       email_address: { type: String },
//     },
//     itemsPrice: {
//       type: Number,
//       required: true,
//       default: 0.0,
//     },
//     shippingPrice: {
//       type: Number,
//       required: true,
//       default: 0.0,
//     },
//     taxPrice: {
//       type: Number,
//       required: true,
//       default: 0.0,
//     },
//     totalPrice: {
//       type: Number,
//       required: true,
//       default: 0.0,
//     },
//     isPaid: {
//       type: Boolean,
//       required: true,
//       default: false,
//     },
//     paidAt: {
//       type: Date,
//     },
//     isDelivered: {
//       type: Boolean,
//       required: true,
//       default: false,
//     },
//     deliveredAt: {
//       type: Date,
//     },
//   },
//   { timestamps: true }
// );

// const Order = mongoose.model("Order", orderSchema);
// export default Order;


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
  orderNotes: String
}, {
  timestamps: true
});

// Generate order number before saving - FIXED VERSION
orderSchema.pre('save', async function(next) {
  if (this.isNew && !this.orderNumber) {
    try {
      // Get the count of existing orders
      const OrderModel = mongoose.model('Order');
      const count = await OrderModel.countDocuments();
      
      // Generate unique order number
      this.orderNumber = `ORD-${Date.now()}-${count + 1}`;
      
      // Add initial status to history
      this.statusHistory.push({
        status: this.status,
        date: new Date(),
        note: 'Order created'
      });
      
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

export default mongoose.model('Order', orderSchema);