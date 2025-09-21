import './QuizTile.css';
import { useNavigate } from "react-router-dom";

function QuizTile({ 
  quizId,
  title = "CSC3002F - Parallel Programming Quiz",
  duration = "15 min",
  totalQuestions = "20",
  dueDate = "Due: 25 Mar 2025",
  status = "available", // available, completed, missed, locked
  courseCode = "csc3002f",
  difficulty = "Medium", // Easy, Medium, Hard
  attempts = "0/3", // current attempts / max attempts
  bestScore = null, // best score if completed
  isLive = false,
  password = null,
  onStartQuiz,
  onViewResults,
  onClick
}) {
  const navigate = useNavigate();

  const getStatusInfo = (status) => {
    switch(status) {
      case 'available': 
        return { text: isLive ? 'Live Quiz' : 'Available', color: isLive ? '#E74C3C' : '#27AE60' };
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

  const handleStartQuiz = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Navigate to countdown page with quiz data
    navigate('/QuizCountdownPage', {
      state: {
        quizId: quizId,
        quizTitle: title,
        quizDuration: duration,
        totalQuestions: totalQuestions,
        difficulty: difficulty,
        isLive: isLive,
        password: password,
        isRetake: status === 'completed'
      }
    });
  };

  const handleViewResults = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Navigate to analytics page for this specific quiz
    navigate('/QuizAnalyticsPage', {
      state: {
        quizId: quizId,
        quizTitle: title
      }
    });
  };

  const handleRetakeQuiz = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    navigate('/QuizCountdownPage', {
      state: {
        quizId: quizId,
        quizTitle: title,
        quizDuration: duration,
        totalQuestions: totalQuestions,
        difficulty: difficulty,
        isLive: isLive,
        password: password,
        isRetake: true
      }
    });
  };

  const statusInfo = getStatusInfo(status);

  // Check if retakes are available
  const [currentAttempts, maxAttempts] = attempts.split('/').map(Number);
  const canRetake = status === 'completed' && currentAttempts < maxAttempts;

  return (
    <div className={`quiz-tile-container ${courseCode}`} onClick={onClick}>
      <div className="quiz-overlay"></div>
      
      {/* Status Badge */}
      <div className="quiz-status-badge" style={{ backgroundColor: statusInfo.color }}>
        <div className="quiz-status-text">{statusInfo.text}</div>
        {isLive && (
          <div className="live-indicator">
            <span className="live-dot"></span>
            LIVE
          </div>
        )}
      </div>

      {/* Quiz Info */}
      <div className="quiz-info-section">
        <div className="quiz-due-date">{dueDate}</div>
        <div className="quiz-stats-mini">
          <span className="quiz-questions">{totalQuestions} Questions</span>
          <span className="quiz-duration-info">{duration}</span>
          <span 
            className="quiz-difficulty" 
            style={{ color: getDifficultyColor(difficulty) }}
          >
            {difficulty}
          </span>
        </div>
      </div>

      {/* Title Container */}
      <div className="quiz-title-containerNew">
        <div className="quiz-title-text">{title}</div>
      </div>

      {/* Student Performance Info */}
      {status === 'completed' && bestScore && (
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
            onClick={handleStartQuiz}
          >
            <div className='Start'>
              {isLive ? 'Join Live Quiz' : 'Start Quiz'}
            </div>
          </button>
        )}
        
        {status === 'completed' && (
          <div className="completed-actions">
            <button 
              className="action-btn results-btn"
              onClick={handleViewResults}
            >
              View Results
            </button>
            {canRetake && (
              <button 
                className="action-btn retake-btn"
                onClick={handleRetakeQuiz}
              >
                Retake ({maxAttempts - currentAttempts} left)
              </button>
            )}
          </div>
        )}

        {status === 'missed' && (
          <button 
            className="action-btn missed-btn"
            disabled
          >
            Quiz Missed
          </button>
        )}

        {status === 'locked' && (
          <button 
            className="action-btn locked-btn"
            disabled
          >
            Not Available Yet
          </button>
        )}
      </div>

      {/* Live Quiz Timer (if applicable) */}
      {isLive && status === 'available' && (
        <div className="live-quiz-info">
          <div className="live-status">Quiz is currently live!</div>
          <div className="join-prompt">Click to join now</div>
        </div>
      )}
    </div>
  );
}

export default QuizTile;