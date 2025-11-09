const mongoose = require('mongoose');
// const { downloadInvoice, exportOrdersCSV } = require('../controllers/orderExportController');


const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    orderItems: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        price: {
          type: Number,
          required: true,
        },
        image: String,
        vendor: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        // Variant info if applicable
        variant: {
          variantId: mongoose.Schema.Types.ObjectId,
          sku: String,
          attributes: {
            size: String,
            color: String,
          },
        },
      },
    ],
    shippingAddress: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      zipCode: { type: String, required: true },
      country: { type: String, required: true },
      phone: String,
    },
    paymentMethod: {
      type: String,
      required: true,
      default: 'stripe',
    },
    paymentResult: {
      id: String,
      status: String,
      update_time: String,
      email_address: String,
    },
    // Pricing breakdown
    itemsPrice: {
      type: Number,
      required: true,
      default: 0.0,
    },
    taxPrice: {
      type: Number,
      required: true,
      default: 0.0,
    },
    shippingPrice: {
      type: Number,
      required: true,
      default: 0.0,
    },
    discountAmount: {
      type: Number,
      default: 0.0,
    },
    totalPrice: {
      type: Number,
      required: true,
      default: 0.0,
    },
    // Coupon info
    couponApplied: {
      code: String,
      discountType: {
        type: String,
        enum: ['percentage', 'fixed'],
      },
      discountValue: Number,
    },
    // Payment status
    isPaid: {
      type: Boolean,
      required: true,
      default: false,
    },
    paidAt: {
      type: Date,
    },
    // Delivery status
    isDelivered: {
      type: Boolean,
      required: true,
      default: false,
    },
    deliveredAt: {
      type: Date,
    },
    // Order status
    status: {
      type: String,
      enum: [
        'pending',
        'confirmed',
        'processing', 
        'ready_for_delivery',
        'shipped',
        'out_for_delivery',
        'delivered',
        'cancelled',
        'refunded'
      ],
      default: 'pending',
    },
    // Tracking
    trackingNumber: String,
    carrier: String,
    // Notes
    customerNote: String,
    vendorNote: String,
    adminNote: String,
    // Invoice
    invoiceUrl: String,
    invoiceNumber: String,
    // Cancellation
    cancelReason: String,
    cancelledAt: Date,
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    // Refund
    refundAmount: Number,
    refundedAt: Date,
    refundReason: String,
  },
  {
    timestamps: true,
  }
);

// Generate order number before saving
orderSchema.pre('save', async function (next) {
  if (!this.orderNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.orderNumber = `ORD-${year}${month}-${random}`;
  }
  next();
});

// Indexes for performance
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ 'orderItems.vendor': 1 });
orderSchema.index({ isPaid: 1, isDelivered: 1 });
orderSchema.index({ createdAt: -1 });

// Compound index for vendor orders
orderSchema.index({ 'orderItems.vendor': 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);