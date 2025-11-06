import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import API from '../utils/api';
import { formatCurrency, calculateDiscount } from '../utils/helpers';
import { FaSearch, FaFilter, FaStar } from 'react-icons/fa';

const Products = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    category: searchParams.get('category') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    rating: searchParams.get('rating') || '',
    sort: searchParams.get('sort') || '-createdAt',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
  });
  const [showFilters, setShowFilters] = useState(false);

  const categories = [
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
  ];

  useEffect(() => {
    fetchProducts();
  }, [filters, pagination.page]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: 12,
        ...filters,
      };

      // Remove empty filters
      Object.keys(params).forEach(
        (key) => !params[key] && delete params[key]
      );

      const { data } = await API.get('/products', { params });
      setProducts(data.data);
      setPagination({
        page: data.currentPage,
        totalPages: data.totalPages,
        total: data.total,
      });
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (name, value) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
    
    // Update URL params
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(name, value);
    } else {
      newParams.delete(name);
    }
    setSearchParams(newParams);
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      category: '',
      minPrice: '',
      maxPrice: '',
      rating: '',
      sort: '-createdAt',
    });
    setSearchParams({});
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Products</h1>
          <p className="text-gray-600">
            {pagination.total} products found
          </p>
        </div>
        
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="md:hidden mt-4 flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg"
        >
          <FaFilter />
          <span>Filters</span>
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Filters Sidebar */}
        <div
          className={`${
            showFilters ? 'block' : 'hidden'
          } md:block w-full md:w-64 space-y-6`}
        >
          <div className="bg-white p-4 rounded-lg shadow">
            {/* Search */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Search</label>
              <div className="relative">
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  placeholder="Search products..."
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <FaSearch className="absolute right-3 top-3 text-gray-400" />
              </div>
            </div>

            {/* Category */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Category</label>
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Price Range */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Price Range</label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.minPrice}
                  onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                  className="w-1/2 px-3 py-2 border rounded-lg"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.maxPrice}
                  onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                  className="w-1/2 px-3 py-2 border rounded-lg"
                />
              </div>
            </div>

            {/* Rating */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Rating</label>
              <select
                value={filters.rating}
                onChange={(e) => handleFilterChange('rating', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Ratings</option>
                <option value="4">4★ & above</option>
                <option value="3">3★ & above</option>
                <option value="2">2★ & above</option>
              </select>
            </div>

            {/* Sort */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Sort By</label>
              <select
                value={filters.sort}
                onChange={(e) => handleFilterChange('sort', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="-createdAt">Newest</option>
                <option value="price">Price: Low to High</option>
                <option value="-price">Price: High to Low</option>
                <option value="-ratings.average">Top Rated</option>
                <option value="-sales">Most Popular</option>
              </select>
            </div>

            <button
              onClick={clearFilters}
              className="w-full bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Products Grid */}
        <div className="flex-1">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-gray-300 h-64 rounded-lg mb-4"></div>
                  <div className="bg-gray-300 h-4 rounded mb-2"></div>
                  <div className="bg-gray-300 h-4 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-xl text-gray-600">No products found</p>
              <button
                onClick={clearFilters}
                className="mt-4 text-blue-600 hover:underline"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => (
                  <Link
                    key={product._id}
                    to={`/products/${product._id}`}
                    className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow overflow-hidden"
                  >
                    <div className="relative">
                      <img
                        src={product.images[0]?.url || 'https://via.placeholder.com/300'}
                        alt={product.name}
                        className="w-full h-64 object-cover"
                      />
                      {product.compareAtPrice && product.compareAtPrice > product.price && (
                        <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-md text-sm font-bold">
                          {calculateDiscount(product.compareAtPrice, product.price)}% OFF
                        </div>
                      )}
                    </div>
                    
                    <div className="p-4">
                      <div className="flex items-center mb-2">
                        <div className="flex items-center text-yellow-500">
                          <FaStar />
                          <span className="ml-1 text-sm text-gray-600">
                            {product.ratings.average.toFixed(1)} ({product.ratings.count})
                          </span>
                        </div>
                      </div>
                      
                      <h3 className="font-semibold text-lg mb-2 line-clamp-2">
                        {product.name}
                      </h3>
                      
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                        {product.shortDescription || product.description}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-2xl font-bold text-blue-600">
                            {formatCurrency(product.price)}
                          </span>
                          {product.compareAtPrice && product.compareAtPrice > product.price && (
                            <span className="ml-2 text-sm text-gray-500 line-through">
                              {formatCurrency(product.compareAtPrice)}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {product.stock === 0 ? (
                        <div className="mt-2 text-red-500 text-sm font-semibold">
                          Out of Stock
                        </div>
                      ) : product.stock <= 10 && (
                        <div className="mt-2 text-orange-500 text-sm">
                          Only {product.stock} left!
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex justify-center mt-8 space-x-2">
                  <button
                    onClick={() =>
                      setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
                    }
                    disabled={pagination.page === 1}
                    className="px-4 py-2 bg-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-300"
                  >
                    Previous
                  </button>
                  
                  {[...Array(pagination.totalPages)].map((_, i) => (
                    <button
                      key={i + 1}
                      onClick={() =>
                        setPagination((prev) => ({ ...prev, page: i + 1 }))
                      }
                      className={`px-4 py-2 rounded-lg ${
                        pagination.page === i + 1
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 hover:bg-gray-300'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  
                  <button
                    onClick={() =>
                      setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
                    }
                    disabled={pagination.page === pagination.totalPages}
                    className="px-4 py-2 bg-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-300"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Products;