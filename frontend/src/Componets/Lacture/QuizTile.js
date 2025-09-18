import { useState } from 'react';
import { startLiveQuiz, stopLiveQuiz, deleteQuiz } from '../../api/quizzes';
import './QuizTile.css';

function QuizTile({ 
  quiz,
  onPublish,
  onEdit,
  onViewResults,
  onDelete,
  onClick,
  onStatusChange
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const {
    id,
    title = "Untitled Quiz",
    topic = {},
    total_points = 0,
    questions_count = 0,
    created_at,
    is_live = false,
    is_graded = false,
    time_limit = null
  } = quiz || {};

  const courseCode = topic?.course?.code || "UNKNOWN";
  const topicName = topic?.name || "No Topic";

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

  const getQuizStatus = () => {
    if (is_live) return 'live';
    if (questions_count === 0) return 'draft';
    return 'ready'; // Has questions but not live yet
  };

  const status = getQuizStatus();

  const getStatusInfo = (status) => {
    switch(status) {
      case 'draft': 
        return { text: 'Draft', color: '#95A5A6' };
      case 'ready': 
        return { text: 'Ready', color: '#F39C12' };
      case 'live': 
        return { text: 'Live', color: '#27AE60' };
      case 'closed': 
        return { text: 'Closed', color: '#E74C3C' };
      default: 
        return { text: 'Unknown', color: '#95A5A6' };
    }
  };

  const statusInfo = getStatusInfo(status);

  const handleMakeLive = async () => {
    if (!id) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      // The backend expects { action: 'start', password: 'some_password' }
      const payload = { 
        action: 'start',
        password: `${courseCode}-${Date.now()}` 
      };
      
      await startLiveQuiz(id, payload);
      
      if (onPublish) {
        await onPublish(quiz);
      }
      
      if (onStatusChange) {
        onStatusChange(id, 'live');
      }
      
    } catch (err) {
      console.error('Error making quiz live:', err);
      console.error('Response data:', err.response?.data);
      
      let errorMessage = 'Failed to make quiz live';
      if (err.response?.data) {
        const data = err.response.data;
        if (typeof data === 'string') {
          errorMessage = data;
        } else if (data.detail) {
          errorMessage = data.detail;
        } else if (data.message) {
          errorMessage = data.message;
        } else if (data.error) {
          errorMessage = data.error;
        } else if (data.non_field_errors) {
          errorMessage = Array.isArray(data.non_field_errors) 
            ? data.non_field_errors[0] 
            : data.non_field_errors;
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseLive = async () => {
    if (!id) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      // The backend expects { action: 'stop' }
      const payload = { action: 'stop' };
      await stopLiveQuiz(id, payload);
      
      if (onStatusChange) {
        onStatusChange(id, 'closed');
      }
      
    } catch (err) {
      console.error('Error closing quiz:', err);
      console.error('Response data:', err.response?.data);
      
      let errorMessage = 'Failed to close quiz';
      if (err.response?.data) {
        const data = err.response.data;
        if (typeof data === 'string') {
          errorMessage = data;
        } else if (data.detail) {
          errorMessage = data.detail;
        } else if (data.message) {
          errorMessage = data.message;
        } else if (data.error) {
          errorMessage = data.error;
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id || status === 'live') return;
    
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) {
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
          <span className="quiz-questions">{questions_count} Questions</span>
          <span className="quiz-points">{total_points} Points</span>
        </div>
      </div>

      {/* Title Container */}
      <div className="quiz-title-containerNew">
        <div className="quiz-title-text">{title}</div>
        <div className="quiz-course-info">{courseCode} - {topicName}</div>
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
        {status === 'draft' && (
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
        )}

        {status === 'ready' && questions_count > 0 && (
          <button 
            className="action-btn eye-btn"
            onClick={(e) => {
              e.stopPropagation();
              handleMakeLive();
            }}
            disabled={isLoading}
            style={{ backgroundColor: '#27AE60' }}
          >
            {isLoading ? 'Going Live...' : '👁️ Make Live'}
          </button>
        )}
        
        {status === 'live' && (
          <button 
            className="action-btn close-live-btn"
            onClick={(e) => {
              e.stopPropagation();
              handleCloseLive();
            }}
            disabled={isLoading}
            style={{ backgroundColor: '#E74C3C' }}
          >
            {isLoading ? 'Closing...' : '⏹️ Close Live'}
          </button>
        )}

        {status === 'closed' && (
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

        {(status === 'draft' || status === 'closed') && (
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