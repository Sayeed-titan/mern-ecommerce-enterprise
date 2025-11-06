import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import API from '../utils/api';
import { formatCurrency, formatDate, getStatusColor } from '../utils/helpers';

const OrderDetails = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const fetchOrder = async () => {
    try {
      const { data } = await API.get(`/orders/${id}`);
      setOrder(data.data);
    } catch (error) {
      console.error('Error fetching order:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Order not found</h1>
        <Link to="/orders" className="text-blue-600 hover:underline">
          Back to orders
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link to="/orders" className="text-blue-600 hover:underline mb-4 inline-block">
          ← Back to orders
        </Link>
        <h1 className="text-3xl font-bold">Order Details</h1>
      </div>

      {/* Order Info */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold mb-2">Order Information</h3>
            <p className="text-sm text-gray-600">Order ID: {order.orderNumber}</p>
            <p className="text-sm text-gray-600">Date: {formatDate(order.createdAt)}</p>
            <p className="mt-2">
              <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(order.status)}`}>
                {order.status}
              </span>
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Shipping Address</h3>
            <p className="text-sm text-gray-600">{order.shippingAddress.street}</p>
            <p className="text-sm text-gray-600">
              {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}
            </p>
            <p className="text-sm text-gray-600">{order.shippingAddress.country}</p>
          </div>
        </div>
      </div>

      {/* Order Items */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="font-semibold mb-4">Order Items</h3>
        <div className="space-y-4">
          {order.orderItems.map((item, idx) => (
            <div key={idx} className="flex items-center space-x-4 border-b pb-4">
              <img
                src={item.image || 'https://via.placeholder.com/80'}
                alt={item.name}
                className="w-20 h-20 object-cover rounded"
              />
              <div className="flex-grow">
                <Link
                  to={`/products/${item.product}`}
                  className="font-medium hover:text-blue-600"
                >
                  {item.name}
                </Link>
                <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                {item.variant && (
                  <p className="text-xs text-gray-500">
                    {item.variant.attributes.size && `Size: ${item.variant.attributes.size}`}
                    {item.variant.attributes.color && ` | Color: ${item.variant.attributes.color}`}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="font-semibold">{formatCurrency(item.price * item.quantity)}</p>
                <p className="text-sm text-gray-600">{formatCurrency(item.price)} each</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Order Summary */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="font-semibold mb-4">Order Summary</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Subtotal</span>
            <span>{formatCurrency(order.itemsPrice)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Tax</span>
            <span>{formatCurrency(order.taxPrice)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Shipping</span>
            <span>{formatCurrency(order.shippingPrice)}</span>
          </div>
          {order.discountAmount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Discount</span>
              <span>-{formatCurrency(order.discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold border-t pt-2">
            <span>Total</span>
            <span className="text-blue-600">{formatCurrency(order.totalPrice)}</span>
          </div>
        </div>

        {order.isPaid && (
          <div className="mt-6">
            <a
              href={`${process.env.REACT_APP_API_URL}/orders/${order._id}/invoice`}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
            >
              Download Invoice
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderDetails;