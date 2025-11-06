import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../utils/api';
import { formatCurrency } from '../utils/helpers';
import { FaBox, FaDollarSign, FaShoppingBag, FaUsers } from 'react-icons/fa';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const { data } = await API.get('/analytics/dashboard');
      setStats(data.data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
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

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">
        Welcome, {user?.name}!
      </h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {user?.role !== 'customer' && (
          <>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Total Revenue</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(stats?.revenue?.total || 0)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    This month: {formatCurrency(stats?.revenue?.monthly || 0)}
                  </p>
                </div>
                <FaDollarSign className="text-4xl text-blue-600 opacity-20" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Total Orders</p>
                  <p className="text-2xl font-bold text-green-600">
                    {stats?.revenue?.orders || 0}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Pending: {stats?.orders?.pending || 0}
                  </p>
                </div>
                <FaShoppingBag className="text-4xl text-green-600 opacity-20" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Total Products</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {stats?.products?.total || 0}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Low stock: {stats?.products?.lowStock || 0}
                  </p>
                </div>
                <FaBox className="text-4xl text-purple-600 opacity-20" />
              </div>
            </div>

            {user?.role === 'admin' && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Total Customers</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {stats?.customers || 0}
                    </p>
                  </div>
                  <FaUsers className="text-4xl text-orange-600 opacity-20" />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Link
          to="/orders"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition"
        >
          <h3 className="font-semibold text-lg mb-2">My Orders</h3>
          <p className="text-gray-600 text-sm">View and track your orders</p>
        </Link>

        <Link
          to="/wishlist"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition"
        >
          <h3 className="font-semibold text-lg mb-2">Wishlist</h3>
          <p className="text-gray-600 text-sm">View saved products</p>
        </Link>

        <Link
          to="/profile"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition"
        >
          <h3 className="font-semibold text-lg mb-2">Profile Settings</h3>
          <p className="text-gray-600 text-sm">Update your information</p>
        </Link>

        {(user?.role === 'vendor' || user?.role === 'admin') && (
          <Link
            to="/products/new"
            className="bg-blue-600 text-white rounded-lg shadow p-6 hover:bg-blue-700 transition"
          >
            <h3 className="font-semibold text-lg mb-2">Add Product</h3>
            <p className="text-blue-100 text-sm">Create a new product</p>
          </Link>
        )}
      </div>

      {/* Recent Orders */}
      {stats?.orders?.recent && stats.orders.recent.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Recent Orders</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3">Order ID</th>
                  <th className="text-left py-3">Customer</th>
                  <th className="text-left py-3">Total</th>
                  <th className="text-left py-3">Status</th>
                  <th className="text-left py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {stats.orders.recent.map((order) => (
                  <tr key={order._id} className="border-b">
                    <td className="py-3">
                      <Link to={`/orders/${order._id}`} className="text-blue-600 hover:underline">
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="py-3">{order.user?.name}</td>
                    <td className="py-3">{formatCurrency(order.totalPrice)}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded text-sm ${
                        order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                        order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="py-3">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;