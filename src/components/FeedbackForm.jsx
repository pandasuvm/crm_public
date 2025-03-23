import { useState } from "react";
import { recordFeedback } from "../functions/feedbackFunctions";
import { toast } from "react-toastify";

const FeedbackForm = ({ userId, onFeedbackSubmitted }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (rating === 0) {
      toast.warning("Please select a rating");
      return;
    }
    
    setLoading(true);
    
    try {
      await recordFeedback(userId, {
        score: rating,
        comments: comment
      });
      
      toast.success("Thank you for your feedback!");
      setRating(0);
      setComment("");
      
      if (onFeedbackSubmitted) {
        onFeedbackSubmitted();
      }
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast.error("Failed to submit feedback. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <h3 className="text-xl font-semibold text-gray-800 mb-5">Share Your Feedback</h3>
      
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Rate your experience:
        </label>
        <div className="flex space-x-3 justify-center">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 transform ${
                (hoverRating || rating) >= star 
                  ? "bg-gradient-to-r from-yellow-400 to-yellow-500 text-white shadow-md scale-105" 
                  : "bg-gray-100 text-gray-400 hover:bg-gray-200"
              }`}
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                fill="currentColor" 
                className="w-6 h-6"
              >
                <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
              </svg>
            </button>
          ))}
        </div>
        <div className="text-center mt-2 text-sm text-gray-500">
          {rating > 0 && (
            <span className="font-medium">
              {rating === 1 && "Poor"}
              {rating === 2 && "Fair"}
              {rating === 3 && "Good"}
              {rating === 4 && "Very Good"}
              {rating === 5 && "Excellent"}
            </span>
          )}
        </div>
      </div>
      
      <div className="mb-6">
        <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
          Comments (optional):
        </label>
        <textarea
          id="comment"
          rows="4"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="w-full px-4 py-3 border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
          placeholder="Tell us what you think..."
        ></textarea>
      </div>
      
      <button
        type="submit"
        disabled={loading || rating === 0}
        className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-medium py-3 px-4 rounded-lg transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm hover:shadow flex items-center justify-center"
      >
        {loading ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Submitting...
          </>
        ) : (
          "Submit Feedback"
        )}
      </button>
    </form>
  );
};

export default FeedbackForm;
