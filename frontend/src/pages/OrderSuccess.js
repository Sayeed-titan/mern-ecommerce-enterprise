import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import API from '../utils/api';
import { formatCurrency } from '../utils/helpers';
import { FaCheckCircle, FaDownload } from 'react-icons/fa';
import { toast } from 'react-toastify';

const OrderSuccess = () => {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      const { data } = await API.get(`/orders/${orderId}`);
      setOrder(data.data);
    } catch (error) {
      console.error('Error fetching order:', error);
      toast.error('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const downloadInvoice = async () => {
    setDownloadingInvoice(true);
    try {
      // Request the invoice PDF from backend
      const response = await API.get(`/orders/${orderId}/invoice`, {
        responseType: 'blob', // Important for file download
        timeout: 30000, // 30 second timeout for PDF generation
      });

      // Create a blob URL and trigger download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${order?.orderNumber || orderId}.pdf`;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Invoice downloaded successfully!');
    } catch (error) {
      console.error('Error downloading invoice:', error);
      toast.error('Failed to download invoice. Please try again.');
    } finally {
      setDownloadingInvoice(false);
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
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-xl text-gray-600 mb-4">Order not found</p>
        <Link to="/orders" className="text-blue-600 hover:underline">
          View all orders
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      {/* Success Animation */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-24 h-24 bg-green-100 rounded-full mb-4 animate-bounce">
          <FaCheckCircle className="text-6xl text-green-500" />
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Order Placed Successfully!
        </h1>
        
        <p className="text-gray-600 mb-4">
          Thank you for your purchase. Your order is being processed.
        </p>

        {/* Shipping GIF */}
        <div className="my-8">
          <img
            src="https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExbTBocjJ0cGk5ZWNxOGswdW5wZWt6YmtmZ3VqMGo2MzR1ZGRhODFsZSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o7TKP9ln2Dr6ze6f6/giphy.gif"
            alt="Shipping truck"
            className="w-48 h-48 mx-auto"
          />
          <p className="text-lg font-semibold text-gray-700 mt-4">
            Your order will be shipped soon!
          </p>
        </div>
      </div>

      {/* Order Details */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Order Details</h2>
        
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Order Number:</span>
            <span className="font-semibold">{order.orderNumber}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600">Order Date:</span>
            <span className="font-semibold">
              {new Date(order.createdAt).toLocaleDateString()}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600">Total Amount:</span>
            <span className="font-semibold text-blue-600 text-lg">
              {formatCurrency(order.totalPrice)}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600">Status:</span>
            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-semibold">
              {order.status.toUpperCase()}
            </span>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t">
          <h3 className="font-semibold mb-2">Shipping Address:</h3>
          <p className="text-sm text-gray-600">
            {order.shippingAddress.street}<br />
            {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}<br />
            {order.shippingAddress.country}
          </p>
        </div>

        <div className="mt-6 pt-6 border-t">
          <h3 className="font-semibold mb-3">Order Items:</h3>
          <div className="space-y-3">
            {order.orderItems.map((item, idx) => (
              <div key={idx} className="flex items-center space-x-3">
                <img
                  src={item.image || 'https://via.placeholder.com/50'}
                  alt={item.name}
                  className="w-16 h-16 object-cover rounded"
                />
                <div className="flex-1">
                  <p className="font-medium text-sm">{item.name}</p>
                  <p className="text-xs text-gray-600">Qty: {item.quantity}</p>
                </div>
                <p className="font-semibold text-sm">
                  {formatCurrency(item.price * item.quantity)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Price Breakdown */}
        <div className="mt-6 pt-6 border-t">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal:</span>
              <span>{formatCurrency(order.itemsPrice)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Tax:</span>
              <span>{formatCurrency(order.taxPrice)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Shipping:</span>
              <span>{order.shippingPrice === 0 ? 'FREE' : formatCurrency(order.shippingPrice)}</span>
            </div>
            {order.discountAmount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount:</span>
                <span>-{formatCurrency(order.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg pt-2 border-t">
              <span>Total:</span>
              <span className="text-blue-600">{formatCurrency(order.totalPrice)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Support */}
      <div className="bg-blue-50 rounded-lg p-6 mb-6">
        <h3 className="font-semibold text-blue-900 mb-2">Need Help?</h3>
        <p className="text-sm text-blue-700 mb-3">
          If you have any questions about your order, please contact our customer support:
        </p>
        <p className="text-sm font-semibold text-blue-900">
          📧 Email: support@ecommerce.com<br />
          📞 Phone: (555) 123-4567<br />
          ⏰ Hours: Mon-Fri 9AM-6PM EST
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={downloadInvoice}
          disabled={downloadingInvoice}
          className="flex-1 flex items-center justify-center space-x-2 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {downloadingInvoice ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>Downloading...</span>
            </>
          ) : (
            <>
              <FaDownload />
              <span>Download Invoice</span>
            </>
          )}
        </button>
        
        <Link
          to="/orders"
          className="flex-1 text-center bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 font-semibold transition-all"
        >
          View All Orders
        </Link>
        
        <Link
          to="/products"
          className="flex-1 text-center border-2 border-blue-600 text-blue-600 py-3 rounded-lg hover:bg-blue-50 font-semibold transition-all"
        >
          Continue Shopping
        </Link>
      </div>

      {/* Email Notification */}
      <div className="text-center mt-8">
        <p className="text-sm text-gray-600">
          📧 A confirmation email has been sent to your registered email address.
        </p>
      </div>
    </div>
  );
};

export default OrderSuccess;