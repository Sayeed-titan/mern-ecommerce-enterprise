const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Please add a coupon code'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    discountType: {
      type: String,
      required: true,
      enum: ['percentage', 'fixed'],
    },
    discountValue: {
      type: Number,
      required: true,
      min: 0,
    },
    // Minimum purchase amount required
    minPurchaseAmount: {
      type: Number,
      default: 0,
    },
    // Maximum discount amount (for percentage discounts)
    maxDiscountAmount: {
      type: Number,
    },
    // Usage limits
    usageLimit: {
      type: Number,
      default: null, // null = unlimited
    },
    usedCount: {
      type: Number,
      default: 0,
    },
    // User specific
    perUserLimit: {
      type: Number,
      default: 1,
    },
    usedBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        usedCount: {
          type: Number,
          default: 0,
        },
        lastUsed: Date,
      },
    ],
    // Valid date range
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    // Restrictions
    applicableCategories: [String],
    applicableProducts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
      },
    ],
    excludedProducts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
      },
    ],
    // First time customer only
    firstOrderOnly: {
      type: Boolean,
      default: false,
    },
    // Status
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Check if coupon is valid
couponSchema.methods.isValid = function (userId = null, orderTotal = 0) {
  const now = new Date();

  // Check if active
  if (!this.isActive) {
    return { valid: false, message: 'Coupon is not active' };
  }

  // Check date range
  if (now < this.startDate) {
    return { valid: false, message: 'Coupon is not yet valid' };
  }

  if (now > this.endDate) {
    return { valid: false, message: 'Coupon has expired' };
  }

  // Check usage limit
  if (this.usageLimit && this.usedCount >= this.usageLimit) {
    return { valid: false, message: 'Coupon usage limit reached' };
  }

  // Check minimum purchase amount
  if (orderTotal < this.minPurchaseAmount) {
    return {
      valid: false,
      message: `Minimum purchase amount of $${this.minPurchaseAmount} required`,
    };
  }

  // Check per user limit
  if (userId) {
    const userUsage = this.usedBy.find(
      (u) => u.user.toString() === userId.toString()
    );
    if (userUsage && userUsage.usedCount >= this.perUserLimit) {
      return { valid: false, message: 'You have already used this coupon' };
    }
  }

  return { valid: true };
};

// Calculate discount amount
couponSchema.methods.calculateDiscount = function (orderTotal) {
  let discount = 0;

  if (this.discountType === 'percentage') {
    discount = (orderTotal * this.discountValue) / 100;
    // Apply max discount cap if set
    if (this.maxDiscountAmount && discount > this.maxDiscountAmount) {
      discount = this.maxDiscountAmount;
    }
  } else {
    // Fixed discount
    discount = this.discountValue;
    // Don't exceed order total
    if (discount > orderTotal) {
      discount = orderTotal;
    }
  }

  return parseFloat(discount.toFixed(2));
};

// Indexes
couponSchema.index({ code: 1 });
couponSchema.index({ isActive: 1, startDate: 1, endDate: 1 });

module.exports = mongoose.model('Coupon', couponSchema);