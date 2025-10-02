import './QuizTile.css';
import { useNavigate } from "react-router-dom";

function QuizTile({
  quizId,
  slideId,
  title = "Quiz",
  duration = "15 min",
  totalQuestions = "5",
  dueDate = "Self-paced",
  status = "available",
  courseCode = "default",
  topicName = "",
  difficulty = "Medium",
  attemptsUsed = 0,
  retakesLeft = 3,
  attemptsDisplay = "0/3 attempts",
  bestScore = null,
  bestScoreValue = 0,
  isLive = false,
  canAccess = true,
  accessReason = "",
  hasExhaustedAttempts = false,
  onStartQuiz,
  onClick
}) {
  const navigate = useNavigate();

  const getStatusInfo = (status) => {
    switch (status) {
      case 'available':
        return { text: isLive ? 'Live' : 'Available', color: isLive ? '#E74C3C' : '#27AE60' };
      case 'in_progress':
        return { text: 'In Progress', color: '#3498DB' };
      case 'completed':
        return { text: 'Completed', color: '#27AE60' };
      case 'locked':
        return { text: 'Locked', color: '#95A5A6' };
      default:
        return { text: 'Unknown', color: '#95A5A6' };
    }
  };

  const handleStartQuiz = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();

    if (!canAccess || status === 'locked') return;

    navigate('/QuizCountdownPage', {
      state: {
        quizId,
        slideId,
        quizTitle: title,
        quizDuration: duration,
        totalQuestions,
        difficulty,
        isLive,
        isRetake: attemptsUsed > 0,
        topicName,
        courseCode
      }
    });

    onStartQuiz?.();
  };

  // Tile click behavior: always start/retake the quiz
  const handleTileClick = () => {
    if (onClick) {
      onClick();
      return;
    }
    if (canAccess && status !== 'locked') {
      handleStartQuiz();
    }
  };

  const getDifficultyColor = (difficulty) => {
    const diffLower = (difficulty || '').toLowerCase();
    if (diffLower.includes('easy')) return '#27AE60';
    if (diffLower.includes('medium')) return '#F39C12';
    if (diffLower.includes('hard')) return '#E74C3C';
    return '#95A5A6';
  };

  const statusInfo = getStatusInfo(status);

  return (
    <div
      className={`quiz-tile-container ${courseCode} ${status} ${!canAccess ? 'locked' : ''}`}
      onClick={handleTileClick}
      style={{
        cursor: canAccess && status !== 'locked' ? 'pointer' : 'default',
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
        <div className="quiz-title-text" title={title}>
          {title}
        </div>
      </div>

      {/* Performance Info - after first attempt */}
      {attemptsUsed > 0 && canAccess && (
        <div
          className="student-performance"
          style={{
            position: 'absolute',
            bottom: '65px',
            left: '15px',
            right: '15px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '11px',
            padding: '8px 10px',
            background: 'rgba(255, 255, 255, 0.9)',
            borderRadius: '6px',
            border: '1px solid #E0E0E0'
          }}
        >
          {bestScore && (
            <div
              style={{
                fontWeight: '600',
                color: bestScoreValue > 50 ? '#27AE60' : '#E74C3C',
                fontSize: '12px'
              }}
            >
              Best: {bestScore}
            </div>
          )}
          <div style={{ color: '#666', fontSize: '11px' }}>
            Attempts: {attemptsUsed}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="quiz-actions">
        {canAccess && status !== 'locked' && (
          <button
            className="action-btn start-btn"
            onClick={handleStartQuiz}
            style={{
              background: attemptsUsed > 0 
                ? 'linear-gradient(135deg, #3498DB 0%, #5DADE2 100%)'
                : 'linear-gradient(135deg, #27AE60 0%, #2ECC71 100%)',
              color: 'white',
              border: 'none',
              padding: '10px 12px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: '600',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              width: '100%'
            }}
          >
            {attemptsUsed > 0 ? 'Retake Quiz' : 'Start Quiz'}
          </button>
        )}

        {(status === 'locked' || !canAccess) && (
          <button
            className="action-btn locked-btn"
            disabled
            title={accessReason}
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
              opacity: 0.7,
              width: '100%'
            }}
          >
            Not Available
          </button>
        )}
      </div>
    </div>
  );
}

export default QuizTile;