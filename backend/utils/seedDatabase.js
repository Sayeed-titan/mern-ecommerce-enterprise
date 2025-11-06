const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');

// Load env vars
dotenv.config();

// Connect to DB
const connectDB = async () => {
  await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log('MongoDB Connected');
};

// Sample users
const users = [
  {
    name: 'Admin User',
    email: 'admin@demo.com',
    password: 'admin123',
    role: 'admin',
    isVerified: true,
  },
  {
    name: 'John Vendor',
    email: 'vendor@demo.com',
    password: 'vendor123',
    role: 'vendor',
    storeName: "John's Electronics Store",
    storeDescription: 'Quality electronics at affordable prices',
    isVerified: true,
  },
  {
    name: 'Jane Customer',
    email: 'customer@demo.com',
    password: 'customer123',
    role: 'customer',
    isVerified: true,
  },
];

// Sample products
const getProducts = (vendorId) => [
  {
    name: 'Wireless Bluetooth Headphones',
    description: 'Premium wireless headphones with noise cancellation, 30-hour battery life, and superior sound quality.',
    shortDescription: 'Premium wireless headphones with noise cancellation',
    price: 129.99,
    compareAtPrice: 199.99,
    images: [
      {
        url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500',
        public_id: 'demo_headphones',
      },
    ],
    category: 'Electronics',
    stock: 50,
    lowStockThreshold: 10,
    vendor: vendorId,
    isFeatured: true,
    tags: ['wireless', 'bluetooth', 'audio'],
  },
  {
    name: 'Smart Fitness Watch',
    description: 'Track your fitness goals with this advanced smartwatch featuring heart rate monitoring, GPS, and 7-day battery life.',
    shortDescription: 'Advanced fitness tracking smartwatch',
    price: 199.99,
    compareAtPrice: 299.99,
    images: [
      {
        url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500',
        public_id: 'demo_watch',
      },
    ],
    category: 'Electronics',
    stock: 30,
    lowStockThreshold: 5,
    vendor: vendorId,
    isFeatured: true,
    tags: ['fitness', 'smartwatch', 'health'],
  },
  {
    name: 'Portable Power Bank 20000mAh',
    description: 'High-capacity portable charger with fast charging support for all your devices. Perfect for travel.',
    shortDescription: 'High-capacity 20000mAh power bank',
    price: 39.99,
    compareAtPrice: 59.99,
    images: [
      {
        url: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=500',
        public_id: 'demo_powerbank',
      },
    ],
    category: 'Electronics',
    stock: 100,
    lowStockThreshold: 20,
    vendor: vendorId,
    tags: ['power bank', 'charging', 'portable'],
  },
  {
    name: 'Mechanical Gaming Keyboard',
    description: 'RGB backlit mechanical keyboard with blue switches, perfect for gaming and typing. Durable and responsive.',
    shortDescription: 'RGB mechanical keyboard for gaming',
    price: 89.99,
    images: [
      {
        url: 'https://images.unsplash.com/photo-1595225476474-87563907a212?w=500',
        public_id: 'demo_keyboard',
      },
    ],
    category: 'Electronics',
    stock: 25,
    lowStockThreshold: 5,
    vendor: vendorId,
    tags: ['gaming', 'keyboard', 'rgb'],
  },
  {
    name: 'Wireless Gaming Mouse',
    description: 'Ergonomic wireless gaming mouse with 6 programmable buttons, adjustable DPI, and long battery life.',
    shortDescription: 'Ergonomic wireless gaming mouse',
    price: 49.99,
    compareAtPrice: 79.99,
    images: [
      {
        url: 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=500',
        public_id: 'demo_mouse',
      },
    ],
    category: 'Electronics',
    stock: 40,
    vendor: vendorId,
    isFeatured: true,
    tags: ['gaming', 'mouse', 'wireless'],
  },
  {
    name: 'USB-C Hub 7-in-1',
    description: 'Versatile USB-C hub with HDMI, USB 3.0, SD card reader, and more. Perfect for laptops and tablets.',
    shortDescription: '7-in-1 USB-C hub adapter',
    price: 34.99,
    images: [
      {
        url: 'https://images.unsplash.com/photo-1625948515291-69613efd103f?w=500',
        public_id: 'demo_hub',
      },
    ],
    category: 'Electronics',
    stock: 60,
    vendor: vendorId,
    tags: ['usb-c', 'hub', 'adapter'],
  },
  {
    name: '4K Webcam with Microphone',
    description: 'Professional 4K webcam with built-in microphone, auto-focus, and wide-angle lens for video calls and streaming.',
    shortDescription: 'Professional 4K webcam',
    price: 79.99,
    images: [
      {
        url: 'https://images.unsplash.com/photo-1622504089082-ac4ba6d74b3b?w=500',
        public_id: 'demo_webcam',
      },
    ],
    category: 'Electronics',
    stock: 20,
    lowStockThreshold: 5,
    vendor: vendorId,
    tags: ['webcam', '4k', 'streaming'],
  },
  {
    name: 'Laptop Stand Aluminum',
    description: 'Adjustable aluminum laptop stand with ergonomic design. Improves posture and airflow for your device.',
    shortDescription: 'Ergonomic aluminum laptop stand',
    price: 29.99,
    images: [
      {
        url: 'https://images.unsplash.com/photo-1625948515291-69613efd103f?w=500',
        public_id: 'demo_stand',
      },
    ],
    category: 'Electronics',
    stock: 35,
    vendor: vendorId,
    tags: ['laptop', 'stand', 'ergonomic'],
  },
];

