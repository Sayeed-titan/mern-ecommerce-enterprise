const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const path = require('path');

/**
 * Export orders to CSV format
 * @param {Array} orders - Array of order objects
 * @param {String} filename - Output filename
 * @returns {Promise<String>} - Path to generated CSV file
 */
const exportOrdersToCSV = async (orders, filename) => {
  const outputPath = path.join(__dirname, '../uploads', filename);

  const csvWriter = createCsvWriter({
    path: outputPath,
    header: [
      { id: 'orderNumber', title: 'Order Number' },
      { id: 'invoiceNumber', title: 'Invoice Number' },
      { id: 'customerName', title: 'Customer Name' },
      { id: 'customerEmail', title: 'Customer Email' },
      { id: 'status', title: 'Status' },
      { id: 'paymentMethod', title: 'Payment Method' },
      { id: 'isPaid', title: 'Payment Status' },
      { id: 'items', title: 'Items' },
      { id: 'subtotal', title: 'Subtotal' },
      { id: 'tax', title: 'Tax' },
      { id: 'shipping', title: 'Shipping' },
      { id: 'discount', title: 'Discount' },
      { id: 'totalPrice', title: 'Total' },
      { id: 'shippingAddress', title: 'Shipping Address' },
      { id: 'createdAt', title: 'Order Date' },
    ],
  });

  const records = orders.map(order => {
    // Format items list
    const items = order.orderItems
      .map(item => `${item.name} (Qty: ${item.quantity} @ ${item.price.toFixed(2)})`)
      .join('; ');

    // Format address
    const shippingAddress = `${order.shippingAddress.street}, ${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.zipCode}, ${order.shippingAddress.country}`;

    return {
      orderNumber: order.orderNumber,
      invoiceNumber: order.invoiceNumber || order.orderNumber,
      customerName: order.user?.name || 'N/A',
      customerEmail: order.user?.email || 'N/A',
      status: order.status,
      paymentMethod: order.paymentMethod,
      isPaid: order.isPaid ? 'Paid' : 'Pending',
      items: items,
      subtotal: `${order.itemsPrice.toFixed(2)}`,
      tax: `${order.taxPrice.toFixed(2)}`,
      shipping: `${order.shippingPrice.toFixed(2)}`,
      discount: `${(order.discountAmount || 0).toFixed(2)}`,
      totalPrice: `${order.totalPrice.toFixed(2)}`,
      shippingAddress: shippingAddress,
      createdAt: new Date(order.createdAt).toLocaleDateString(),
    };
  });

  await csvWriter.writeRecords(records);
  return outputPath;
};

/**
 * Export a single order to CSV
 * @param {Object} order - Order object
 * @param {String} filename - Output filename
 * @returns {Promise<String>} - Path to generated CSV file
 */
const exportSingleOrderToCSV = (order, filename) => {
  return exportOrdersToCSV([order], filename);
};

// Export products to CSV
const exportProductsToCSV = async (products, filename) => {
  const outputPath = path.join(__dirname, '../uploads', filename);

  const csvWriter = createCsvWriter({
    path: outputPath,
    header: [
      { id: 'name', title: 'Product Name' },
      { id: 'category', title: 'Category' },
      { id: 'price', title: 'Price' },
      { id: 'stock', title: 'Stock' },
      { id: 'sales', title: 'Sales' },
      { id: 'rating', title: 'Rating' },
      { id: 'vendor', title: 'Vendor' },
      { id: 'createdAt', title: 'Created Date' },
    ],
  });

  const records = products.map(product => ({
    name: product.name,
    category: product.category,
    price: `${product.price.toFixed(2)}`,
    stock: product.hasVariants ? product.totalStock : product.stock,
    sales: product.sales,
    rating: product.ratings.average.toFixed(1),
    vendor: product.vendor?.name || product.vendor?.storeName || 'N/A',
    createdAt: new Date(product.createdAt).toLocaleDateString(),
  }));

  await csvWriter.writeRecords(records);
  return outputPath;
};

// Export analytics to CSV
const exportAnalyticsToCSV = async (data, filename, type = 'sales') => {
  const outputPath = path.join(__dirname, '../uploads', filename);

  let header, records;

  if (type === 'sales') {
    header = [
      { id: 'period', title: 'Period' },
      { id: 'revenue', title: 'Revenue' },
      { id: 'orders', title: 'Orders' },
      { id: 'avgOrder', title: 'Avg Order Value' },
    ];

    records = data.map(item => ({
      period: item._id,
      revenue: `${item.totalRevenue?.toFixed(2) || 0}`,
      orders: item.orderCount || 0,
      avgOrder: `${item.avgOrderValue?.toFixed(2) || 0}`,
    }));
  } else if (type === 'products') {
    header = [
      { id: 'name', title: 'Product' },
      { id: 'sales', title: 'Sales' },
      { id: 'revenue', title: 'Revenue' },
      { id: 'views', title: 'Views' },
    ];

    records = data.map(item => ({
      name: item.name,
      sales: item.sales,
      revenue: `${(item.sales * item.price).toFixed(2)}`,
      views: item.views,
    }));
  }

  const csvWriter = createCsvWriter({ path: outputPath, header });
  await csvWriter.writeRecords(records);
  return outputPath;
};

module.exports = {
  exportOrdersToCSV,
  exportSingleOrderToCSV,
  exportProductsToCSV,
  exportAnalyticsToCSV,
};