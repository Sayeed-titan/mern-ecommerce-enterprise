import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import API from '../utils/api';
import { toast } from 'react-toastify';
import { FaPlus, FaTrash, FaImage } from 'react-icons/fa';

const ProductForm = () => {
  const { id } = useParams(); // If id exists, we're editing
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    shortDescription: '',
    price: '',
    compareAtPrice: '',
    category: 'Electronics',
    stock: '',
    lowStockThreshold: 10,
    hasVariants: false,
    isFeatured: false,
  });

  const [variants, setVariants] = useState([]);

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
    if (id) {
      fetchProduct();
    }
  }, [id]);

  const fetchProduct = async () => {
    try {
      const { data } = await API.get(`/products/${id}`);
      const product = data.data;
      
      setFormData({
        name: product.name,
        description: product.description,
        shortDescription: product.shortDescription || '',
        price: product.price,
        compareAtPrice: product.compareAtPrice || '',
        category: product.category,
        stock: product.stock,
        lowStockThreshold: product.lowStockThreshold,
        hasVariants: product.hasVariants,
        isFeatured: product.isFeatured,
      });

      setExistingImages(product.images || []);
      
      if (product.variants && product.variants.length > 0) {
        setVariants(product.variants);
      }
    } catch (error) {
      toast.error('Failed to fetch product');
      navigate('/dashboard');
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    
    if (files.length + existingImages.length + imageFiles.length > 5) {
      toast.error('Maximum 5 images allowed');
      return;
    }

    setImageFiles([...imageFiles, ...files]);

    // Create previews
    const previews = files.map((file) => URL.createObjectURL(file));
    setImagePreviews([...imagePreviews, ...previews]);
  };

  const removeNewImage = (index) => {
    const newFiles = imageFiles.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    
    // Revoke URL to prevent memory leak
    URL.revokeObjectURL(imagePreviews[index]);
    
    setImageFiles(newFiles);
    setImagePreviews(newPreviews);
  };

  const removeExistingImage = (index) => {
    setExistingImages(existingImages.filter((_, i) => i !== index));
  };

  // Variant Management
  const addVariant = () => {
    setVariants([
      ...variants,
      {
        name: '',
        sku: `SKU-${Date.now()}`,
        price: formData.price,
        stock: 0,
        attributes: { size: '', color: '' },
      },
    ]);
  };

  const updateVariant = (index, field, value) => {
    const newVariants = [...variants];
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      newVariants[index][parent][child] = value;
    } else {
      newVariants[index][field] = value;
    }
    setVariants(newVariants);
  };

  const removeVariant = (index) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formDataToSend = new FormData();

      // Add text fields
      Object.keys(formData).forEach((key) => {
        if (key === 'hasVariants' || key === 'isFeatured') {
          formDataToSend.append(key, formData[key]);
        } else if (formData[key]) {
          formDataToSend.append(key, formData[key]);
        }
      });

      // Add new images
      imageFiles.forEach((file) => {
        formDataToSend.append('images', file);
      });

      // If editing and keeping some existing images
      if (id && existingImages.length > 0) {
        formDataToSend.append('existingImages', JSON.stringify(existingImages));
      }

      // Add variants if applicable
      if (formData.hasVariants && variants.length > 0) {
        formDataToSend.append('variants', JSON.stringify(variants));
      }

      let response;
      if (id) {
        // Update existing product
        response = await API.put(`/products/${id}`, formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Product updated successfully');
      } else {
        // Create new product
        response = await API.post('/products', formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Product created successfully');
      }

      navigate(`/products/${response.data.data._id}`);
    } catch (error) {
      console.error('Submit error:', error);
      toast.error(error.response?.data?.message || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">
        {id ? 'Edit Product' : 'Add New Product'}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Product Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Wireless Bluetooth Headphones"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Short Description
              </label>
              <input
                type="text"
                name="shortDescription"
                value={formData.shortDescription}
                onChange={handleChange}
                maxLength="200"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Brief product summary (max 200 chars)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Full Description *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                rows="5"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Detailed product description..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Category *
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="isFeatured"
                    checked={formData.isFeatured}
                    onChange={handleChange}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium">Featured Product</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Pricing</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Price * ($)
              </label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                required
                step="0.01"
                min="0"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="29.99"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Compare at Price ($)
              </label>
              <input
                type="number"
                name="compareAtPrice"
                value={formData.compareAtPrice}
                onChange={handleChange}
                step="0.01"
                min="0"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="49.99"
              />
              <p className="text-xs text-gray-500 mt-1">
                Original price for showing discounts
              </p>
            </div>
          </div>
        </div>

        {/* Inventory */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Inventory</h2>
          
          <div className="mb-4">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                name="hasVariants"
                checked={formData.hasVariants}
                onChange={handleChange}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium">
                This product has variants (size, color, etc.)
              </span>
            </label>
          </div>

          {!formData.hasVariants ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Stock Quantity *
                </label>
                <input
                  type="number"
                  name="stock"
                  value={formData.stock}
                  onChange={handleChange}
                  required={!formData.hasVariants}
                  min="0"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Low Stock Alert Threshold
                </label>
                <input
                  type="number"
                  name="lowStockThreshold"
                  value={formData.lowStockThreshold}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium">Product Variants</h3>
                <button
                  type="button"
                  onClick={addVariant}
                  className="flex items-center space-x-1 bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-sm"
                >
                  <FaPlus />
                  <span>Add Variant</span>
                </button>
              </div>

              <div className="space-y-3">
                {variants.map((variant, index) => (
                  <div
                    key={index}
                    className="border rounded-lg p-4 relative"
                  >
                    <button
                      type="button"
                      onClick={() => removeVariant(index)}
                      className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                    >
                      <FaTrash />
                    </button>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium mb-1">
                          Variant Name
                        </label>
                        <input
                          type="text"
                          value={variant.name}
                          onChange={(e) =>
                            updateVariant(index, 'name', e.target.value)
                          }
                          className="w-full px-2 py-1 text-sm border rounded"
                          placeholder="e.g., Large Red"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium mb-1">
                          SKU
                        </label>
                        <input
                          type="text"
                          value={variant.sku}
                          onChange={(e) =>
                            updateVariant(index, 'sku', e.target.value)
                          }
                          className="w-full px-2 py-1 text-sm border rounded"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium mb-1">
                          Size
                        </label>
                        <input
                          type="text"
                          value={variant.attributes.size}
                          onChange={(e) =>
                            updateVariant(index, 'attributes.size', e.target.value)
                          }
                          className="w-full px-2 py-1 text-sm border rounded"
                          placeholder="S, M, L, XL"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium mb-1">
                          Color
                        </label>
                        <input
                          type="text"
                          value={variant.attributes.color}
                          onChange={(e) =>
                            updateVariant(index, 'attributes.color', e.target.value)
                          }
                          className="w-full px-2 py-1 text-sm border rounded"
                          placeholder="Red, Blue, etc."
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium mb-1">
                          Price ($)
                        </label>
                        <input
                          type="number"
                          value={variant.price}
                          onChange={(e) =>
                            updateVariant(index, 'price', parseFloat(e.target.value))
                          }
                          step="0.01"
                          className="w-full px-2 py-1 text-sm border rounded"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium mb-1">
                          Stock
                        </label>
                        <input
                          type="number"
                          value={variant.stock}
                          onChange={(e) =>
                            updateVariant(index, 'stock', parseInt(e.target.value))
                          }
                          min="0"
                          className="w-full px-2 py-1 text-sm border rounded"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {variants.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No variants added. Click "Add Variant" to create one.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Images */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Product Images</h2>
          
          {/* Existing Images */}
          {existingImages.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium mb-2">Current Images</h3>
              <div className="grid grid-cols-5 gap-3">
                {existingImages.map((image, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={image.url}
                      alt={`Product ${index + 1}`}
                      className="w-full h-24 object-cover rounded border"
                    />
                    <button
                      type="button"
                      onClick={() => removeExistingImage(index)}
                      className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition"
                    >
                      <FaTrash className="text-xs" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New Image Previews */}
          {imagePreviews.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium mb-2">New Images</h3>
              <div className="grid grid-cols-5 gap-3">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-24 object-cover rounded border"
                    />
                    <button
                      type="button"
                      onClick={() => removeNewImage(index)}
                      className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition"
                    >
                      <FaTrash className="text-xs" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload Button */}
          {existingImages.length + imageFiles.length < 5 && (
            <div>
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition">
                <FaImage className="text-4xl text-gray-400 mb-2" />
                <span className="text-sm text-gray-600">
                  Click to upload images (max 5)
                </span>
                <span className="text-xs text-gray-500">
                  PNG, JPG, WebP up to 5MB
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            </div>
          )}
        </div>

        {/* Submit Buttons */}
        <div className="flex space-x-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50"
          >
            {loading ? 'Saving...' : id ? 'Update Product' : 'Create Product'}
          </button>

          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-8 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProductForm;