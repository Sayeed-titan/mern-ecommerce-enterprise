import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../utils/api';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, calculateDiscount } from '../utils/helpers';
import { FaStar, FaHeart, FaShoppingCart } from 'react-icons/fa';
import { toast } from 'react-toastify';

const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewLoading, setReviewLoading] = useState(false);

  useEffect(() => {
    fetchProduct();
    fetchReviews();
  }, [id]);

  const fetchProduct = async () => {
    try {
      const { data } = await API.get(`/products/${id}`);
      setProduct(data.data);
      if (data.data.variants && data.data.variants.length > 0) {
        setSelectedVariant(data.data.variants[0]);
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      toast.error('Product not found');
      navigate('/products');
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    setReviewLoading(true);
    try {
      const { data } = await API.get(`/reviews/product/${id}`);
      setReviews(data.data);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setReviewLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (!isAuthenticated) {
      toast.info('Please login to add items to cart');
      navigate('/login');
      return;
    }

    const availableStock = selectedVariant?.stock || product.stock;
    if (availableStock < quantity) {
      toast.error('Not enough stock available');
      return;
    }

    addToCart(product, quantity, selectedVariant);
  };

  const handleAddToWishlist = async () => {
    if (!isAuthenticated) {
      toast.info('Please login to add to wishlist');
      navigate('/login');
      return;
    }

    try {
      await API.post(`/wishlist/${product._id}`);
      toast.success('Added to wishlist');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add to wishlist');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!product) {
    return null;
  }

  const currentPrice = selectedVariant?.price || product.price;
  const availableStock = selectedVariant?.stock || product.stock;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Images */}
        <div>
          <div className="mb-4">
            <img
              src={product.images[selectedImage]?.url || 'https://via.placeholder.com/500'}
              alt={product.name}
              className="w-full h-96 object-cover rounded-lg"
            />
          </div>
          
          <div className="grid grid-cols-4 gap-2">
            {product.images.map((image, index) => (
              <img
                key={index}
                src={image.url}
                alt={`${product.name} ${index + 1}`}
                onClick={() => setSelectedImage(index)}
                className={`w-full h-24 object-cover rounded-lg cursor-pointer border-2 ${
                  selectedImage === index ? 'border-blue-600' : 'border-gray-200'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Details */}
        <div>
          <h1 className="text-3xl font-bold mb-4">{product.name}</h1>
          
          <div className="flex items-center mb-4">
            <div className="flex items-center text-yellow-500 mr-4">
              {[...Array(5)].map((_, i) => (
                <FaStar
                  key={i}
                  className={i < Math.round(product.ratings.average) ? '' : 'text-gray-300'}
                />
              ))}
              <span className="ml-2 text-gray-600">
                {product.ratings.average.toFixed(1)} ({product.ratings.count} reviews)
              </span>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex items-center space-x-4">
              <span className="text-4xl font-bold text-blue-600">
                {formatCurrency(currentPrice)}
              </span>
              {product.compareAtPrice && product.compareAtPrice > currentPrice && (
                <>
                  <span className="text-2xl text-gray-500 line-through">
                    {formatCurrency(product.compareAtPrice)}
                  </span>
                  <span className="bg-red-500 text-white px-3 py-1 rounded-md font-bold">
                    {calculateDiscount(product.compareAtPrice, currentPrice)}% OFF
                  </span>
                </>
              )}
            </div>
          </div>

          <p className="text-gray-700 mb-6">{product.description}</p>

          {/* Variants */}
          {product.variants && product.variants.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold mb-3">Select Variant:</h3>
              <div className="grid grid-cols-2 gap-3">
                {product.variants.map((variant) => (
                  <button
                    key={variant._id}
                    onClick={() => setSelectedVariant(variant)}
                    disabled={variant.stock === 0}
                    className={`p-3 border-2 rounded-lg text-left ${
                      selectedVariant?._id === variant._id
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-300'
                    } ${variant.stock === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-400'}`}
                  >
                    <div className="font-medium">
                      {variant.attributes.size && `Size: ${variant.attributes.size}`}
                      {variant.attributes.color && ` - ${variant.attributes.color}`}
                    </div>
                    <div className="text-sm text-gray-600">
                      {formatCurrency(variant.price)} - Stock: {variant.stock}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Stock Status */}
          <div className="mb-6">
            {availableStock === 0 ? (
              <div className="text-red-500 font-semibold">Out of Stock</div>
            ) : availableStock <= 10 ? (
              <div className="text-orange-500 font-semibold">
                Only {availableStock} left in stock!
              </div>
            ) : (
              <div className="text-green-500 font-semibold">In Stock</div>
            )}
          </div>

          {/* Quantity */}
          <div className="mb-6">
            <label className="block font-semibold mb-2">Quantity:</label>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                -
              </button>
              <span className="text-xl font-semibold">{quantity}</span>
              <button
                onClick={() => setQuantity(Math.min(availableStock, quantity + 1))}
                disabled={quantity >= availableStock}
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50"
              >
                +
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-4">
            <button
              onClick={handleAddToCart}
              disabled={availableStock === 0}
              className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              <FaShoppingCart />
              <span>Add to Cart</span>
            </button>
            
            <button
              onClick={handleAddToWishlist}
              className="px-6 py-3 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 flex items-center justify-center"
            >
              <FaHeart />
            </button>
          </div>

          {/* Additional Info */}
          <div className="mt-8 border-t pt-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-semibold">Category:</span>
                <span className="ml-2">{product.category}</span>
              </div>
              <div>
                <span className="font-semibold">SKU:</span>
                <span className="ml-2">{product._id.slice(-8)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-6">Customer Reviews</h2>
        
        {reviewLoading ? (
          <div className="text-center py-8">Loading reviews...</div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-8 text-gray-600">
            No reviews yet. Be the first to review!
          </div>
        ) : (
          <div className="space-y-6">
            {reviews.map((review) => (
              <div key={review._id} className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center mb-3">
                  <div className="flex items-center text-yellow-500 mr-4">
                    {[...Array(5)].map((_, i) => (
                      <FaStar
                        key={i}
                        className={i < review.rating ? '' : 'text-gray-300'}
                      />
                    ))}
                  </div>
                  <span className="font-semibold">{review.user.name}</span>
                  {review.isVerified && (
                    <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      Verified Purchase
                    </span>
                  )}
                </div>
                <p className="text-gray-700">{review.comment}</p>
                <p className="text-sm text-gray-500 mt-2">
                  {new Date(review.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductDetails;