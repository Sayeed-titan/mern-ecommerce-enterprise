const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    // Create indexes for better performance
    await createIndexes();

  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
};

// Create compound indexes for optimized queries
const createIndexes = async () => {
  try {
    const Product = mongoose.model('Product');
    const Order = mongoose.model('Order');
    const Review = mongoose.model('Review');

    // Product indexes
    await Product.collection.createIndex({ name: 'text', description: 'text' });
    await Product.collection.createIndex({ category: 1, isActive: 1 });
    await Product.collection.createIndex({ vendor: 1, isActive: 1 });
    await Product.collection.createIndex({ 'ratings.average': -1 });
    await Product.collection.createIndex({ createdAt: -1 });

    // Order indexes
    await Order.collection.createIndex({ user: 1, createdAt: -1 });
    await Order.collection.createIndex({ status: 1, createdAt: -1 });
    await Order.collection.createIndex({ 'orderItems.vendor': 1 });

    // Review indexes
    await Review.collection.createIndex({ product: 1, user: 1 }, { unique: true });

    console.log('✅ Database indexes created successfully');
  } catch (error) {
    console.log('Indexes will be created after models are loaded');
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('MongoDB connection closed');
  process.exit(0);
});

module.exports = connectDB;