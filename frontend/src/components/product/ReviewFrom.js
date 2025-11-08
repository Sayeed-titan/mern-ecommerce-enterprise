import React, { useState } from 'react';
import { FaStar } from 'react-icons/fa';
import API from '../../utils/api';
import { toast } from 'react-toastify';

const ReviewForm = ({ productId, onReviewAdded }) => {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    if (!comment.trim()) {
      toast.error('Please write a review');
      return;
    }

    setLoading(true);

    try {
      await API.post('/reviews', {
        product: productId,
        rating,
        comment,
      });

      toast.success('Review submitted successfully!');
      setRating(0);
      setComment('');
      
      if (onReviewAdded) {
        onReviewAdded();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit review');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-xl font-semibold mb-4">Write a Review</h3>
      
      <form onSubmit={handleSubmit}>
        {/* Star Rating */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Your Rating *</label>
          <div className="flex space-x-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHover(star)}
                onMouseLeave={() => setHover(0)}
                className="focus:outline-none transition-transform hover:scale-110"
              >
                <FaStar
                  size={32}
                  className={
                    star <= (hover || rating)
                      ? 'text-yellow-400'
                      : 'text-gray-300'
                  }
                />
              </button>
            ))}
            {rating > 0 && (
              <span className="ml-4 text-gray-600 self-center">
                {rating} {rating === 1 ? 'star' : 'stars'}
              </span>
            )}
          </div>
        </div>

        {/* Review Comment */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Your Review *
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows="4"
            maxLength="500"
            placeholder="Share your experience with this product..."
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            {comment.length}/500 characters
          </p>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50"
        >
          {loading ? 'Submitting...' : 'Submit Review'}
        </button>
      </form>
    </div>
  );
};

export default ReviewForm;