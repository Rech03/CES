import { useState } from 'react';
import './StarRating.css';

function StarRating({ 
  initialRating = 0, 
  maxRating = 5, 
  showLabel = true, 
  showViewAll = true, 
  size = 'default',
  interactive = false,
  onRatingChange = null,
  disabled = false
}) {
  const [rating, setRating] = useState(initialRating);
  const [hoveredRating, setHoveredRating] = useState(0);

  const handleStarClick = (starIndex) => {
    if (!interactive || disabled) return;
    
    const newRating = starIndex + 1;
    setRating(newRating);
    
    if (onRatingChange) {
      onRatingChange(newRating);
    }
  };

  const handleStarHover = (starIndex) => {
    if (!interactive || disabled) return;
    setHoveredRating(starIndex + 1);
  };

  const handleMouseLeave = () => {
    if (!interactive || disabled) return;
    setHoveredRating(0);
  };

  const renderStars = () => {
    const stars = [];
    const displayRating = hoveredRating || rating;
    
    for (let i = 0; i < maxRating; i++) {
      const isFilled = i < displayRating;
      const isHovered = hoveredRating > 0 && i < hoveredRating;
      
      stars.push(
        <div 
          key={i} 
          className={`star-container ${interactive ? 'interactive' : ''}`}
          onClick={() => handleStarClick(i)}
          onMouseEnter={() => handleStarHover(i)}
        >
          <svg 
            className={`star-icon ${isFilled ? 'filled' : 'empty'} ${isHovered ? 'hovered' : ''} ${disabled ? 'disabled' : ''}`}
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path 
              d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" 
              stroke="currentColor" 
              strokeWidth="1" 
              strokeLinejoin="round"
            />
          </svg>
        </div>
      );
    }
    return stars;
  };

  return (
    <div className={`rating-component ${size} ${interactive ? 'interactive' : ''}`}>
      {showLabel && (
        <div className="rating-header">
          <div className="rating-label">
            {interactive ? 'Rate this' : 'Average Rating'}
            {interactive && rating > 0 && (
              <span className="rating-value"> ({rating}/{maxRating})</span>
            )}
          </div>
          {showViewAll && !interactive && <div className="view-all">View All</div>}
        </div>
      )}
      
      <div 
        className="stars-container"
        onMouseLeave={handleMouseLeave}
      >
        {renderStars()}
      </div>
      
      {interactive && rating > 0 && (
        <div className="rating-text">
          {rating === 1 && "Poor"}
          {rating === 2 && "Fair"}
          {rating === 3 && "Good"}
          {rating === 4 && "Very Good"}
          {rating === 5 && "Excellent"}
        </div>
      )}
    </div>
  );
}

export default StarRating;