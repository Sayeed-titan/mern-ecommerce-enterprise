const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  addVariant,
  updateVariant,
  deleteVariant,
  getLowStockProducts,
} = require('../controllers/productController');
const { protect, authorize } = require('../middleware/auth');
const { uploadProduct } = require('../config/cloudinary');
const { cacheMiddleware } = require('../config/redis');
const { searchLimiter } = require('../middleware/rateLimiter');

// Public routes
router.get('/', cacheMiddleware(300), getProducts);
router.get('/search', searchLimiter, getProducts);
router.get('/:id', getProduct);

// Protected routes - Vendor/Admin
router.use(protect);

router
  .route('/low-stock')
  .get(authorize('vendor', 'admin'), getLowStockProducts);

router
  .route('/')
  .post(
    authorize('vendor', 'admin'),
    uploadProduct.array('images', 5),
    createProduct
  );

router
  .route('/:id')
  .put(
    authorize('vendor', 'admin'),
    uploadProduct.array('images', 5),
    updateProduct
  )
  .delete(authorize('vendor', 'admin'), deleteProduct);

// Variant routes
router
  .route('/:id/variants')
  .post(authorize('vendor', 'admin'), addVariant);

router
  .route('/:id/variants/:variantId')
  .put(authorize('vendor', 'admin'), updateVariant)
  .delete(authorize('vendor', 'admin'), deleteVariant);

module.exports = router;