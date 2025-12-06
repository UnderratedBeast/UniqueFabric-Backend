import mongoose from 'mongoose';
import Review from '../models/Review.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';

// @desc    Create a new review (auto-publish)
// @route   POST /api/reviews
// @access  Private
export const createReview = async (req, res) => {
  // We'll handle this without transaction to avoid write conflicts
  // or use retry logic for transient errors
  const maxRetries = 3;
  let retryCount = 0;

  const attemptCreateReview = async () => {
    try {
      const { productId, orderId, rating, title, comment, isAnonymous = false } = req.body;

      // Validate required fields
      if (!productId || !orderId || !rating) {
        return {
          status: 400,
          data: {
            success: false,
            message: 'Product ID, Order ID, and rating are required'
          }
        };
      }

      // Validate rating
      if (rating < 1 || rating > 5) {
        return {
          status: 400,
          data: {
            success: false,
            message: 'Rating must be between 1 and 5'
          }
        };
      }

      // Check if product exists
      const product = await Product.findById(productId);
      if (!product) {
        return {
          status: 404,
          data: {
            success: false,
            message: 'Product not found'
          }
        };
      }

      // Check if order exists and belongs to user
      const order = await Order.findOne({
        _id: orderId,
        user: req.user._id
      });

      if (!order) {
        return {
          status: 404,
          data: {
            success: false,
            message: 'Order not found or does not belong to you'
          }
        };
      }

      // Check if product is in the order
      const orderItem = order.orderItems.find(item => 
        item.product && item.product.toString() === productId
      );

      if (!orderItem) {
        return {
          status: 400,
          data: {
            success: false,
            message: 'This product was not in your order'
          }
        };
      }

      // Check if order is eligible for review (delivered or shipped)
      if (!['delivered', 'shipped'].includes(order.status)) {
        return {
          status: 400,
          data: {
            success: false,
            message: 'You can only review products from delivered or shipped orders'
          }
        };
      }

      // Check if review already exists for this product in this order
      const existingReview = await Review.findOne({
        user: req.user._id,
        product: productId,
        order: orderId
      });

      if (existingReview) {
        return {
          status: 400,
          data: {
            success: false,
            message: 'You have already reviewed this product from this order'
          }
        };
      }

      // Create review (auto-publishes)
      const reviewData = {
        user: req.user._id,
        product: productId,
        order: orderId,
        rating,
        title: title?.trim() || '',
        comment: comment?.trim() || '',
        isAnonymous
      };

      const review = new Review(reviewData);
      await review.save();

      // Update order item as reviewed - using findByIdAndUpdate instead of findOneAndUpdate
      // to avoid potential write conflicts
      const orderDoc = await Order.findById(orderId);
      if (orderDoc) {
        const itemIndex = orderDoc.orderItems.findIndex(
          item => item.product && item.product.toString() === productId
        );
        
        if (itemIndex !== -1) {
          orderDoc.orderItems[itemIndex].reviewed = true;
          orderDoc.orderItems[itemIndex].reviewedAt = new Date();
          await orderDoc.save();
        }
      }

      // Update product rating stats
      const stats = await Review.getProductAverageRating(productId);
      await Product.findByIdAndUpdate(productId, {
        rating: stats.averageRating,
        reviews: stats.totalReviews
      });

      // Populate and return the review
      const populatedReview = await Review.findById(review._id)
        .populate('product', 'name images price')
        .populate('order', 'orderNumber');

      return {
        status: 201,
        data: {
          success: true,
          message: 'Review published successfully!',
          review: populatedReview
        }
      };

    } catch (error) {
      console.error('Create review error (attempt ' + (retryCount + 1) + '):', error);

      // Check if this is a transient error that can be retried
      if (error.code === 112 && retryCount < maxRetries) { // WriteConflict code
        retryCount++;
        console.log(`Retrying due to write conflict (attempt ${retryCount}/${maxRetries})`);
        
        // Wait for a short random time before retrying
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
        return attemptCreateReview();
      }

      throw error;
    }
  };

  try {
    const result = await attemptCreateReview();
    return res.status(result.status).json(result.data);
  } catch (error) {
    console.error('Final create review error:', error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this product from this order'
      });
    }

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    // Handle write conflict specifically
    if (error.code === 112 || error.codeName === 'WriteConflict') {
      return res.status(409).json({
        success: false,
        message: 'Please try submitting your review again. There was a temporary conflict with the database.'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error creating review'
    });
  }
};

// @desc    Get user's pending reviews (products that can be reviewed)
// @route   GET /api/reviews/pending
// @access  Private
export const getPendingReviews = async (req, res) => {
  try {
    const pendingReviews = await Review.getUserPendingReviews(req.user._id);

    res.json({
      success: true,
      count: pendingReviews.length,
      pendingReviews
    });

  } catch (error) {
    console.error('Get pending reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching pending reviews'
    });
  }
};

