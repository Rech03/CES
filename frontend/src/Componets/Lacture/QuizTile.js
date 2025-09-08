import './QuizTile.css';

function QuizTile({ 
<<<<<<< HEAD
  title = "CSC3002F- Parallel Programming",
  duration = "15 min",
  backgroundImage = "/quiz-background.jpg",
  onClick
}) {
  return (
    <div className="quiz-tile-container" onClick={onClick}>
      
=======
  title = "CSC3002F - Parallel Programming",
  duration = "15 min",
  totalQuestions = "20",
  createdDate = "Created: 20 Mar 2025",
  status = "draft", // draft, published, closed
  courseCode = "csc3002f",
  studentCount = "0/400", // enrolled/total
  backgroundImage = "/quiz-background.jpg",
  onPublish,
  onEdit,
  onViewResults,
  onClick
}) {

  const getStatusInfo = (status) => {
    switch(status) {
      case 'draft': 
        return { text: 'Draft', color: '#95A5A6' };
      case 'published': 
        return { text: 'Live', color: '#27AE60' };
      case 'closed': 
        return { text: 'Closed', color: '#E74C3C' };
      default: 
        return { text: 'Unknown', color: '#95A5A6' };
    }
  };

  const statusInfo = getStatusInfo(status);

  return (
    <div className={`quiz-tile-container ${courseCode}`} onClick={onClick}>
      <div className="quiz-overlay"></div>
      
      {/* Status Badge */}
      <div className="quiz-status-badge" style={{ backgroundColor: statusInfo.color }}>
        <div className="quiz-status-text">{statusInfo.text}</div>
      </div>

>>>>>>> c1fa26119bd1f3c9749e0cacdd5b0e743963735b
      {/* Duration Badge */}
      <div className="quiz-duration-badge">
        <div className="quiz-duration-text">{duration}</div>
      </div>
<<<<<<< HEAD
      
      {/* Title Container */}
      <div className="quiz-title-container">
        <div className="quiz-title-text">{title}</div>
      </div>
=======

      {/* Quiz Info */}
      <div className="quiz-info-section">
        <div className="quiz-creation-date">{createdDate}</div>
        <div className="quiz-stats-mini">
          <span className="quiz-questions">{totalQuestions} Questions</span>
          <span className="quiz-students">{studentCount} Students</span>
        </div>
      </div>

      {/* Title Container */}
      <div className="quiz-title-containerNew">
        <div className="quiz-title-text">{title}</div>
      </div>

      {/* Action Buttons */}
      <div className="quiz-actions">
        {status === 'draft' && (
          <button 
            className="action-btn publish-btn"
            onClick={(e) => {
              e.stopPropagation();
              onPublish && onPublish();
            }}
          >
            Publish
          </button>
        )}
        
        {status === 'published' && (
          <button 
            className="action-btn results-btn"
            onClick={(e) => {
              e.stopPropagation();
              onViewResults && onViewResults();
            }}
          >
            Results
          </button>
        )}

        <button 
          className="action-btn edit-btn"
          onClick={(e) => {
            e.stopPropagation();
            onEdit && onEdit();
          }}
        >
          Edit
        </button>

        {status === 'published' && (
          <button 
            className="action-btn close-btn"
            onClick={(e) => {
              e.stopPropagation();
              // Handle close quiz functionality
            }}
          >
            Close
          </button>
        )}
      </div>
>>>>>>> c1fa26119bd1f3c9749e0cacdd5b0e743963735b
    </div>
  );
}

export default QuizTile;