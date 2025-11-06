const Coupon = require('../models/Coupon');

// @desc    Create coupon
// @route   POST /api/v1/coupons
// @access  Private (Admin)
exports.createCoupon = async (req, res) => {
  try {
    req.body.createdBy = req.user.id;

    const coupon = await Coupon.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Coupon created successfully',
      data: coupon,
    });
  } catch (error) {
    console.error('Create coupon error:', error);
    res.status(500).json({
      success: false,
      message: error.code === 11000 ? 'Coupon code already exists' : 'Failed to create coupon',
    });
  }
};

// @desc    Get all coupons
// @route   GET /api/v1/coupons
// @access  Private (Admin)
exports.getCoupons = async (req, res) => {
  try {
    const { page = 1, limit = 10, isActive } = req.query;

    const query = {};

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const skip = (page - 1) * limit;

    const coupons = await Coupon.find(query)
      .populate('createdBy', 'name email')
      .sort('-createdAt')
      .limit(Number(limit))
      .skip(skip);

    const total = await Coupon.countDocuments(query);

    res.status(200).json({
      success: true,
      count: coupons.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page),
      data: coupons,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch coupons',
    });
  }
};

// @desc    Get single coupon
// @route   GET /api/v1/coupons/:id
// @access  Private (Admin)
exports.getCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('applicableProducts', 'name price')
      .populate('excludedProducts', 'name');

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found',
      });
    }

    res.status(200).json({
      success: true,
      data: coupon,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch coupon',
    });
  }
};

// @desc    Update coupon
// @route   PUT /api/v1/coupons/:id
// @access  Private (Admin)
exports.updateCoupon = async (req, res) => {
  try {
    let coupon = await Coupon.findById(req.params.id);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found',
      });
    }

    // Don't allow updating code if coupon is already used
    if (req.body.code && coupon.usedCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot change code of a used coupon',
      });
    }

    coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: 'Coupon updated successfully',
      data: coupon,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update coupon',
    });
  }
};

// @desc    Delete coupon
// @route   DELETE /api/v1/coupons/:id
// @access  Private (Admin)
exports.deleteCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found',
      });
    }

    await coupon.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Coupon deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete coupon',
    });
  }
};

// @desc    Validate coupon
// @route   POST /api/v1/coupons/validate
// @access  Private
exports.validateCoupon = async (req, res) => {
  try {
    const { code, orderTotal } = req.body;

    if (!code || !orderTotal) {
      return res.status(400).json({
        success: false,
        message: 'Coupon code and order total are required',
      });
    }

    const coupon = await Coupon.findOne({ 
      code: code.toUpperCase(),
      isActive: true,
    });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Invalid coupon code',
      });
    }

    // Validate coupon
    const validation = coupon.isValid(req.user.id, orderTotal);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.message,
      });
    }

    // Calculate discount
    const discountAmount = coupon.calculateDiscount(orderTotal);
    const finalTotal = orderTotal - discountAmount;

    res.status(200).json({
      success: true,
      message: 'Coupon is valid',
      data: {
        code: coupon.code,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAmount,
        originalTotal: orderTotal,
        finalTotal,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to validate coupon',
    });
  }
};

// @desc    Get active coupons for customer
// @route   GET /api/v1/coupons/active
// @access  Private
exports.getActiveCoupons = async (req, res) => {
  try {
    const now = new Date();

    const coupons = await Coupon.find({
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
      $or: [
        { usageLimit: null },
        { $expr: { $lt: ['$usedCount', '$usageLimit'] } },
      ],
    }).select('code description discountType discountValue minPurchaseAmount maxDiscountAmount endDate');

    res.status(200).json({
      success: true,
      count: coupons.length,
      data: coupons,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active coupons',
    });
  }
};