// Sample coupons
const getCoupons = (adminId) => [
  {
    code: 'WELCOME10',
    description: '10% off for new customers',
    discountType: 'percentage',
    discountValue: 10,
    minPurchaseAmount: 50,
    maxDiscountAmount: 20,
    startDate: new Date(),
    endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
    usageLimit: 100,
    perUserLimit: 1,
    isActive: true,
    createdBy: adminId,
  },
  {
    code: 'SAVE20',
    description: '$20 off on orders over $100',
    discountType: 'fixed',
    discountValue: 20,
    minPurchaseAmount: 100,
    startDate: new Date(),
    endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
    usageLimit: 50,
    perUserLimit: 2,
    isActive: true,
    createdBy: adminId,
  },
];

// Import data
const importData = async () => {
  try {
    await connectDB();

    // Clear existing data
    await User.deleteMany();
    await Product.deleteMany();
    await Coupon.deleteMany();

    console.log('Data cleared...');

    // Create users
    const createdUsers = await User.create(users);
    console.log(`${createdUsers.length} users created`);

    // Find vendor
    const vendor = createdUsers.find((user) => user.role === 'vendor');
    const admin = createdUsers.find((user) => user.role === 'admin');

    // Create products
    const products = getProducts(vendor._id);
    const createdProducts = await Product.create(products);
    console.log(`${createdProducts.length} products created`);

    // Create coupons
    const coupons = getCoupons(admin._id);
    const createdCoupons = await Coupon.create(coupons);
    console.log(`${createdCoupons.length} coupons created`);

    console.log('\n✅ Data imported successfully!');
    console.log('\n📧 Demo Credentials:');
    console.log('Admin: admin@demo.com / admin123');
    console.log('Vendor: vendor@demo.com / vendor123');
    console.log('Customer: customer@demo.com / customer123');

    process.exit(0);
  } catch (error) {
    console.error('Error importing data:', error);
    process.exit(1);
  }
};

// Delete data
const deleteData = async () => {
  try {
    await connectDB();

    await User.deleteMany();
    await Product.deleteMany();
    await Coupon.deleteMany();

    console.log('✅ Data deleted successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error deleting data:', error);
    process.exit(1);
  }
};

// Run functions based on command
if (process.argv[2] === '-i') {
  importData();
} else if (process.argv[2] === '-d') {
  deleteData();
} else {
  console.log('Please use -i to import or -d to delete data');
  process.exit(0);
}