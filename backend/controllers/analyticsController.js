const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const { getCache, setCache } = require('../config/redis');

// @desc    Get dashboard overview
// @route   GET /api/v1/analytics/dashboard
// @access  Private (Vendor/Admin)
exports.getDashboard = async (req, res) => {
  try {
    const cacheKey = `analytics:dashboard:${req.user.id}:${req.user.role}`;
    
    // Check cache
    const cachedData = await getCache(cacheKey);
    if (cachedData) {
      return res.status(200).json({
        success: true,
        cached: true,
        data: cachedData,
      });
    }

    const query = {};
    
    // Filter by vendor if not admin
    if (req.user.role === 'vendor') {
      query['orderItems.vendor'] = req.user.id;
    }

    // Calculate date ranges
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const last30Days = new Date(now.setDate(now.getDate() - 30));

    // Total revenue
    const revenueData = await Order.aggregate([
      {
        $match: {
          ...query,
          isPaid: true,
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$totalPrice' },
          count: { $sum: 1 },
        },
      },
    ]);

    // Monthly revenue
    const monthlyRevenue = await Order.aggregate([
      {
        $match: {
          ...query,
          isPaid: true,
          createdAt: { $gte: startOfMonth },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$totalPrice' },
          count: { $sum: 1 },
        },
      },
    ]);

    // Total products
    const productQuery = req.user.role === 'vendor' ? { vendor: req.user.id } : {};
    const totalProducts = await Product.countDocuments({ ...productQuery, isActive: true });

    // Total customers (if admin)
    let totalCustomers = 0;
    if (req.user.role === 'admin') {
      totalCustomers = await User.countDocuments({ role: 'customer', isActive: true });
    }

    // Pending orders
    const pendingOrders = await Order.countDocuments({
      ...query,
      status: 'pending',
    });

    // Recent orders
    const recentOrders = await Order.find(query)
      .populate('user', 'name email')
      .populate('orderItems.product', 'name')
      .sort('-createdAt')
      .limit(5);

    // Low stock products
    const products = await Product.find(productQuery).lean();
    const lowStockCount = products.filter(product => {
      if (product.hasVariants) {
        const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);
        return totalStock <= product.lowStockThreshold;
      }
      return product.stock <= product.lowStockThreshold;
    }).length;

    const dashboardData = {
      revenue: {
        total: revenueData[0]?.total || 0,
        monthly: monthlyRevenue[0]?.total || 0,
        orders: revenueData[0]?.count || 0,
      },
      products: {
        total: totalProducts,
        lowStock: lowStockCount,
      },
      orders: {
        pending: pendingOrders,
        recent: recentOrders,
      },
      customers: totalCustomers,
    };

    // Cache for 5 minutes
    await setCache(cacheKey, dashboardData, 300);

    res.status(200).json({
      success: true,
      data: dashboardData,
    });
  } catch (error) {
    console.error('Dashboard analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data',
    });
  }
};

