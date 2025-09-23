import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './QuizTile.css';

function PastQuizTile({ 
  attempt, 
  onRetake,
  onViewDetails,
  onClick,
  isAIQuiz = false // Flag to distinguish AI quizzes
}) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  // Extract data from attempt object with fallbacks
  const {
    id,
    quiz = {},
    score = 0,
    total_possible_score = 0,
    is_completed = false,
    started_at,
    completed_at,
    attempt_count = 1,
    percentage = 0
  } = attempt || {};

  const {
    title = "Untitled Quiz",
    topic = {},
    total_questions = 0,
    difficulty = "medium"
  } = quiz;

  // Get course info from topic
  const courseCode = topic?.course?.code || "UNKNOWN";
  const courseName = topic?.course?.name || "Unknown Course";
  const topicName = topic?.name || "Unknown Topic";
  
  // Format dates
  const formatDate = (dateString) => {
    if (!dateString) return "No date";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return "Invalid date";
    }
  };

  // Calculate percentage if not provided
  const getPercentage = () => {
    if (percentage) return percentage;
    if (total_possible_score > 0) {
      return Math.round((score / total_possible_score) * 100);
    }
    return 0;
  };

  // Get grade based on percentage
  const getGrade = (percent) => {
    if (percent >= 80) return { grade: 'A', color: '#10B981' };
    if (percent >= 70) return { grade: 'B', color: '#F59E0B' };
    if (percent >= 60) return { grade: 'C', color: '#EF4444' };
    if (percent >= 50) return { grade: 'D', color: '#DC2626' };
    return { grade: 'F', color: '#991B1B' };
  };

  // Get difficulty color
  const getDifficultyColor = (diff) => {
    const d = (diff || '').toLowerCase();
    if (d.includes('easy')) return '#22c55e';
    if (d.includes('medium')) return '#f59e0b';
    if (d.includes('hard')) return '#ef4444';
    return '#64748b';
  };

  const percent = getPercentage();
  const gradeInfo = getGrade(percent);
  const attemptDate = completed_at || started_at;

  // Handle click to view analytics
  const handleClick = () => {
    if (onClick) {
      onClick(attempt);
    } else {
      // Navigate to quiz analytics page
      navigate(`/quiz-analytics/${quiz.id}`);
    }
  };

  // Handle retake action
  const handleRetake = (e) => {
    e.stopPropagation();
    if (onRetake) {
      onRetake(quiz);
    } else if (isAIQuiz) {
      navigate(`/take-ai-quiz/${quiz.id}`);
    } else {
      navigate(`/take-quiz/${quiz.id}`);
    }
  };

  // Handle view details
  const handleViewDetails = (e) => {
    e.stopPropagation();
    if (onViewDetails) {
      onViewDetails(attempt);
    } else {
      navigate(`/quiz-analytics/${quiz.id}`);
    }
  };

  return (
    <div 
      className={`quiz-tile-container ${courseCode.toLowerCase()} ${isAIQuiz ? 'ai-quiz' : ''}`} 
      onClick={handleClick}
      style={{ cursor: 'pointer' }}
    >
      <div className="quiz-overlay"></div>
      
      {/* AI Quiz Badge */}
      {isAIQuiz && (
        <div className="ai-quiz-badge" style={{
          position: 'absolute',
          top: '8px',
          left: '8px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '12px',
          fontSize: '10px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          zIndex: 5
        }}>
          🤖 AI Generated
        </div>
      )}

      {/* Status Badge */}
      <div 
        className="quiz-status-badge" 
        style={{ 
          backgroundColor: is_completed ? '#27AE60' : '#F39C12',
          top: isAIQuiz ? '32px' : '8px'
        }}
      >
        <div className="quiz-status-text">
          {is_completed ? 'Completed' : 'In Progress'}
        </div>
      </div>

      {/* Grade Badge */}
      {is_completed && (
        <div 
          className="grade-badge" 
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            backgroundColor: gradeInfo.color,
            color: 'white',
            padding: '8px 12px',
            borderRadius: '20px',
            fontSize: '16px',
            fontWeight: 'bold',
            zIndex: 5
          }}
        >
          {gradeInfo.grade}
        </div>
      )}

      {/* Quiz Info */}
      <div className="quiz-info-section" style={{ top: isAIQuiz ? '60px' : '40px' }}>
        <div className="quiz-creation-date">
          {is_completed ? `Completed: ${formatDate(attemptDate)}` : `Started: ${formatDate(attemptDate)}`}
        </div>
        <div className="quiz-stats-mini">
          <span className="quiz-questions">{total_questions} Questions</span>
          {is_completed && (
            <>
              <span className="quiz-score">{score}/{total_possible_score} ({percent}%)</span>
              {attempt_count > 1 && (
                <span className="attempt-count">Attempt #{attempt_count}</span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Title Container */}
      <div className="quiz-title-containerNew">
        <div className="quiz-title-text">{title}</div>
        <div className="quiz-course-info">{courseCode} - {topicName}</div>
      </div>

      {/* Difficulty Badge (for AI quizzes) */}
      {isAIQuiz && difficulty && (
        <div style={{
          position: 'absolute',
          bottom: '80px',
          right: '16px',
          background: getDifficultyColor(difficulty),
          color: 'white',
          padding: '4px 8px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: '600'
        }}>
          {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
        </div>
      )}

      {/* Progress Bar (for incomplete attempts) */}
      {!is_completed && (
        <div style={{
          position: 'absolute',
          bottom: '50px',
          left: '16px',
          right: '16px',
          background: 'rgba(255,255,255,0.3)',
          borderRadius: '10px',
          height: '6px',
          overflow: 'hidden'
        }}>
          <div style={{
            background: '#1976D2',
            height: '100%',
            width: `${percent}%`,
            borderRadius: '10px',
            transition: 'width 0.3s ease'
          }}></div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="quiz-actions">
        <button 
          className="action-btn results-btn"
          onClick={handleViewDetails}
          disabled={isLoading}
          style={{ backgroundColor: '#1976D2' }}
        >
          View Analytics
        </button>

        {is_completed && (
          <button 
            className="action-btn retake-btn"
            onClick={handleRetake}
            disabled={isLoading}
            style={{ backgroundColor: '#27AE60' }}
          >
            Retake Quiz
          </button>
        )}

        {!is_completed && (
          <button 
            className="action-btn continue-btn"
            onClick={handleRetake}
            disabled={isLoading}
            style={{ backgroundColor: '#F39C12' }}
          >
            Continue Quiz
          </button>
        )}
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(255,255,255,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 20
        }}>
          <div>Loading...</div>
        </div>
      )}
    </div>
  );
}

export default PastQuizTile;