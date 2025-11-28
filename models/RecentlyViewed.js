import mongoose from 'mongoose';

const recentlyViewedItemSchema = new mongoose.Schema({
  productId: {
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
  image: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  viewedAt: {
    type: Date,
    default: Date.now
  }
});

const recentlyViewedSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  items: [recentlyViewedItemSchema]
}, {
  timestamps: true
});

// Create index for faster queries
recentlyViewedSchema.index({ user: 1 });

export default mongoose.model('RecentlyViewed', recentlyViewedSchema);