// @desc    Get sales trends
// @route   GET /api/v1/analytics/sales
// @access  Private (Vendor/Admin)
exports.getSalesTrends = async (req, res) => {
  try {
    const { period = 'monthly' } = req.query; // daily, weekly, monthly, yearly

    const query = {};
    if (req.user.role === 'vendor') {
      query['orderItems.vendor'] = req.user.id;
    }

    let groupByFormat;
    let dateRange;

    switch (period) {
      case 'daily':
        groupByFormat = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
        dateRange = new Date(new Date().setDate(new Date().getDate() - 30));
        break;
      case 'weekly':
        groupByFormat = { $week: '$createdAt' };
        dateRange = new Date(new Date().setDate(new Date().getDate() - 90));
        break;
      case 'yearly':
        groupByFormat = { $year: '$createdAt' };
        dateRange = new Date(new Date().setFullYear(new Date().getFullYear() - 5));
        break;
      default: // monthly
        groupByFormat = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
        dateRange = new Date(new Date().setMonth(new Date().getMonth() - 12));
    }

    const salesData = await Order.aggregate([
      {
        $match: {
          ...query,
          isPaid: true,
          createdAt: { $gte: dateRange },
        },
      },
      {
        $group: {
          _id: groupByFormat,
          totalRevenue: { $sum: '$totalPrice' },
          orderCount: { $sum: 1 },
          avgOrderValue: { $avg: '$totalPrice' },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    res.status(200).json({
      success: true,
      period,
      count: salesData.length,
      data: salesData,
    });
  } catch (error) {
    console.error('Sales trends error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sales trends',
    });
  }
};

// @desc    Get product analytics
// @route   GET /api/v1/analytics/products
// @access  Private (Vendor/Admin)
exports.getProductAnalytics = async (req, res) => {
  try {
    const query = req.user.role === 'vendor' ? { vendor: req.user.id } : {};

    // Best selling products
    const bestSelling = await Product.find({ ...query, isActive: true })
      .sort('-sales')
      .limit(10)
      .select('name sales price images category');

    // Most viewed products
    const mostViewed = await Product.find({ ...query, isActive: true })
      .sort('-views')
      .limit(10)
      .select('name views images category');

    // Top rated products
    const topRated = await Product.find({ 
      ...query, 
      isActive: true,
      'ratings.count': { $gte: 5 },
    })
      .sort('-ratings.average')
      .limit(10)
      .select('name ratings images price');

    // Category distribution
    const categoryStats = await Product.aggregate([
      { $match: { ...query, isActive: true } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalSales: { $sum: '$sales' },
          avgPrice: { $avg: '$price' },
        },
      },
      { $sort: { count: -1 } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        bestSelling,
        mostViewed,
        topRated,
        categoryStats,
      },
    });
  } catch (error) {
    console.error('Product analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product analytics',
    });
  }
};

// @desc    Get customer insights
// @route   GET /api/v1/analytics/customers
// @access  Private (Admin)
exports.getCustomerInsights = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can access customer insights',
      });
    }

    // Total customers
    const totalCustomers = await User.countDocuments({ role: 'customer', isActive: true });

    // New customers this month
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const newCustomers = await User.countDocuments({
      role: 'customer',
      createdAt: { $gte: startOfMonth },
    });

    // Top customers by orders
    const topCustomers = await Order.aggregate([
      { $match: { isPaid: true } },
      {
        $group: {
          _id: '$user',
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: '$totalPrice' },
        },
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'customer',
        },
      },
      { $unwind: '$customer' },
      {
        $project: {
          name: '$customer.name',
          email: '$customer.email',
          totalOrders: 1,
          totalSpent: 1,
        },
      },
    ]);

    // Customer retention (repeat customers)
    const repeatCustomers = await Order.aggregate([
      { $match: { isPaid: true } },
      { $group: { _id: '$user', orders: { $sum: 1 } } },
      { $match: { orders: { $gte: 2 } } },
      { $count: 'repeatCustomers' },
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalCustomers,
        newCustomers,
        repeatCustomers: repeatCustomers[0]?.repeatCustomers || 0,
        topCustomers,
      },
    });
  } catch (error) {
    console.error('Customer insights error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customer insights',
    });
  }
};

// @desc    Get revenue forecast
// @route   GET /api/v1/analytics/forecast
// @access  Private (Vendor/Admin)
exports.getRevenueForecast = async (req, res) => {
  try {
    const query = {};
    if (req.user.role === 'vendor') {
      query['orderItems.vendor'] = req.user.id;
    }

    // Get last 6 months data
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const historicalData = await Order.aggregate([
      {
        $match: {
          ...query,
          isPaid: true,
          createdAt: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          revenue: { $sum: '$totalPrice' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Simple linear forecast for next 3 months
    if (historicalData.length >= 3) {
      const revenues = historicalData.map(d => d.revenue);
      const avgGrowth = (revenues[revenues.length - 1] - revenues[0]) / revenues.length;
      
      const forecast = [];
      let lastRevenue = revenues[revenues.length - 1];
      
      for (let i = 1; i <= 3; i++) {
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + i);
        const monthStr = nextMonth.toISOString().substring(0, 7);
        
        lastRevenue += avgGrowth;
        forecast.push({
          _id: monthStr,
          projectedRevenue: Math.max(0, Math.round(lastRevenue)),
          confidence: Math.max(0.5, 0.9 - (i * 0.1)),
        });
      }

      res.status(200).json({
        success: true,
        data: {
          historical: historicalData,
          forecast,
        },
      });
    } else {
      res.status(200).json({
        success: true,
        message: 'Insufficient data for forecast. Need at least 3 months of data.',
        data: {
          historical: historicalData,
          forecast: [],
        },
      });
    }
  } catch (error) {
    console.error('Revenue forecast error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate revenue forecast',
    });
  }
};