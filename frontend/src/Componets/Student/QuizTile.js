import './QuizTile.css';
import { NavLink } from "react-router-dom";

function QuizTile({ 
  title = "CSC3002F - Parallel Programming Quiz",
  duration = "15 min",
  totalQuestions = "20",
  dueDate = "Due: 25 Mar 2025",
  status = "available", // available, completed, missed, locked
  courseCode = "csc3002f",
  difficulty = "Medium", // Easy, Medium, Hard
  attempts = "2/3", // current attempts / max attempts
  bestScore = "85%", // best score if completed
  backgroundImage = "/quiz-background.jpg",
  onStartQuiz,
  onViewResults,
  onClick
}) {

  const getStatusInfo = (status) => {
    switch(status) {
      case 'available': 
        return { text: 'Available', color: '#27AE60' };
      case 'completed': 
        return { text: 'Completed', color: '#3498DB' };
      case 'missed': 
        return { text: 'Missed', color: '#E74C3C' };
      case 'locked':
        return { text: 'Locked', color: '#95A5A6' };
      default: 
        return { text: 'Unknown', color: '#95A5A6' };
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch(difficulty) {
      case 'Easy': return '#27AE60';
      case 'Medium': return '#F39C12';
      case 'Hard': return '#E74C3C';
      default: return '#95A5A6';
    }
  };

  const statusInfo = getStatusInfo(status);

  return (
    <div>
       <NavLink to="/QuizCountdownPage">
      <div className={`quiz-tile-container ${courseCode}`} onClick={onClick}>
        <div className="quiz-overlay"></div>
        
        {/* Status Badge */}
        <div className="quiz-status-badge" style={{ backgroundColor: statusInfo.color }}>
          <div className="quiz-status-text">{statusInfo.text}</div>
        </div>

        {/* Quiz Info */}
        <div className="quiz-info-section">
          <div className="quiz-due-date">{dueDate}</div>
          <div className="quiz-stats-mini">
            <span className="quiz-questions">{totalQuestions} Questions</span>
            <span className="quiz-duration-info">{duration}</span>
          </div>
        </div>

        {/* Title Container */}
        <div className="quiz-title-containerNew">
          <div className="quiz-title-text">{title}</div>
        </div>

        {/* Student Performance Info */}
        {status === 'completed' && (
          <div className="student-performance">
            <div className="best-score">Best Score: {bestScore}</div>
            <div className="attempts-info">Attempts: {attempts}</div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="quiz-actions">
          {status === 'available' && (
            <button 
              className="action-btn start-btn"
              onClick={(e) => {
                e.stopPropagation();
                onStartQuiz && onStartQuiz();
              }}
            >
             
                   <div className='Start'>
                    Start Quiz  
                    </div>     
                
              
      
              
            </button>
          )}
          
          {status === 'completed' && (
            <>
              <button 
                className="action-btn results-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewResults && onViewResults();
                }}
              >
                View Results
              </button>
              {attempts.split('/')[0] < attempts.split('/')[1] && (
                <button 
                  className="action-btn retake-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStartQuiz && onStartQuiz();
                  }}
                >
                  Retake
                </button>
              )}
            </>
          )}

          {status === 'missed' && (
            <button 
              className="action-btn missed-btn"
              disabled
            >
              Missed
            </button>
          )}

          {status === 'locked' && (
            <button 
              className="action-btn locked-btn"
              disabled
            >
              Locked
            </button>
          )}
        </div>
      </div>
      </NavLink>
    </div>
  );
}

export default QuizTile;