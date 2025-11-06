const express = require('express');
const router = express.Router();
const {
  createCoupon,
  getCoupons,
  getCoupon,
  updateCoupon,
  deleteCoupon,
  validateCoupon,
  getActiveCoupons,
} = require('../controllers/couponController');
const { protect, authorize } = require('../middleware/auth');

// Protected routes
router.use(protect);

// Customer routes
router.post('/validate', validateCoupon);
router.get('/active', getActiveCoupons);

// Admin routes
router.use(authorize('admin'));
router.route('/').get(getCoupons).post(createCoupon);
router.route('/:id').get(getCoupon).put(updateCoupon).delete(deleteCoupon);

module.exports = router;