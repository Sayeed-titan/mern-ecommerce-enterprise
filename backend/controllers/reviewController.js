const Review = require('../models/Review');
const Product = require('../models/Product');
const Order = require('../models/Order');
const { clearCache } = require('../config/redis');
const { emitReviewAdded } = require('../utils/socketHelper');

// @desc    Create product review
// @route   POST /api/v1/reviews
// @access  Private
exports.createReview = async (req, res) => {
  try {
    const { product, rating, comment } = req.body;

    // Check if user has purchased the product
    const hasPurchased = await Order.findOne({
      user: req.user.id,
      'orderItems.product': product,
      isPaid: true,
    });

    if (!hasPurchased) {
      return res.status(400).json({
        success: false,
        message: 'You must purchase this product before reviewing',
      });
    }

    // Check if user already reviewed
    const existingReview = await Review.findOne({
      product,
      user: req.user.id,
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this product',
      });
    }

    // Create review
    const review = await Review.create({
      product,
      user: req.user.id,
      rating,
      comment,
      isVerified: true, // Verified purchase
    });

    // Update product ratings
    await updateProductRating(product);

    // Clear cache
    await clearCache('products:*');

    // Emit real-time event
    emitReviewAdded(product, review);

    res.status(201).json({
      success: true,
      message: 'Review created successfully',
      data: review,
    });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({
      success: false,
      message: error.code === 11000 ? 'You have already reviewed this product' : 'Failed to create review',
    });
  }
};

// @desc    Get product reviews
// @route   GET /api/v1/reviews/product/:productId
// @access  Public
exports.getProductReviews = async (req, res) => {
  try {
    const { page = 1, limit = 10, rating } = req.query;

    const query = { product: req.params.productId };

    if (rating) {
      query.rating = Number(rating);
    }

    const skip = (page - 1) * limit;

    const reviews = await Review.find(query)
      .populate('user', 'name avatar')
      .sort('-createdAt')
      .limit(Number(limit))
      .skip(skip);

    const total = await Review.countDocuments(query);

    res.status(200).json({
      success: true,
      count: reviews.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page),
      data: reviews,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reviews',
    });
  }
};

// @desc    Update review
// @route   PUT /api/v1/reviews/:id
// @access  Private
exports.updateReview = async (req, res) => {
  try {
    let review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    // Check ownership
    if (review.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this review',
      });
    }

    const { rating, comment } = req.body;

    review.rating = rating || review.rating;
    review.comment = comment || review.comment;
    await review.save();

    // Update product ratings
    await updateProductRating(review.product);

    // Clear cache
    await clearCache('products:*');

    res.status(200).json({
      success: true,
      message: 'Review updated successfully',
      data: review,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update review',
    });
  }
};

// @desc    Delete review
// @route   DELETE /api/v1/reviews/:id
// @access  Private
exports.deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    // Check ownership or admin
    if (review.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this review',
      });
    }

    const productId = review.product;
    await review.deleteOne();

    // Update product ratings
    await updateProductRating(productId);

    // Clear cache
    await clearCache('products:*');

    res.status(200).json({
      success: true,
      message: 'Review deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete review',
    });
  }
};

// Helper function to update product rating
async function updateProductRating(productId) {
  try {
    const reviews = await Review.find({ product: productId });

    const product = await Product.findById(productId);

    if (reviews.length === 0) {
      product.ratings.average = 0;
      product.ratings.count = 0;
    } else {
      const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
      product.ratings.average = parseFloat((totalRating / reviews.length).toFixed(1));
      product.ratings.count = reviews.length;
    }

    await product.save({ validateBeforeSave: false });
  } catch (error) {
    console.error('Update product rating error:', error);
  }
}