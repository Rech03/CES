import { useState } from 'react';
import { publishQuiz, getQuizForModeration } from '../../api/ai-quiz';
import { deleteQuiz } from '../../api/quizzes';
import { useNavigate } from 'react-router-dom';
import './QuizTile.css';

function QuizTile({
  quiz,
  onEdit,
  onViewResults,
  onDelete,
  onStatusChange
}) {
  const navigate = useNavigate();
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
    time_limit = null,
    difficulty: difficultyRaw,
    level: levelRaw,
    metadata,
    dataSource, // Track where this quiz data came from
    hasRealId, // Track if this has a real quiz ID or generated one
    slideId, // Original slide ID
    adaptiveQuizId, // Real adaptive quiz ID if exists
    quizId // Real quiz ID if exists
  } = quiz || {};

  const courseCode = topic?.course?.code || "UNKNOWN";
  const topicName = topic?.name || "No Topic";

  // Difficulty label detection (Easy/Medium/Hard etc.)
  const difficulty = (difficultyRaw || levelRaw || metadata?.difficulty || metadata?.level || '')
    .toString()
    .trim();

  const formatDate = (dateString) => {
    if (!dateString) return "No date";
    try {
      const d = new Date(dateString);
      return `Created: ${d.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })}`;
    } catch { return "Invalid date"; }
  };

  // Determine the correct ID to use for operations
  const getOperationalId = () => {
    // Priority: adaptiveQuizId > quizId > slideId > id
    return adaptiveQuizId || quizId || slideId || id;
  };

  // Status: draft (no questions), ready (has questions), live (published), closed (not used here)
  const getQuizStatus = () => {
    if (is_live) return 'live';
    if (questions_count === 0) return 'draft';
    return 'ready';
  };
  const status = getQuizStatus();

  const statusInfo = {
    draft: { text: 'Draft', color: '#95A5A6' },
    ready: { text: 'Ready', color: '#F39C12' },
    live:  { text: 'Published', color: '#27AE60' },
    closed:{ text: 'Closed', color: '#E74C3C' }
  }[status] || { text: 'Unknown', color: '#95A5A6' };

  const handleTileClick = () => {
    const operationalId = getOperationalId();
    
    if (status === 'draft' || status === 'ready') {
      // Navigate to moderation/edit page
      navigate(`/moderate-quiz/${operationalId}`);
    } else if (status === 'live') {
      // Navigate to analytics/results - use the correct published quiz ID
      const analyticsId = adaptiveQuizId || quizId || operationalId;
      navigate(`/quiz-analytics/${analyticsId}`);
    }
  };

  const handlePublish = async (e) => {
    e.stopPropagation(); // Prevent tile click
    
    const operationalId = getOperationalId();
    
    if (!operationalId) {
      setError('Cannot publish: No quiz ID available');
      return;
    }
    
    setIsLoading(true); 
    setError('');
    
    try {
      console.log('=== PUBLISHING QUIZ ===');
      console.log('Quiz ID:', id);
      console.log('Operational ID (for API):', operationalId);
      console.log('Slide ID:', slideId);
      console.log('Quiz data source:', dataSource);
      console.log('Has real ID:', hasRealId);
      console.log('Adaptive Quiz ID:', adaptiveQuizId);
      console.log('Quiz ID:', quizId);

      // First, get moderation data to ensure we have the latest quiz info
      console.log('Fetching moderation data for quiz:', operationalId);
      const moderationResponse = await getQuizForModeration(operationalId);
      console.log('Moderation response:', moderationResponse.data);

      // Publish the quiz - this should return the proper adaptive quiz ID
      console.log('Publishing quiz with ID:', operationalId);
      const publishResponse = await publishQuiz(operationalId, { 
        review_notes: 'Publishing from Dashboard',
        confirm_publish: true 
      });
      
      console.log('Publish response:', publishResponse);
      console.log('Publish response data:', publishResponse.data);

      // Extract the correct quiz ID from publish response
      let finalAdaptiveQuizId = null;
      let finalQuizId = null;
      
      if (publishResponse.data) {
        // Look for adaptive quiz ID in various possible fields
        finalAdaptiveQuizId = publishResponse.data.adaptive_quiz_id || 
                              publishResponse.data.quiz_id ||
                              publishResponse.data.id;
        
        // Also look for a separate quiz_id field if it exists
        finalQuizId = publishResponse.data.quiz_id || 
                      publishResponse.data.id;
        
        console.log('Extracted adaptive quiz ID:', finalAdaptiveQuizId);
        console.log('Extracted quiz ID:', finalQuizId);
      }

      // Update the quiz status and notify parent component with the correct IDs
      if (onStatusChange) {
        onStatusChange(id, 'published', {
          originalId: id,
          originalSlideId: slideId,
          newAdaptiveQuizId: finalAdaptiveQuizId,
          newQuizId: finalQuizId,
          publishedAt: new Date().toISOString(),
          operationalId: operationalId
        });
      }

      console.log('✅ Quiz successfully published with adaptive ID:', finalAdaptiveQuizId);
      
    } catch (err) {
      console.error('Error publishing quiz:', err);
      console.error('Error details:', {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message
      });
      
      const d = err.response?.data;
      let msg = 'Failed to publish quiz';
      
      if (typeof d === 'string') {
        msg = d;
      } else if (d?.detail) {
        msg = d.detail;
      } else if (d?.message) {
        msg = d.message;
      } else if (d?.error) {
        msg = d.error;
      } else if (err.message) {
        msg = err.message;
      }
      
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (e) => {
    e.stopPropagation(); // Prevent tile click
    
    const operationalId = getOperationalId();
    
    if (!operationalId || status === 'live') return;
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    
    setIsLoading(true); 
    setError('');
    
    try {
      console.log('Attempting to delete quiz with operational ID:', operationalId);
      await deleteQuiz(operationalId);
      onDelete && onDelete(quiz);
    } catch (err) {
      console.error('Error deleting quiz:', err);
      const d = err.response?.data;
      const msg = d?.detail || d?.message || 'Failed to delete quiz';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (e) => {
    e.stopPropagation(); // Prevent tile click
    const operationalId = getOperationalId();
    navigate(`/moderate-quiz/${operationalId}`);
  };

  const handleViewResults = (e) => {
    e.stopPropagation(); // Prevent tile click
    // Use the published quiz ID for analytics
    const analyticsId = adaptiveQuizId || quizId || getOperationalId();
    navigate(`/quiz-analytics/${analyticsId}`);
  };

  const colorForDifficulty = (diff) => {
    const d = (diff || '').toLowerCase();
    if (d.includes('easy')) return '#22c55e';
    if (d.includes('medium')) return '#f59e0b';
    if (d.includes('hard')) return '#ef4444';
    return '#64748b';
  };

  // Show warning if this quiz doesn't have a proper published ID
  const hasValidPublishedId = is_live && (adaptiveQuizId || quizId);
  const needsProperPublishing = !is_live && !hasRealId;

  return (
    <div 
      className={`quiz-tile-container ${courseCode.toLowerCase()}`} 
      onClick={handleTileClick}
      style={{ cursor: 'pointer' }}
    >
      <div className="quiz-overlay"></div>

      {/* Status */}
      <div className="quiz-status-badge" style={{ backgroundColor: statusInfo.color }}>
        <div className="quiz-status-text">{statusInfo.text}</div>
      </div>

    

      {/* Info */}
      <div className="quiz-info-section">
        <div className="quiz-creation-date">{formatDate(created_at)}</div>
        <div className="quiz-stats-mini">
          <span className="quiz-questions">{questions_count} Questions &nbsp; : &nbsp; <span className="quiz-points">{total_points} Points</span></span>
        </div>
      </div>

      {/* Title + Course/Topic */}
      <div className="quiz-title-containerNew">
        <div className="quiz-title-text">{title}</div>
        <div className="quiz-course-info">{courseCode} - {topicName}</div>
      </div>

      {/* Difficulty chip (if present) */}
      {difficulty && (
        <div style={{
          position:'absolute', top: '16px', right:'16px',
          background: colorForDifficulty(difficulty), color:'#fff',
          padding:'4px 8px', borderRadius:'12px', fontSize:'12px', fontWeight:600
        }}>
          {difficulty}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="quiz-error" style={{
          position: 'absolute', bottom: '80px', left: '16px', right: '16px',
          background: '#FF5252', color: 'white', padding: '8px',
          borderRadius: '4px', fontSize: '12px', zIndex: 10
        }}>
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="quiz-actions">
        {status === 'draft' && (
          <button
            className="action-btn-edit-btn"
            onClick={handleEdit}
            disabled={isLoading}
          >
            Edit
          </button>
        )}

        {status === 'ready' && questions_count > 0 && (
          <button
            className="action-btn eye-btn"
            onClick={handlePublish}
            disabled={isLoading}
            style={{ backgroundColor: '#0b5fff' }}
          >
            {isLoading ? 'Publishing...' : 'Publish Quiz'}
          </button>
        )}

        {status === 'live' && (
          <button
            className="action-btn results-btn"
            onClick={handleViewResults}
            disabled={isLoading}
          >
            Results
          </button>
        )}

        {(status === 'draft' || status === 'ready') && (
          <button
            className="action-btn-delete-btn"
            onClick={handleDelete}
            disabled={isLoading}
            style={{ backgroundColor: '#E74C3C' }}
          >
            {isLoading ? 'Deleting...' : 'Delete'}
          </button>
        )}
      </div>

      {/* Loading overlay */}
      {isLoading && (
        <div style={{
          position:'absolute', inset:0, background:'rgba(255,255,255,0.8)',
          display:'flex', alignItems:'center', justifyContent:'center', zIndex:20
        }}>
          <div>Loading...</div>
        </div>
      )}
    </div>
  );
}

export default QuizTile;