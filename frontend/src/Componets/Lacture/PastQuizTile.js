import { NavLink } from 'react-router-dom';
import './PastQuizTile.css';


function PastQuizTile({ 
  title = "CSC3002F - Parallel Programming",
  createdDate = "Created: 15 Mar 2025",
  openedDate = "Opened: 18 Mar 2025",
  dueDate = "Due: 25 Mar 2025",
  status = "completed", // completed, missed, pending
  score = "85%",
  attempts = "2",
  duration = "15 min",
  totalQuestions = "20",
  courseCode = "csc3002f", // for color theming
  backgroundImage = "/quiz-background.jpg",
  onClick
}) {
  
  const getStatusText = (status) => {
    switch(status) {
      case 'completed': return 'Completed';
      case 'missed': return 'Missed';
      case 'pending': return 'Pending';
      default: return 'Unknown';
    }
  };

  return (
    <div className={`quiz-tile-container ${courseCode}`} onClick={onClick}>
      <NavLink to="/QuizzAnalytics">
            
          
      <div className="quiz-overlay"></div>
      
      {/* Status Badge */}
      <div className={`quiz-status-badge ${status}`}>
        <div className="quiz-status-text">{getStatusText(status)}</div>
      </div>

      {/* Score Display */}
      {status === 'completed' && (
        <div className="quiz-score">
          <div className="quiz-score-text">{score}</div>
        </div>
      )}

      {/* Title */}
      <div className="quiz-title-container">
        <div className="quiz-title-text">{title}</div>
      </div>

      {/* Quiz Details */}
      <div className="quiz-details">
        <div className="quiz-dates">
          <div className="quiz-date-item">
            <div className="quiz-date-icon"></div>
            <div className="quiz-date-text">{createdDate}</div>
          </div>
          <div className="quiz-date-item">
            <div className="quiz-date-icon"></div>
            <div className="quiz-date-text">{openedDate}</div>
          </div>
          <div className="quiz-date-item">
            <div className="quiz-date-icon"></div>
            <div className="quiz-date-text">{dueDate}</div>
          </div>
        </div>

        {/* Quiz Stats */}
        <div className="quiz-stats">
          <div className="quiz-stat-item">
            <div className="quiz-stat-value">{attempts}</div>
            <div className="quiz-stat-label">Attempts</div>
          </div>
          <div className="quiz-stat-item">
            <div className="quiz-stat-value">{duration}</div>
            <div className="quiz-stat-label">Duration</div>
          </div>
          <div className="quiz-stat-item">
            <div className="quiz-stat-value">{totalQuestions}</div>
            <div className="quiz-stat-label">Questions</div>
          </div>
        </div>
      </div>
      </NavLink>
    </div>
  );
}

export default PastQuizTile;