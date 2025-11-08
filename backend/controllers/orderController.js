const Order = require('../models/Order');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const mongoose = require('mongoose');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { clearCache } = require('../config/redis');

// @desc    Create new order
// @route   POST /api/v1/orders
// @access  Private
exports.createOrder = async (req, res) => {
  // Note: Transactions disabled for local MongoDB (requires replica set)
  // In production with MongoDB Atlas, use transactions
  
  try {
    const {
      orderItems,
      shippingAddress,
      paymentMethod,
      itemsPrice,
      taxPrice,
      shippingPrice,
      totalPrice,
      couponCode,
    } = req.body;

    if (!orderItems || orderItems.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'No order items',
      });
    }

    let discountAmount = 0;
    let couponApplied = null;

    // Validate and apply coupon if provided
    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase() });
      
      if (coupon) {
        const validation = coupon.isValid(req.user.id, itemsPrice);
        
        if (validation.valid) {
          discountAmount = coupon.calculateDiscount(itemsPrice);
          couponApplied = {
            code: coupon.code,
            discountType: coupon.discountType,
            discountValue: coupon.discountValue,
          };

          // Update coupon usage
          coupon.usedCount += 1;
          const userUsage = coupon.usedBy.find(
            u => u.user.toString() === req.user.id.toString()
          );
          
          if (userUsage) {
            userUsage.usedCount += 1;
            userUsage.lastUsed = new Date();
          } else {
            coupon.usedBy.push({
              user: req.user.id,
              usedCount: 1,
              lastUsed: new Date(),
            });
          }
          
          await coupon.save({ session });
        }
      }
    }

    // Validate stock and update inventory
    for (const item of orderItems) {
      const product = await Product.findById(item.product).session(session);

      if (!product) {
        await session.abortTransaction();
        return res.status(404).json({
          success: false,
          message: `Product not found: ${item.name}`,
        });
      }

      // Check if product has variants
      if (product.hasVariants && item.variant) {
        const variant = product.variants.id(item.variant.variantId);
        
        if (!variant) {
          await session.abortTransaction();
          return res.status(400).json({
            success: false,
            message: `Variant not found for product: ${item.name}`,
          });
        }

        if (variant.stock < item.quantity) {
          await session.abortTransaction();
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for ${item.name} (${variant.attributes.size}, ${variant.attributes.color})`,
          });
        }

        // Update variant stock
        variant.stock -= item.quantity;
      } else {
        // Simple product without variants
        if (product.stock < item.quantity) {
          await session.abortTransaction();
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for ${item.name}`,
          });
        }

        // Update product stock
        product.stock -= item.quantity;
      }

      // Update sales count
      product.sales += item.quantity;
      await product.save({ session });

      // Add vendor to order item
      item.vendor = product.vendor;
    }

    // Calculate final total with discount
    const finalTotalPrice = totalPrice - discountAmount;

    // Create order
    const order = await Order.create(
      [
        {
          user: req.user.id,
          orderItems,
          shippingAddress,
          paymentMethod,
          itemsPrice,
          taxPrice,
          shippingPrice,
          discountAmount,
          totalPrice: finalTotalPrice,
          couponApplied,
        },
      ],
      { session }
    );

    // Commit transaction
    await session.commitTransaction();

    // Clear relevant caches
    await clearCache('products:*');
    await clearCache('orders:*');

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: order[0],
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create order',
    });
  } finally {
    session.endSession();
  }
};

// @desc    Get logged in user orders
// @route   GET /api/v1/orders/my-orders
// @access  Private
exports.getMyOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    const query = { user: req.user.id };
    
    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const orders = await Order.find(query)
      .populate('orderItems.product', 'name images')
      .sort('-createdAt')
      .limit(Number(limit))
      .skip(skip);

    const total = await Order.countDocuments(query);

    res.status(200).json({
      success: true,
      count: orders.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page),
      data: orders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
    });
  }
};

// @desc    Get single order
// @route   GET /api/v1/orders/:id
// @access  Private
exports.getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email phone')
      .populate('orderItems.product', 'name images price')
      .populate('orderItems.vendor', 'name storeName email');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Check authorization
    if (
      req.user.role === 'customer' &&
      order.user._id.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this order',
      });
    }

    // Vendor can only see orders containing their products
    if (req.user.role === 'vendor') {
      const hasVendorProducts = order.orderItems.some(
        item => item.vendor._id.toString() === req.user.id
      );

      if (!hasVendorProducts) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view this order',
        });
      }
    }

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order',
    });
  }
};

// @desc    Update order status
// @route   PUT /api/v1/orders/:id/status
// @access  Private (Vendor/Admin)
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const validStatuses = ['processing', 'shipped', 'delivered', 'cancelled'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status',
      });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Check authorization for vendor
    if (req.user.role === 'vendor') {
      const hasVendorProducts = order.orderItems.some(
        item => item.vendor.toString() === req.user.id
      );

      if (!hasVendorProducts) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to update this order',
        });
      }
    }

    order.status = status;

    if (status === 'delivered') {
      order.isDelivered = true;
      order.deliveredAt = Date.now();
    }

    if (status === 'cancelled') {
      order.cancelledAt = Date.now();
      order.cancelledBy = req.user.id;
      order.cancelReason = req.body.cancelReason;

      // Restore inventory
      for (const item of order.orderItems) {
        const product = await Product.findById(item.product);
        
        if (product) {
          if (item.variant) {
            const variant = product.variants.id(item.variant.variantId);
            if (variant) {
              variant.stock += item.quantity;
            }
          } else {
            product.stock += item.quantity;
          }
          
          product.sales -= item.quantity;
          await product.save();
        }
      }
    }

    await order.save();

    // Clear cache
    await clearCache('orders:*');
    await clearCache('products:*');

    res.status(200).json({
      success: true,
      message: 'Order status updated',
      data: order,
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update order status',
    });
  }
};

// @desc    Process Stripe payment
// @route   POST /api/v1/orders/:id/pay
// @access  Private
exports.processPayment = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    if (order.isPaid) {
      return res.status(400).json({
        success: false,
        message: 'Order is already paid',
      });
    }

    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(order.totalPrice * 100), // Convert to cents
      currency: 'usd',
      metadata: {
        orderId: order._id.toString(),
        userId: req.user.id.toString(),
      },
    });

    res.status(200).json({
      success: true,
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error('Payment processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Payment processing failed',
    });
  }
};

// @desc    Get all orders (Admin)
// @route   GET /api/v1/orders
// @access  Private (Admin)
exports.getAllOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    const query = {};
    
    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const orders = await Order.find(query)
      .populate('user', 'name email')
      .populate('orderItems.product', 'name')
      .sort('-createdAt')
      .limit(Number(limit))
      .skip(skip);

    const total = await Order.countDocuments(query);

    res.status(200).json({
      success: true,
      count: orders.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page),
      data: orders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
    });
  }
};

// @desc    Get vendor orders
// @route   GET /api/v1/orders/vendor/my-orders
// @access  Private (Vendor)
exports.getVendorOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    const query = {
      'orderItems.vendor': req.user.id,
    };

    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const orders = await Order.find(query)
      .populate('user', 'name email phone')
      .populate('orderItems.product', 'name images')
      .sort('-createdAt')
      .limit(Number(limit))
      .skip(skip);

    const total = await Order.countDocuments(query);

    res.status(200).json({
      success: true,
      count: orders.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page),
      data: orders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vendor orders',
    });
  }
};