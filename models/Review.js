import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  title: {
    type: String,
    trim: true,
    maxlength: 100
  },
  comment: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  helpfulCount: {
    type: Number,
    default: 0
  },
  helpfulUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  verifiedPurchase: {
    type: Boolean,
    default: false
  },
  isAnonymous: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['published', 'removed', 'spam'],
    default: 'published' // Auto-publish by default
  },
  removalReason: {
    type: String,
    enum: ['inappropriate', 'spam', 'offensive', 'fake', 'other'],
    default: null
  },
  removedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  removedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Compound index to ensure one review per user per product per order
reviewSchema.index({ user: 1, product: 1, order: 1 }, { unique: true });

// Index for faster queries
reviewSchema.index({ product: 1, status: 1, createdAt: -1 });
reviewSchema.index({ user: 1, createdAt: -1 });
reviewSchema.index({ rating: 1, product: 1 });
reviewSchema.index({ helpfulCount: -1 }); // For sorting by helpful

// Static method to get product average rating
reviewSchema.statics.getProductAverageRating = async function(productId) {
  const result = await this.aggregate([
    {
      $match: {
        product: new mongoose.Types.ObjectId(productId), 
        status: 'published'
      }
    },
    {
      $group: {
        _id: '$product',
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 },
        ratingDistribution: {
          $push: '$rating'
        }
      }
    }
  ]);

  if (result.length > 0) {
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    result[0].ratingDistribution.forEach(rating => {
      distribution[rating]++;
    });

    return {
      averageRating: Math.round(result[0].averageRating * 10) / 10,
      totalReviews: result[0].totalReviews,
      distribution
    };
  }

  return { averageRating: 0, totalReviews: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
};

// Static method to get user's pending reviews
reviewSchema.statics.getUserPendingReviews = async function(userId) {
  const orders = await mongoose.model('Order').find({
    user: userId,
    status: { $in: ['delivered', 'shipped'] }
  })
    .populate('orderItems.product', 'name images price category')
    .sort({ createdAt: -1 });

  const pendingReviews = [];

  for (const order of orders) {
    for (const item of order.orderItems) {
      if (item.product) {
        const existingReview = await this.findOne({
          user: userId,
          product: item.product._id,
          order: order._id
        });

        if (!existingReview) {
          pendingReviews.push({
            order: {
              _id: order._id,
              orderNumber: order.orderNumber,
              createdAt: order.createdAt,
              deliveredDate: order.statusHistory.find(h => h.status === 'delivered')?.date || order.updatedAt
            },
            product: {
              _id: item.product._id,
              name: item.product.name,
              image: item.product.images?.[0] || item.product.imageUrl,
              price: item.price,
              category: item.product.category
            },
            purchaseDate: order.paidAt,
            canReview: true
          });
        }
      }
    }
  }

  return pendingReviews;
};

// Static method to get user's submitted reviews
reviewSchema.statics.getUserReviews = async function(userId, page = 1, limit = 10) {
  const skip = (page - 1) * limit;

  const reviews = await this.find({ 
    user: userId,
    status: { $ne: 'removed' } // Don't show removed reviews to user
  })
    .populate('product', 'name images price category')
    .populate('order', 'orderNumber')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await this.countDocuments({ 
    user: userId,
    status: { $ne: 'removed' }
  });

  return {
    reviews,
    total,
    pages: Math.ceil(total / limit),
    currentPage: page
  };
};

// Static method to get product reviews with helpful status for current user
reviewSchema.statics.getProductReviews = async function(productId, userId = null, page = 1, limit = 10, filters = {}) {
  const skip = (page - 1) * limit;
  
  let query = { 
    product: productId, 
    status: 'published' // Only show published reviews
  };
  
  // Apply filters
  if (filters.rating) {
    query.rating = parseInt(filters.rating);
  }
  
  if (filters.verifiedPurchase) {
    query.verifiedPurchase = filters.verifiedPurchase === 'true';
  }

  // Build sort query
  let sortQuery = {};
  if (filters.sortBy === 'recent') {
    sortQuery.createdAt = -1;
  } else if (filters.sortBy === 'highest') {
    sortQuery.rating = -1;
    sortQuery.createdAt = -1;
  } else if (filters.sortBy === 'lowest') {
    sortQuery.rating = 1;
    sortQuery.createdAt = -1;
  } else {
    // Default: most helpful
    sortQuery.helpfulCount = -1;
    sortQuery.createdAt = -1;
  }

  const reviews = await this.find(query)
    .populate('user', 'name')
    .sort(sortQuery)
    .skip(skip)
    .limit(limit);

  // Add helpful status for current user
  const reviewsWithStatus = reviews.map(review => {
    const reviewObj = review.toObject();
    if (userId) {
      reviewObj.userHasMarkedHelpful = review.helpfulUsers.some(
        id => id.toString() === userId.toString()
      );
    } else {
      reviewObj.userHasMarkedHelpful = false;
    }
    return reviewObj;
  });

  const total = await this.countDocuments(query);

  return {
    reviews: reviewsWithStatus,
    total,
    pages: Math.ceil(total / limit),
    currentPage: page
  };
};

