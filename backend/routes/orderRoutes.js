// Add this to your orderRoutes.js file

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Order = require('../models/Order');
const { generateInvoice } = require('../utils/invoiceGenerator');
const path = require('path');
const fs = require('fs');

// ... your other routes ...

// @desc    Get invoice PDF
// @route   GET /api/orders/:id/invoice
// @access  Private
router.get('/:id/invoice', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email')
      .populate('orderItems.product', 'name');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Check if user owns this order or is admin
    if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this invoice',
      });
    }

    // Create invoices directory if it doesn't exist
    const invoicesDir = path.join(__dirname, '../invoices');
    if (!fs.existsSync(invoicesDir)) {
      fs.mkdirSync(invoicesDir, { recursive: true });
    }

    // Generate unique filename
    const filename = `invoice-${order.orderNumber}-${Date.now()}.pdf`;
    const filepath = path.join(invoicesDir, filename);

    // Generate the PDF
    await generateInvoice(order, filepath);

    // Send the PDF file
    res.download(filepath, `invoice-${order.orderNumber}.pdf`, (err) => {
      if (err) {
        console.error('Error sending file:', err);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            message: 'Error downloading invoice',
          });
        }
      }

      // Delete the file after sending (optional - cleanup)
      setTimeout(() => {
        if (fs.existsSync(filepath)) {
          fs.unlinkSync(filepath);
        }
      }, 1000);
    });

  } catch (error) {
    console.error('Invoice generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate invoice',
      error: error.message,
    });
  }
});

module.exports = router;