// Emit real-time events to connected clients

const emitProductUpdate = (productId, product) => {
  if (global.io) {
    global.io.to(`product-${productId}`).emit('product-updated', product);
    global.io.to('products-list').emit('products-updated');
    console.log(`📡 Emitted product update: ${productId}`);
  }
};

const emitProductCreated = (product) => {
  if (global.io) {
    global.io.to('products-list').emit('product-created', product);
    console.log(`📡 Emitted product created: ${product._id}`);
  }
};

const emitProductDeleted = (productId) => {
  if (global.io) {
    global.io.to('products-list').emit('product-deleted', productId);
    console.log(`📡 Emitted product deleted: ${productId}`);
  }
};

const emitOrderUpdate = (orderId, order) => {
  if (global.io) {
    global.io.emit('order-updated', { orderId, order });
    console.log(`📡 Emitted order update: ${orderId}`);
  }
};

const emitInventoryUpdate = (productId, stock) => {
  if (global.io) {
    global.io.to(`product-${productId}`).emit('inventory-updated', { productId, stock });
    console.log(`📡 Emitted inventory update: ${productId}`);
  }
};

const emitReviewAdded = (productId, review) => {
  if (global.io) {
    global.io.to(`product-${productId}`).emit('review-added', review);
    console.log(`📡 Emitted review added: ${productId}`);
  }
};

module.exports = {
  emitProductUpdate,
  emitProductCreated,
  emitProductDeleted,
  emitOrderUpdate,
  emitInventoryUpdate,
  emitReviewAdded,
};