import { useState } from 'react';
import { startLiveQuiz, stopLiveQuiz, deleteQuiz } from '../../api/quizzes';
import './QuizTile.css';

function QuizTile({ 
  quiz, // Full quiz object from API
  onPublish,
  onEdit,
  onViewResults,
  onDelete,
  onClick,
  onStatusChange // Callback when quiz status changes
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Extract data from quiz object with fallbacks
  const {
    id,
    title = "Untitled Quiz",
    topic = {},
    total_points = 0,
    question_count = 0,
    created_at,
    is_live = false,
    is_graded = false,
    password_required = false,
    time_limit = null
  } = quiz || {};

  // Get course info from topic
  const courseCode = topic?.course?.code || "UNKNOWN";
  const courseName = topic?.course?.name || "Unknown Course";
  
  // Format dates
  const formatDate = (dateString) => {
    if (!dateString) return "No date";
    try {
      const date = new Date(dateString);
      return `Created: ${date.toLocaleDateString('en-GB', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
      })}`;
    } catch {
      return "Invalid date";
    }
  };

  // Determine quiz status
  const getQuizStatus = () => {
    if (is_live) return 'published';
    if (question_count === 0) return 'draft';
    return 'draft'; // Default to draft if not live
  };

  const status = getQuizStatus();

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

  // Handle publishing quiz (start live)
  const handlePublish = async () => {
    if (!id) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      // Start live quiz - you might want to prompt for password
      const payload = password_required ? { password: prompt('Enter quiz password:') || '' } : {};
      await startLiveQuiz(id, payload);
      
      if (onPublish) {
        await onPublish(quiz);
      }
      
      if (onStatusChange) {
        onStatusChange(id, 'published');
      }
      
    } catch (err) {
      console.error('Error publishing quiz:', err);
      const errorMessage = err.response?.data?.detail || 
                          err.response?.data?.message || 
                          'Failed to publish quiz';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle closing quiz (stop live)
  const handleClose = async () => {
    if (!id) return;
    
    if (!window.confirm('Are you sure you want to close this quiz? Students will no longer be able to take it.')) {
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      await stopLiveQuiz(id, {});
      
      if (onStatusChange) {
        onStatusChange(id, 'closed');
      }
      
    } catch (err) {
      console.error('Error closing quiz:', err);
      const errorMessage = err.response?.data?.detail || 
                          err.response?.data?.message || 
                          'Failed to close quiz';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle deleting quiz
  const handleDelete = async () => {
    if (!id) return;
    
    if (!window.confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) {
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      await deleteQuiz(id);
      
      if (onDelete) {
        await onDelete(quiz);
      }
      
    } catch (err) {
      console.error('Error deleting quiz:', err);
      const errorMessage = err.response?.data?.detail || 
                          err.response?.data?.message || 
                          'Failed to delete quiz';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`quiz-tile-container ${courseCode.toLowerCase()}`} onClick={onClick}>
      <div className="quiz-overlay"></div>
      
      {/* Status Badge */}
      <div className="quiz-status-badge" style={{ backgroundColor: statusInfo.color }}>
        <div className="quiz-status-text">{statusInfo.text}</div>
      </div>

      {/* Duration Badge */}
      <div className="quiz-duration-badge">
        <div className="quiz-duration-text">
          {time_limit ? `${time_limit} min` : 'No limit'}
        </div>
      </div>

      {/* Quiz Info */}
      <div className="quiz-info-section">
        <div className="quiz-creation-date">{formatDate(created_at)}</div>
        <div className="quiz-stats-mini">
          <span className="quiz-questions">{question_count} Questions</span>
          <span className="quiz-points">{total_points} Points</span>
          {password_required && <span className="quiz-protected">🔒 Protected</span>}
        </div>
      </div>

      {/* Title Container */}
      <div className="quiz-title-containerNew">
        <div className="quiz-title-text">{title}</div>
        <div className="quiz-course-info">{courseCode} - {topic?.name || 'No Topic'}</div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="quiz-error" style={{
          position: 'absolute',
          bottom: '80px',
          left: '16px',
          right: '16px',
          background: '#FF5252',
          color: 'white',
          padding: '8px',
          borderRadius: '4px',
          fontSize: '12px',
          zIndex: 10
        }}>
          {error}
        </div>
      )}

      {/* Action Buttons */}
      <div className="quiz-actions">
        {status === 'draft' && question_count > 0 && (
          <button 
            className="action-btn publish-btn"
            onClick={(e) => {
              e.stopPropagation();
              handlePublish();
            }}
            disabled={isLoading}
          >
            {isLoading ? 'Publishing...' : 'Publish'}
          </button>
        )}
        
        {status === 'published' && (
          <button 
            className="action-btn results-btn"
            onClick={(e) => {
              e.stopPropagation();
              onViewResults && onViewResults(quiz);
            }}
            disabled={isLoading}
          >
            Results
          </button>
        )}

        <button 
          className="action-btn edit-btn"
          onClick={(e) => {
            e.stopPropagation();
            onEdit && onEdit(quiz);
          }}
          disabled={isLoading}
        >
          Edit
        </button>

        {status === 'published' && (
          <button 
            className="action-btn close-btn"
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
            disabled={isLoading}
          >
            {isLoading ? 'Closing...' : 'Close'}
          </button>
        )}

        {status === 'draft' && (
          <button 
            className="action-btn delete-btn"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete();
            }}
            disabled={isLoading}
            style={{ backgroundColor: '#E74C3C' }}
          >
            {isLoading ? 'Deleting...' : 'Delete'}
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

export default QuizTile;