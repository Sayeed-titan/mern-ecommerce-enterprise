const express = require('express');
const router = express.Router();
const {
  getDashboard,
  getSalesTrends,
  getProductAnalytics,
  getCustomerInsights,
  getRevenueForecast,
} = require('../controllers/analyticsController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize('vendor', 'admin'));

router.get('/dashboard', getDashboard);
router.get('/sales', getSalesTrends);
router.get('/products', getProductAnalytics);
router.get('/customers', authorize('admin'), getCustomerInsights);
router.get('/forecast', getRevenueForecast);

module.exports = router;