// @desc    Get user's submitted reviews
// @route   GET /api/reviews/my-reviews
// @access  Private
export const getMyReviews = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const result = await Review.getUserReviews(req.user._id, page, limit);

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('Get my reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching your reviews'
    });
  }
};

// @desc    Get product reviews (auto-published only)
// @route   GET /api/reviews/product/:productId
// @access  Public
export const getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const rating = req.query.rating;
    const sortBy = req.query.sortBy || 'helpful'; // helpful, recent, highest, lowest
    const verified = req.query.verified;

    // Validate product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Build filters
    const filters = {};
    if (rating) filters.rating = parseInt(rating);
    if (verified) filters.verifiedPurchase = verified === 'true';

    // Get reviews
    const result = await Review.getProductReviews(productId, page, limit, filters);

    // Apply sort
    let reviews = result.reviews;
    switch (sortBy) {
      case 'recent':
        reviews.sort((a, b) => b.createdAt - a.createdAt);
        break;
      case 'highest':
        reviews.sort((a, b) => b.rating - a.rating || b.createdAt - a.createdAt);
        break;
      case 'lowest':
        reviews.sort((a, b) => a.rating - b.rating || b.createdAt - a.createdAt);
        break;
      case 'helpful':
      default:
        reviews.sort((a, b) => b.helpfulCount - a.helpfulCount);
    }

    // Get rating distribution
    const stats = await Review.getProductAverageRating(productId);
    res.json({
      success: true,
      reviews,
      summary: {
        averageRating: stats.averageRating,
        totalReviews: stats.totalReviews,
        distribution: stats.distribution,
        verifiedPurchaseCount: await Review.countDocuments({
          product: productId,
          status: 'published',
          verifiedPurchase: true
        })
      },
      pagination: {
        total: result.total,
        pages: result.pages,
        currentPage: page,
        limit
      }
    });

  } catch (error) {
    console.error('Get product reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching product reviews'
    });
  }
};

// @desc    Update a review
// @route   PUT /api/reviews/:id
// @access  Private
export const updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, title, comment, isAnonymous } = req.body;

    const review = await Review.findById(id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check ownership
    if (review.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this review'
      });
    }

    // Check if review is removed
    if (review.status === 'removed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update a removed review'
      });
    }

    // Update fields
    if (rating !== undefined) {
      if (rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          message: 'Rating must be between 1 and 5'
        });
      }
      review.rating = rating;
    }

    if (title !== undefined) review.title = title.trim();
    if (comment !== undefined) review.comment = comment.trim();
    if (isAnonymous !== undefined) review.isAnonymous = isAnonymous;

    await review.save();

    // Update product stats
    const stats = await Review.getProductAverageRating(review.product);
    await Product.findByIdAndUpdate(review.product, {
      rating: stats.averageRating,
      reviews: stats.totalReviews
    });

    const updatedReview = await Review.findById(id)
      .populate('product', 'name images price')
      .populate('order', 'orderNumber');

    res.json({
      success: true,
      message: 'Review updated successfully',
      review: updatedReview
    });

  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating review'
    });
  }
};

// @desc    Delete a review (soft delete for users)
// @route   DELETE /api/reviews/:id
// @access  Private
export const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;

    const review = await Review.findById(id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check ownership
    if (review.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this review'
      });
    }

    // Check if already removed
    if (review.status === 'removed') {
      return res.status(400).json({
        success: false,
        message: 'Review is already deleted'
      });
    }

    // Soft delete - mark as removed
    review.status = 'removed';
    review.removalReason = 'user_deleted';
    review.removedAt = new Date();
    
    await review.save();

    // Update product stats
    const stats = await Review.getProductAverageRating(review.product);
    await Product.findByIdAndUpdate(review.product, {
      rating: stats.averageRating,
      reviews: stats.totalReviews
    });

    res.json({
      success: true,
      message: 'Review deleted successfully'
    });

  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting review'
    });
  }
};

// @desc    Mark review as helpful
// @route   POST /api/reviews/:id/helpful
// @access  Private
export const markHelpful = async (req, res) => {
  try {
    const { id } = req.params;

    const review = await Review.findById(id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check if review is published
    if (review.status !== 'published') {
      return res.status(400).json({
        success: false,
        message: 'Cannot mark a removed or spam review as helpful'
      });
    }

    // Simple helpful count increment
    review.helpfulCount += 1;
    await review.save();

    res.json({
      success: true,
      message: 'Review marked as helpful',
      helpfulCount: review.helpfulCount
    });

  } catch (error) {
    console.error('Mark helpful error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error marking review as helpful'
    });
  }
};