// Static method for admin: get all reviews including removed ones
reviewSchema.statics.getAllReviews = async function(page = 1, limit = 20, filters = {}) {
  const skip = (page - 1) * limit;
  
  let query = {};
  
  if (filters.status) {
    query.status = filters.status;
  }
  
  if (filters.productId) {
    query.product = filters.productId;
  }
  
  if (filters.userId) {
    query.user = filters.userId;
  }

  const reviews = await this.find(query)
    .populate('user', 'name email')
    .populate('product', 'name images')
    .populate('order', 'orderNumber')
    .populate('removedBy', 'name')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await this.countDocuments(query);

  return {
    reviews,
    total,
    pages: Math.ceil(total / limit),
    currentPage: page
  };
};

// Instance method to toggle helpful status
reviewSchema.methods.toggleHelpful = async function(userId) {
  const userIndex = this.helpfulUsers.findIndex(
    id => id.toString() === userId.toString()
  );
  
  if (userIndex === -1) {
    // User hasn't marked as helpful - add them
    this.helpfulUsers.push(userId);
    this.helpfulCount += 1;
  } else {
    // User has already marked - remove them
    this.helpfulUsers.splice(userIndex, 1);
    this.helpfulCount = Math.max(0, this.helpfulCount - 1);
  }
  
  await this.save();
  return {
    helpfulCount: this.helpfulCount,
    userHasMarkedHelpful: userIndex === -1 // true if user just marked, false if unmarked
  };
};

// Instance method to check if user has marked as helpful
reviewSchema.methods.hasUserMarkedHelpful = function(userId) {
  if (!userId) return false;
  return this.helpfulUsers.some(
    id => id.toString() === userId.toString()
  );
};

// Static method to get user's helpful votes
reviewSchema.statics.getUserHelpfulVotes = async function(userId) {
  const reviews = await this.find({
    helpfulUsers: userId
  }).select('_id product');
  
  return reviews.reduce((acc, review) => {
    acc[review._id] = true;
    return acc;
  }, {});
};

// Pre-save middleware to set verifiedPurchase
reviewSchema.pre('save', async function(next) {
  if (this.isNew) {
    // Check if the user has purchased this product
    const Order = mongoose.model('Order');
    const hasPurchased = await Order.exists({
      user: this.user,
      'orderItems.product': this.product,
      status: { $in: ['delivered', 'shipped'] }
    });
    
    this.verifiedPurchase = !!hasPurchased;
    
    // Auto-publish - no moderation needed
    this.status = 'published';
  }
  next();
});

// Update product's review stats after saving a review
reviewSchema.post('save', async function(doc) {
  if (doc.status === 'published') {
    const Review = mongoose.model('Review');
    const Product = mongoose.model('Product');
    
    const stats = await Review.getProductAverageRating(doc.product.toString());
    await Product.findByIdAndUpdate(doc.product, {
      rating: stats.averageRating,
      reviews: stats.totalReviews
    });
  }
});

// Update product's review stats after removing a review
reviewSchema.post('findOneAndUpdate', async function(doc) {
  if (doc && doc.status === 'removed') {
    const Review = mongoose.model('Review');
    const Product = mongoose.model('Product');
    
    const stats = await Review.getProductAverageRating(doc.product.toString());
    await Product.findByIdAndUpdate(doc.product, {
      rating: stats.averageRating,
      reviews: stats.totalReviews
    });
  }
});

// Update product's review stats after deleting a review
reviewSchema.post('findOneAndDelete', async function(doc) {
  if (doc) {
    const Review = mongoose.model('Review');
    const Product = mongoose.model('Product');
    
    const stats = await Review.getProductAverageRating(doc.product.toString());
    await Product.findByIdAndUpdate(doc.product, {
      rating: stats.averageRating,
      reviews: stats.totalReviews
    });
  }
});

const Review = mongoose.model('Review', reviewSchema);

export default Review;