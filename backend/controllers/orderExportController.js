const Order = require('../models/Order');
const path = require('path');
const fs = require('fs');
const { generateInvoice } = require('../utils/pdfGenerator');
const { exportOrdersToCSV } = require('../utils/csvExporter');

// @desc    Download order invoice
// @route   GET /api/v1/orders/:id/invoice
// @access  Private
const downloadInvoice = async (req, res) => {
  try {
    console.log('📄 Invoice download request for order:', req.params.id);
    
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email')
      .populate('orderItems.product', 'name');

    if (!order) {
      console.log('❌ Order not found:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    console.log('✅ Order found:', order.orderNumber);

    // Check authorization
    if (
      req.user.role === 'customer' &&
      order.user._id.toString() !== req.user.id
    ) {
      console.log('❌ Authorization failed for user:', req.user.id);
      return res.status(403).json({
        success: false,
        message: 'Not authorized to download this invoice',
      });
    }

    console.log('✅ Authorization passed');

    // Generate invoice number if not exists
    if (!order.invoiceNumber) {
      order.invoiceNumber = `INV-${order.orderNumber}`;
      await order.save({ validateBeforeSave: false });
      console.log('✅ Generated invoice number:', order.invoiceNumber);
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log('✅ Created uploads directory');
    }

    // Generate PDF
    const filename = `invoice-${order.orderNumber}-${Date.now()}.pdf`;
    const outputPath = path.join(uploadsDir, filename);

    console.log('🔄 Generating PDF at:', outputPath);

    await generateInvoice(order, outputPath);

    console.log('✅ PDF generated successfully');

    // Check if file exists
    if (!fs.existsSync(outputPath)) {
      console.log('❌ PDF file not found after generation');
      return res.status(500).json({
        success: false,
        message: 'Failed to generate PDF file',
      });
    }

    console.log('✅ PDF file exists, sending to client');

    // Send file
    res.download(outputPath, filename, (err) => {
      if (err) {
        console.error('❌ Error downloading file:', err);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            message: 'Failed to download invoice',
          });
        }
      } else {
        console.log('✅ File sent successfully');
      }

      // Delete file after sending
      fs.unlink(outputPath, (unlinkErr) => {
        if (unlinkErr) {
          console.error('⚠️  Error deleting temp file:', unlinkErr);
        } else {
          console.log('✅ Temp file deleted');
        }
      });
    });
  } catch (error) {
    console.error('❌ Download invoice error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to generate invoice',
      error: error.message,
    });
  }
};

// @desc    Export orders to CSV
// @route   GET /api/v1/orders/export/csv
// @access  Private (Vendor/Admin)
const exportOrdersCSV = async (req, res) => {
  try {
    console.log('📊 CSV export request from user:', req.user.id);
    
    const { startDate, endDate, status } = req.query;

    const query = {};

    // Filter by vendor if not admin
    if (req.user.role === 'vendor') {
      query['orderItems.vendor'] = req.user.id;
      console.log('🔍 Filtering by vendor:', req.user.id);
    }

    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
      console.log('📅 Date filter applied:', query.createdAt);
    }

    // Status filter
    if (status) {
      query.status = status;
      console.log('📋 Status filter:', status);
    }

    const orders = await Order.find(query)
      .populate('user', 'name email')
      .sort('-createdAt')
      .lean();

    console.log('✅ Found orders:', orders.length);

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
    console.log('🔄 Generating CSV:', filename);
    
    const outputPath = await exportOrdersToCSV(orders, filename);

    console.log('✅ CSV generated at:', outputPath);

    // Send file
    res.download(outputPath, filename, (err) => {
      if (err) {
        console.error('❌ Error downloading CSV:', err);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            message: 'Failed to download CSV',
          });
        }
      } else {
        console.log('✅ CSV sent successfully');
      }

      // Delete file after sending
      fs.unlink(outputPath, (unlinkErr) => {
        if (unlinkErr) {
          console.error('⚠️  Error deleting temp file:', unlinkErr);
        } else {
          console.log('✅ Temp CSV file deleted');
        }
      });
    });
  } catch (error) {
    console.error('❌ Export CSV error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to export orders',
      error: error.message,
    });
  }
};

module.exports = {
  downloadInvoice,
  exportOrdersCSV,
};