const Product = require('../models/Product');
const { clearCache, getCache, setCache } = require('../config/redis');
const { deleteImage, deleteImages } = require('../config/cloudinary');
const { emitProductCreated, emitProductUpdate, emitProductDeleted } = require('../utils/socketHelper');

// @desc    Get all products with filtering, sorting, pagination
// @route   GET /api/v1/products
// @access  Public
exports.getProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      category,
      minPrice,
      maxPrice,
      rating,
      sort = '-createdAt',
      search,
      vendor,
      isFeatured,
    } = req.query;

    // Build query
    const query = { isActive: true };

    // Category filter
    if (category) {
      query.category = category;
    }

    // Price range filter
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    // Rating filter
    if (rating) {
      query['ratings.average'] = { $gte: Number(rating) };
    }

    // Vendor filter
    if (vendor) {
      query.vendor = vendor;
    }

    // Featured filter
    if (isFeatured === 'true') {
      query.isFeatured = true;
    }

    // Search filter (text search)
    if (search) {
      query.$text = { $search: search };
    }

    // Create cache key
    const cacheKey = `products:${JSON.stringify(req.query)}`;

    // Check cache
    const cachedData = await getCache(cacheKey);
    if (cachedData) {
      return res.status(200).json({
        success: true,
        cached: true,
        ...cachedData,
      });
    }

    // Pagination
    const skip = (page - 1) * limit;

    // Execute query
    const products = await Product.find(query)
      .populate('vendor', 'name storeName email')
      .sort(sort)
      .limit(Number(limit))
      .skip(skip)
      .lean();

    // Get total count
    const total = await Product.countDocuments(query);

    const result = {
      success: true,
      count: products.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page),
      data: products,
    };

    // Cache for 5 minutes
    await setCache(cacheKey, result, 300);

    res.status(200).json(result);
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
    });
  }
};

// @desc    Get single product
// @route   GET /api/v1/products/:id
// @access  Public
exports.getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('vendor', 'name storeName email phone')
      .populate({
        path: 'reviews',
        populate: { path: 'user', select: 'name avatar' },
      });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Increment views
    product.views += 1;
    await product.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product',
    });
  }
};

// @desc    Create new product
// @route   POST /api/v1/products
// @access  Private (Vendor/Admin)
exports.createProduct = async (req, res) => {
  try {
    // Add vendor to body
    req.body.vendor = req.user.id;

    // Handle image uploads
    if (req.files && req.files.length > 0) {
      req.body.images = req.files.map(file => ({
        url: file.path,
        public_id: file.filename,
      }));
    }

    const product = await Product.create(req.body);

    // Clear products cache
    await clearCache('products:*');

    // Emit real-time event
    emitProductCreated(product);

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product,
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create product',
    });
  }
};

// @desc    Update product
// @route   PUT /api/v1/products/:id
// @access  Private (Vendor/Admin)
exports.updateProduct = async (req, res) => {
  try {
    let product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Check ownership
    if (
      req.user.role === 'vendor' &&
      product.vendor.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this product',
      });
    }

    // Handle images
    let finalImages = [...product.images];

    // If existingImages sent from frontend, use only those
    if (req.body.existingImages) {
      try {
        const existingImages = JSON.parse(req.body.existingImages);
        
        // Find images to delete (in DB but not in existingImages)
        const imagesToDelete = product.images.filter(
          img => !existingImages.find(ei => ei.public_id === img.public_id)
        );

        // Delete removed images from Cloudinary
        for (const img of imagesToDelete) {
          try {
            await deleteImage(img.public_id);
            console.log('Deleted old image:', img.public_id);
          } catch (err) {
            console.error('Error deleting image:', err);
          }
        }

        finalImages = existingImages;
      } catch (err) {
        console.error('Error parsing existingImages:', err);
      }
    }

    // Add new uploaded images
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => ({
        url: file.path,
        public_id: file.filename,
      }));
      
      finalImages = [...finalImages, ...newImages];
    }

    // Limit to 5 images
    if (finalImages.length > 5) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 5 images allowed',
      });
    }

    req.body.images = finalImages;

    product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    // Clear cache
    await clearCache('products:*');

    // Emit real-time update
    if (global.io) {
      global.io.to(`product-${req.params.id}`).emit('product-updated', product);
      global.io.to('products-list').emit('products-updated');
    }

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: product,
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update product',
    });
  }
};

// @desc    Delete product
// @route   DELETE /api/v1/products/:id
// @access  Private (Vendor/Admin)
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Check ownership
    if (
      req.user.role === 'vendor' &&
      product.vendor.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this product',
      });
    }

    // Delete images from Cloudinary
    const publicIds = product.images.map(img => img.public_id);
    if (publicIds.length > 0) {
      await deleteImages(publicIds);
    }

    await product.deleteOne();

    // Clear cache
    await clearCache('products:*');

    // Emit real-time event
    emitProductUpdate(req.params.id, product);

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete product',
    });
  }
};

// @desc    Add product variant
// @route   POST /api/v1/products/:id/variants
// @access  Private (Vendor/Admin)
exports.addVariant = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Check ownership
    if (
      req.user.role === 'vendor' &&
      product.vendor.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    // Add variant
    product.variants.push(req.body);
    product.hasVariants = true;
    await product.save();

    // Clear cache
    await clearCache('products:*');

    res.status(200).json({
      success: true,
      message: 'Variant added successfully',
      data: product,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to add variant',
    });
  }
};

// @desc    Update product variant
// @route   PUT /api/v1/products/:id/variants/:variantId
// @access  Private (Vendor/Admin)
exports.updateVariant = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    const variant = product.variants.id(req.params.variantId);

    if (!variant) {
      return res.status(404).json({
        success: false,
        message: 'Variant not found',
      });
    }

    // Update variant fields
    Object.assign(variant, req.body);
    await product.save();

    // Clear cache
    await clearCache('products:*');

    res.status(200).json({
      success: true,
      message: 'Variant updated successfully',
      data: product,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update variant',
    });
  }
};

// @desc    Delete product variant
// @route   DELETE /api/v1/products/:id/variants/:variantId
// @access  Private (Vendor/Admin)
exports.deleteVariant = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    product.variants.pull(req.params.variantId);
    
    if (product.variants.length === 0) {
      product.hasVariants = false;
    }
    
    await product.save();

    // Clear cache
    await clearCache('products:*');

    res.status(200).json({
      success: true,
      message: 'Variant deleted successfully',
      data: product,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete variant',
    });
  }
};

// @desc    Get low stock products
// @route   GET /api/v1/products/low-stock
// @access  Private (Vendor/Admin)
exports.getLowStockProducts = async (req, res) => {
  try {
    const query = { isActive: true };

    // Vendor can only see their products
    if (req.user.role === 'vendor') {
      query.vendor = req.user.id;
    }

    const products = await Product.find(query).lean();

    // Filter products with low stock
    const lowStockProducts = products.filter(product => {
      if (product.hasVariants) {
        const totalStock = product.variants.reduce(
          (sum, v) => sum + v.stock,
          0
        );
        return totalStock <= product.lowStockThreshold;
      }
      return product.stock <= product.lowStockThreshold;
    });

    res.status(200).json({
      success: true,
      count: lowStockProducts.length,
      data: lowStockProducts,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch low stock products',
    });
  }
};