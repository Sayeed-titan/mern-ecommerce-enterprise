const mongoose = require('mongoose');

// Product Variant Schema (for sizes, colors, etc.)
const variantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  sku: {
    type: String,
    required: false,
    unique: true,
    sparse: true,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  stock: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
  },
  attributes: {
    size: String,
    color: String,
    material: String,
  },
  images: [
    {
      url: String,
      public_id: String,
    },
  ],
  isActive: {
    type: Boolean,
    default: true,
  },
});

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a product name'],
      trim: true,
      maxlength: [200, 'Name cannot be more than 200 characters'],
    },
    slug: {
      type: String,
      unique: true,
    },
    description: {
      type: String,
      required: [true, 'Please add a description'],
      maxlength: [2000, 'Description cannot be more than 2000 characters'],
    },
    shortDescription: {
      type: String,
      maxlength: [500, 'Short description cannot be more than 500 characters'],
    },
    price: {
      type: Number,
      required: [true, 'Please add a price'],
      min: [0, 'Price cannot be negative'],
    },
    compareAtPrice: {
      type: Number,
      default: 0,
    },
    images: [
      {
        url: {
          type: String,
          required: true,
        },
        public_id: {
          type: String,
          required: true,
        },
      },
    ],
    category: {
      type: String,
      required: [true, 'Please add a category'],
      enum: [
        'Electronics',
        'Clothing',
        'Books',
        'Home & Garden',
        'Sports',
        'Toys',
        'Beauty',
        'Food',
        'Automotive',
        'Health',
        'Other',
      ],
    },
    subCategory: {
      type: String,
    },
    tags: [String],
    // Base stock (if no variants)
    stock: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Low stock threshold for alerts
    lowStockThreshold: {
      type: Number,
      default: 10,
    },
    // Product variants (size, color combinations)
    variants: [variantSchema],
    // Has variants flag
    hasVariants: {
      type: Boolean,
      default: false,
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    ratings: {
      average: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      count: {
        type: Number,
        default: 0,
      },
    },
    // SEO fields
    metaTitle: String,
    metaDescription: String,
    metaKeywords: [String],
    // Product specifications
    specifications: {
      type: Map,
      of: String,
    },
    // Shipping info
    weight: Number,
    dimensions: {
      length: Number,
      width: Number,
      height: Number,
    },
    // Status
    isActive: {
      type: Boolean,
      default: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    // Analytics
    views: {
      type: Number,
      default: 0,
    },
    sales: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Create slug from name
productSchema.pre('save', function (next) {
  if (this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') + '-' + Date.now();
  }
  next();
});

// Virtual for total stock (including variants)
productSchema.virtual('totalStock').get(function () {
  if (this.hasVariants && this.variants.length > 0) {
    return this.variants.reduce((total, variant) => total + variant.stock, 0);
  }
  return this.stock;
});

// Virtual for discount percentage
productSchema.virtual('discountPercentage').get(function () {
  if (this.compareAtPrice > this.price) {
    return Math.round(((this.compareAtPrice - this.price) / this.compareAtPrice) * 100);
  }
  return 0;
});

// Check if product is low in stock
productSchema.virtual('isLowStock').get(function () {
  return this.totalStock <= this.lowStockThreshold && this.totalStock > 0;
});

// Check if product is out of stock
productSchema.virtual('isOutOfStock').get(function () {
  return this.totalStock === 0;
});

// Virtual populate for reviews
productSchema.virtual('reviews', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'product',
});

// Indexes for performance
productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ vendor: 1, isActive: 1 });
productSchema.index({ 'ratings.average': -1 });
productSchema.index({ price: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ sales: -1 });
productSchema.index({ slug: 1 });

// Compound indexes
productSchema.index({ category: 1, 'ratings.average': -1 });
productSchema.index({ vendor: 1, createdAt: -1 });

module.exports = mongoose.model('Product', productSchema);