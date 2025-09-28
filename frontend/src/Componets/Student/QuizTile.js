import './QuizTile.css';
import { useNavigate } from "react-router-dom";

function QuizTile({
  quizId,
  slideId,
  title = "Quiz",
  duration = "15 min",
  totalQuestions = "5",
  dueDate = "Self-paced",
  status = "available", // available, completed, missed, locked
  courseCode = "default",
  topicName = "",
  difficulty = "Medium", // Easy, Medium, Hard
  attempts = "0/3",      // "current/max"
  bestScore = null,
  isLive = false,
  canAccess = true,
  onStartQuiz,
  onViewResults,
  onClick
}) {
  const navigate = useNavigate();

  const getStatusInfo = (status) => {
    switch (status) {
      case 'available':
        return { text: isLive ? 'Live' : 'Available', color: isLive ? '#E74C3C' : '#27AE60' };
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

  // Parse attempts safely
  let currentAttempts = 0;
  let maxAttempts = 3;
  try {
    const [cur, max] = String(attempts).split('/').map(Number);
    currentAttempts = Number.isFinite(cur) ? cur : 0;
    maxAttempts = Number.isFinite(max) ? max : 3;
  } catch { /* ignore */ }

  const attemptCapReached = currentAttempts >= maxAttempts;

  const handleStartQuiz = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!canAccess || status === 'locked' || attemptCapReached) {
      // If attempt cap reached, take the student to results instead
      if (attemptCapReached) {
        navigate('/QuizAnalyticsPage', {
          state: { quizId, slideId, quizTitle: title, isStudent: true }
        });
      }
      return;
    }

    navigate('/QuizCountdownPage', {
      state: {
        quizId,
        slideId,
        quizTitle: title,
        quizDuration: duration,
        totalQuestions,
        difficulty,
        isLive,
        isRetake: status === 'completed',
        topicName,
        courseCode
      }
    });

    onStartQuiz?.();
  };

  const handleViewResults = (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigate('/QuizAnalyticsPage', {
      state: { quizId, slideId, quizTitle: title, isStudent: true }
    });
    onViewResults?.();
  };

  const handleRetakeQuiz = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (attemptCapReached) return;

    navigate('/QuizCountdownPage', {
      state: {
        quizId,
        slideId,
        quizTitle: title,
        quizDuration: duration,
        totalQuestions,
        difficulty,
        isLive,
        isRetake: true,
        topicName,
        courseCode
      }
    });
  };

  const handleTileClick = () => {
    if (onClick) {
      onClick();
      return;
    }
    if (status === 'available' && canAccess) {
      handleStartQuiz({ preventDefault: () => {}, stopPropagation: () => {} });
    } else if (status === 'completed') {
      handleViewResults({ preventDefault: () => {}, stopPropagation: () => {} });
    }
  };

  const statusInfo = getStatusInfo(status);

  // Title + topic display
  const displayTitle = topicName && !title.includes(topicName)
    ? `${title} - ${topicName}`
    : title;

  const canRetake = status === 'completed' && !attemptCapReached && canAccess;

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

      {/* Info */}
      <div className="quiz-info-section">
        <div className="quiz-due-date">{dueDate}</div>
        <div className="quiz-stats-mini">
          <span className="quiz-questions">{totalQuestions} Questions</span>
          <span className="quiz-duration-info">{duration}</span>
        </div>
      </div>

      {/* Title */}
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

      {/* Actions */}
      <div className="quiz-actions">
        {status === 'available' && canAccess && (
          <button
            className="action-btn start-btn"
            onClick={handleStartQuiz}
            disabled={attemptCapReached}
            style={{
              background: 'linear-gradient(135deg, #27AE60 0%, #2ECC71 100%)',
              color: 'white',
              border: 'none',
              padding: '10px 12px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: '600',
              textTransform: 'uppercase',
              cursor: attemptCapReached ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              opacity: attemptCapReached ? 0.6 : 1
            }}
            title={attemptCapReached ? 'Attempt limit reached' : 'Start Quiz'}
          >
            {isLive ? 'Join Live Quiz' : attemptCapReached ? 'Limit Reached' : 'Start Quiz'}
          </button>
        )}

        {status === 'completed' && (
          <div className="completed-actions" style={{ display: 'flex', gap: '8px', width: '100%' }}>
  
            <button
              className="action-btn retake-btn"
              onClick={handleRetakeQuiz}
              disabled={!canRetake}
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
                cursor: canRetake ? 'pointer' : 'not-allowed',
                opacity: canRetake ? 1 : 0.6
              }}
              title={!canRetake ? 'Attempt limit reached' : 'Retake'}
            >
              {canRetake ? `Retake (${maxAttempts - currentAttempts})` : 'Limit Reached'}
            </button>
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

      {/* Live indicator */}
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
