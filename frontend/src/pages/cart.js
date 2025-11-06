import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { formatCurrency } from '../utils/helpers';
import { FaTrash, FaMinus, FaPlus } from 'react-icons/fa';

const Cart = () => {
  const { cartItems, removeFromCart, updateQuantity, subtotal, tax, shipping, total } = useCart();
  const navigate = useNavigate();

  if (cartItems.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Your Cart is Empty</h1>
          <p className="text-gray-600 mb-8">Add some products to get started!</p>
          <Link
            to="/products"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 inline-block"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {cartItems.map((item) => (
            <div
              key={`${item.product._id}-${JSON.stringify(item.variant)}`}
              className="bg-white rounded-lg shadow p-4 flex flex-col sm:flex-row gap-4"
            >
              {/* Image */}
              <Link
                to={`/products/${item.product._id}`}
                className="w-full sm:w-32 h-32 flex-shrink-0"
              >
                <img
                  src={item.product.images[0]?.url || 'https://via.placeholder.com/150'}
                  alt={item.product.name}
                  className="w-full h-full object-cover rounded-lg"
                />
              </Link>

              {/* Details */}
              <div className="flex-grow">
                <Link
                  to={`/products/${item.product._id}`}
                  className="text-lg font-semibold hover:text-blue-600"
                >
                  {item.product.name}
                </Link>

                {item.variant && (
                  <div className="text-sm text-gray-600 mt-1">
                    {item.variant.attributes.size && `Size: ${item.variant.attributes.size}`}
                    {item.variant.attributes.color && ` | Color: ${item.variant.attributes.color}`}
                  </div>
                )}

                <div className="text-xl font-bold text-blue-600 mt-2">
                  {formatCurrency(item.price)}
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center space-x-4 mt-4">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() =>
                        updateQuantity(
                          item.product._id,
                          item.quantity - 1,
                          item.variant
                        )
                      }
                      className="p-2 bg-gray-200 rounded hover:bg-gray-300"
                    >
                      <FaMinus className="text-sm" />
                    </button>
                    
                    <span className="w-12 text-center font-semibold">
                      {item.quantity}
                    </span>
                    
                    <button
                      onClick={() =>
                        updateQuantity(
                          item.product._id,
                          item.quantity + 1,
                          item.variant
                        )
                      }
                      className="p-2 bg-gray-200 rounded hover:bg-gray-300"
                    >
                      <FaPlus className="text-sm" />
                    </button>
                  </div>

                  <button
                    onClick={() => removeFromCart(item.product._id, item.variant)}
                    className="text-red-500 hover:text-red-700 flex items-center space-x-1"
                  >
                    <FaTrash />
                    <span>Remove</span>
                  </button>
                </div>
              </div>

              {/* Subtotal */}
              <div className="text-right">
                <div className="text-lg font-bold">
                  {formatCurrency(item.price * item.quantity)}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6 sticky top-4">
            <h2 className="text-xl font-bold mb-4">Order Summary</h2>

            <div className="space-y-3 mb-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-semibold">{formatCurrency(subtotal)}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">Tax (10%)</span>
                <span className="font-semibold">{formatCurrency(tax)}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">Shipping</span>
                <span className="font-semibold">
                  {shipping === 0 ? 'FREE' : formatCurrency(shipping)}
                </span>
              </div>

              {subtotal < 50 && (
                <div className="text-sm text-green-600">
                  Add {formatCurrency(50 - subtotal)} more for FREE shipping!
                </div>
              )}

              <div className="border-t pt-3 flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-blue-600">{formatCurrency(total)}</span>
              </div>
            </div>

            <button
              onClick={() => navigate('/checkout')}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-semibold"
            >
              Proceed to Checkout
            </button>

            <Link
              to="/products"
              className="block text-center mt-4 text-blue-600 hover:underline"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;