// @desc    Report a review (auto-removal for spam)
// @route   POST /api/reviews/:id/report
// @access  Private
export const reportReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, details } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Reason is required for reporting'
      });
    }

    const review = await Review.findById(id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Prevent self-reporting
    if (review.user.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot report your own review'
      });
    }

    // Check if already removed
    if (review.status === 'removed' || review.status === 'spam') {
      return res.status(400).json({
        success: false,
        message: 'This review has already been reported or removed'
      });
    }

    // Auto-remove if marked as spam
    review.status = 'spam';
    review.removalReason = reason;
    review.removedBy = req.user._id;
    review.removedAt = new Date();

    await review.save();

    // Update product stats
    const stats = await Review.getProductAverageRating(review.product);
    await Product.findByIdAndUpdate(review.product, {
      rating: stats.averageRating,
      reviews: stats.totalReviews
    });

    res.json({
      success: true,
      message: 'Review reported and removed. Thank you for helping maintain community standards.'
    });

  } catch (error) {
    console.error('Report review error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error reporting review'
    });
  }
};

// @desc    Admin: Get all reviews for management
// @route   GET /api/reviews/admin/all
// @access  Private/Admin
export const getAllReviews = async (req, res) => {
  try {
    if (!req.user.isAdmin && !['admin', 'manager'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status;
    const productId = req.query.productId;
    const userId = req.query.userId;

    const filters = {};
    if (status) filters.status = status;
    if (productId) filters.product = productId;
    if (userId) filters.user = userId;

    const result = await Review.getAllReviews(page, limit, filters);

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('Get all reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching reviews'
    });
  }
};

// @desc    Admin: Remove a review
// @route   PUT /api/reviews/admin/:id/remove
// @access  Private/Admin
export const adminRemoveReview = async (req, res) => {
  try {
    if (!req.user.isAdmin && !['admin', 'manager'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Removal reason is required'
      });
    }

    const review = await Review.findById(id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check if already removed
    if (review.status === 'removed') {
      return res.status(400).json({
        success: false,
        message: 'Review is already removed'
      });
    }

    // Update review status
    review.status = 'removed';
    review.removalReason = reason;
    review.removedBy = req.user._id;
    review.removedAt = new Date();

    await review.save();

    // Update product stats
    const stats = await Review.getProductAverageRating(review.product);
    await Product.findByIdAndUpdate(review.product, {
      rating: stats.averageRating,
      reviews: stats.totalReviews
    });

    res.json({
      success: true,
      message: 'Review removed successfully'
    });

  } catch (error) {
    console.error('Admin remove review error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error removing review'
    });
  }
};

// @desc    Admin: Restore a removed review
// @route   PUT /api/reviews/admin/:id/restore
// @access  Private/Admin
export const adminRestoreReview = async (req, res) => {
  try {
    if (!req.user.isAdmin && !['admin', 'manager'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    const { id } = req.params;

    const review = await Review.findById(id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    if (review.status !== 'removed') {
      return res.status(400).json({
        success: false,
        message: 'Review is not removed'
      });
    }

    // Restore review
    review.status = 'published';
    review.removalReason = null;
    review.removedBy = null;
    review.removedAt = null;

    await review.save();

    // Update product stats
    const stats = await Review.getProductAverageRating(review.product);
    await Product.findByIdAndUpdate(review.product, {
      rating: stats.averageRating,
      reviews: stats.totalReviews
    });

    res.json({
      success: true,
      message: 'Review restored successfully'
    });

  } catch (error) {
    console.error('Admin restore review error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error restoring review'
    });
  }
};

// @desc    Admin: Delete review permanently
// @route   DELETE /api/reviews/admin/:id
// @access  Private/Admin
export const adminDeleteReview = async (req, res) => {
  try {
    if (!req.user.isAdmin && !['admin', 'manager'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    const { id } = req.params;

    const review = await Review.findById(id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    const productId = review.product;

    // Delete the review permanently
    await Review.findByIdAndDelete(id);

    // Update product stats
    const stats = await Review.getProductAverageRating(productId);
    await Product.findByIdAndUpdate(productId, {
      rating: stats.averageRating,
      reviews: stats.totalReviews
    });

    res.json({
      success: true,
      message: 'Review permanently deleted'
    });

  } catch (error) {
    console.error('Admin delete review error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting review'
    });
  }
};

// @desc    Get review statistics
// @route   GET /api/reviews/stats
// @access  Private/Admin
export const getReviewStats = async (req, res) => {
  try {
    if (!req.user.isAdmin && !['admin', 'manager'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    const totalReviews = await Review.countDocuments();
    
    const statusStats = await Review.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const ratingStats = await Review.aggregate([
      {
        $group: {
          _id: '$rating',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    const recentReviews = await Review.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    });

    const avgRatingResult = await Review.aggregate([
      {
        $match: {
          status: 'published'
        }
      },
      {
        $group: {
          _id: null,
          average: { $avg: '$rating' }
        }
      }
    ]);

    const averageRating = avgRatingResult.length > 0 ? 
      Math.round(avgRatingResult[0].average * 10) / 10 : 0;

    res.json({
      success: true,
      stats: {
        totalReviews,
        statusStats,
        ratingStats,
        recentReviews,
        averageRating,
        verifiedPurchaseCount: await Review.countDocuments({ 
          status: 'published',
          verifiedPurchase: true 
        })
      }
    });

  } catch (error) {
    console.error('Get review stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching review statistics'
    });
  }
};