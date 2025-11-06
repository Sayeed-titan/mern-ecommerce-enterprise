const express = require('express');
const router = express.Router();
const {
  createOrder,
  getMyOrders,
  getOrder,
  updateOrderStatus,
  processPayment,
  getAllOrders,
  getVendorOrders,
} = require('../controllers/orderController');
const {
  downloadInvoice,
  exportOrdersCSV,
} = require('../controllers/orderExportController');
const { protect, authorize } = require('../middleware/auth');

// Protected routes - Customer
router.use(protect);

router.post('/', createOrder);
router.get('/my-orders', getMyOrders);

// Export CSV - Vendor/Admin
router.get('/export/csv', authorize('vendor', 'admin'), exportOrdersCSV);

// Order details and actions
router.get('/:id', getOrder);
router.post('/:id/pay', processPayment);
router.get('/:id/invoice', downloadInvoice);

// Vendor routes
router.get('/vendor/my-orders', authorize('vendor'), getVendorOrders);

// Vendor/Admin routes
router.put(
  '/:id/status',
  authorize('vendor', 'admin'),
  updateOrderStatus
);

// Admin routes
router.get('/', authorize('admin'), getAllOrders);

module.exports = router;