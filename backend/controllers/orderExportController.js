const Order = require('../models/Order');
const path = require('path');
const fs = require('fs');
const { generateInvoice } = require('../utils/pdfGenerator');
const { exportOrdersToCSV } = require('../utils/csvExporter');

// @desc    Download order invoice
// @route   GET /api/v1/orders/:id/invoice
// @access  Private
exports.downloadInvoice = async (req, res) => {
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

    // Check authorization
    if (
      req.user.role === 'customer' &&
      order.user._id.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to download this invoice',
      });
    }

    // Generate invoice number if not exists
    if (!order.invoiceNumber) {
      order.invoiceNumber = `INV-${order.orderNumber}`;
      await order.save({ validateBeforeSave: false });
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Generate PDF
    const filename = `invoice-${order.orderNumber}-${Date.now()}.pdf`;
    const outputPath = path.join(uploadsDir, filename);

    await generateInvoice(order, outputPath);

    // Send file
    res.download(outputPath, filename, (err) => {
      if (err) {
        console.error('Error downloading file:', err);
        res.status(500).json({
          success: false,
          message: 'Failed to download invoice',
        });
      }

      // Delete file after sending
      fs.unlink(outputPath, (unlinkErr) => {
        if (unlinkErr) console.error('Error deleting temp file:', unlinkErr);
      });
    });
  } catch (error) {
    console.error('Download invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate invoice',
    });
  }
};

// @desc    Export orders to CSV
// @route   GET /api/v1/orders/export/csv
// @access  Private (Vendor/Admin)
exports.exportOrdersCSV = async (req, res) => {
  try {
    const { startDate, endDate, status } = req.query;

    const query = {};

    // Filter by vendor if not admin
    if (req.user.role === 'vendor') {
      query['orderItems.vendor'] = req.user.id;
    }

    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Status filter
    if (status) {
      query.status = status;
    }

    const orders = await Order.find(query)
      .populate('user', 'name email')
      .sort('-createdAt')
      .lean();

    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No orders found for export',
      });
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Generate CSV
    const filename = `orders-export-${Date.now()}.csv`;
    const outputPath = await exportOrdersToCSV(orders, filename);

    // Send file
    res.download(outputPath, filename, (err) => {
      if (err) {
        console.error('Error downloading CSV:', err);
        res.status(500).json({
          success: false,
          message: 'Failed to download CSV',
        });
      }

      // Delete file after sending
      fs.unlink(outputPath, (unlinkErr) => {
        if (unlinkErr) console.error('Error deleting temp file:', unlinkErr);
      });
    });
  } catch (error) {
    console.error('Export CSV error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export orders',
    });
  }
};

module.exports = {
  downloadInvoice,
  exportOrdersCSV,
};