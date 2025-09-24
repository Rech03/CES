import './QuizTile.css';
import { useNavigate } from "react-router-dom";

function QuizTile({ 
  quizId,
  slideId, // Added for AI quiz tracking
  title = "Generated Quiz",
  duration = "15 min",
  totalQuestions = "5",
  dueDate = "Self-paced",
  status = "available", // available, completed, missed, locked
  courseCode = "default",
  topicName = "", // Added for better display
  difficulty = "Medium", // Easy, Medium, Hard
  attempts = "0/3", // current attempts / max attempts
  bestScore = null, // best score if completed
  isLive = false,
  canAccess = true, // Added for access control
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
    const diffLower = (difficulty || '').toLowerCase();
    if (diffLower.includes('easy')) return '#27AE60';
    if (diffLower.includes('medium')) return '#F39C12';
    if (diffLower.includes('hard')) return '#E74C3C';
    return '#95A5A6';
  };

  const handleStartQuiz = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!canAccess || status === 'locked') {
      return;
    }
    
    // Navigate to AI quiz taking page with proper data
    navigate('/QuizCountdownPage', {
      state: {
        quizId: quizId,
        slideId: slideId, // Include slide ID for AI quiz tracking
        quizTitle: title,
        quizDuration: duration,
        totalQuestions: totalQuestions,
        difficulty: difficulty,
        isLive: isLive,
        isRetake: status === 'completed',
        topicName: topicName,
        courseCode: courseCode
      }
    });
    
    // Call parent handler if provided
    if (onStartQuiz) {
      onStartQuiz();
    }
  };

  const handleViewResults = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Navigate to student analytics/results page
    navigate('/QuizAnalyticsPage', {
      state: {
        quizId: quizId,
        slideId: slideId,
        quizTitle: title,
        isStudent: true // Flag to show student view
      }
    });
    
    // Call parent handler if provided
    if (onViewResults) {
      onViewResults();
    }
  };

  const handleRetakeQuiz = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    navigate('/QuizCountdownPage', {
      state: {
        quizId: quizId,
        slideId: slideId,
        quizTitle: title,
        quizDuration: duration,
        totalQuestions: totalQuestions,
        difficulty: difficulty,
        isLive: isLive,
        isRetake: true,
        topicName: topicName,
        courseCode: courseCode
      }
    });
  };

  const handleTileClick = () => {
    if (onClick) {
      onClick();
    } else if (status === 'available' && canAccess) {
      handleStartQuiz({ preventDefault: () => {}, stopPropagation: () => {} });
    } else if (status === 'completed') {
      handleViewResults({ preventDefault: () => {}, stopPropagation: () => {} });
    }
  };

  const statusInfo = getStatusInfo(status);

  // Parse attempts safely
  let currentAttempts = 0;
  let maxAttempts = 3;
  
  try {
    const [current, max] = attempts.split('/').map(Number);
    currentAttempts = current || 0;
    maxAttempts = max || 3;
  } catch {
    // Use defaults
  }

  const canRetake = status === 'completed' && currentAttempts < maxAttempts && canAccess;

  // Create display title with topic if available
  const displayTitle = topicName && !title.includes(topicName) 
    ? `${title} - ${topicName}`
    : title;

  return (
    <div 
      className={`quiz-tile-container ${courseCode} ${status} ${!canAccess ? 'locked' : ''}`} 
      onClick={handleTileClick}
      style={{ 
        cursor: canAccess && (status === 'available' || status === 'completed') ? 'pointer' : 'default',
        opacity: canAccess ? 1 : 0.7 
      }}
    >
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
        <div className="quiz-title-text" title={displayTitle}>
          {displayTitle}
        </div>
      </div>

      {/* Student Performance Info */}
      {status === 'completed' && bestScore && (
        <div className="student-performance">
          <div className="best-score">Best: {bestScore}</div>
          <div className="attempts-info">Attempts: {attempts}</div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="quiz-actions">
        {status === 'available' && canAccess && (
          <button 
            className="action-btn start-btn"
            onClick={handleStartQuiz}
            style={{
              background: 'linear-gradient(135deg, #27AE60 0%, #2ECC71 100%)',
              color: 'white',
              border: 'none',
              padding: '10px 12px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: '600',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
          >
            {isLive ? 'Join Live Quiz' : 'Start Quiz'}
          </button>
        )}
        
        {status === 'completed' && (
          <div className="completed-actions" style={{ display: 'flex', gap: '8px', width: '100%' }}>
            <button 
              className="action-btn results-btn"
              onClick={handleViewResults}
              style={{
                flex: canRetake ? '1' : '1',
                background: 'linear-gradient(135deg, #3498DB 0%, #5DADE2 100%)',
                color: 'white',
                border: 'none',
                padding: '10px 8px',
                borderRadius: '6px',
                fontSize: '10px',
                fontWeight: '600',
                textTransform: 'uppercase',
                cursor: 'pointer'
              }}
            >
              View Results
            </button>
            {canRetake && (
              <button 
                className="action-btn retake-btn"
                onClick={handleRetakeQuiz}
                style={{
                  flex: '1',
                  background: 'linear-gradient(135deg, #F39C12 0%, #F8C471 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '10px 8px',
                  borderRadius: '6px',
                  fontSize: '9px',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  cursor: 'pointer'
                }}
              >
                Retake ({maxAttempts - currentAttempts})
              </button>
            )}
          </div>
        )}

        {status === 'missed' && (
          <button 
            className="action-btn missed-btn"
            disabled
            style={{
              background: 'linear-gradient(135deg, #E74C3C 0%, #EC7063 100%)',
              color: 'white',
              border: 'none',
              padding: '10px 12px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: '600',
              textTransform: 'uppercase',
              cursor: 'not-allowed',
              opacity: 0.8
            }}
          >
            Quiz Missed
          </button>
        )}

        {(status === 'locked' || !canAccess) && (
          <button 
            className="action-btn locked-btn"
            disabled
            style={{
              background: 'linear-gradient(135deg, #95A5A6 0%, #BDC3C7 100%)',
              color: 'white',
              border: 'none',
              padding: '10px 12px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: '600',
              textTransform: 'uppercase',
              cursor: 'not-allowed',
              opacity: 0.7
            }}
          >
            Not Available
          </button>
        )}
      </div>

      {/* Live Quiz Indicator */}
      {isLive && status === 'available' && canAccess && (
        <div 
          className="live-quiz-info"
          style={{
            position: 'absolute',
            bottom: '60px',
            left: '15px',
            right: '15px',
            background: 'rgba(231, 76, 60, 0.9)',
            color: 'white',
            padding: '6px 8px',
            borderRadius: '4px',
            fontSize: '10px',
            textAlign: 'center',
            fontWeight: '600',
            zIndex: 3
          }}
        >
          <div className="live-status">Quiz is Live!</div>
          <div className="join-prompt" style={{ fontSize: '9px', opacity: 0.9 }}>
            Click to join now
          </div>
        </div>
      )}


    </div>
  );
}

export default QuizTile;