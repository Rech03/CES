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
    metadata
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
    if (status === 'draft' || status === 'ready') {
      // Navigate to moderation/edit page
      navigate(`/moderate-quiz/${id}`);
    } else if (status === 'live') {
      // Navigate to analytics/results
      navigate(`/quiz-analytics/${id}`);
    }
  };

  const handlePublish = async (e) => {
    e.stopPropagation(); // Prevent tile click
    if (!id) return;
    setIsLoading(true); 
    setError('');
    try {
      // Optionally fetch moderation data first (to ensure server-side consistency)
      await getQuizForModeration(id);
      await publishQuiz(id, { review_notes: 'Publishing from Dashboard' });
      onStatusChange && onStatusChange(id, 'published');
    } catch (err) {
      console.error('Error publishing quiz:', err);
      const d = err.response?.data;
      const msg = typeof d === 'string' ? d : (d?.detail || d?.message || d?.error || 'Failed to publish quiz');
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (e) => {
    e.stopPropagation(); // Prevent tile click
    if (!id || status === 'live') return;
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setIsLoading(true); 
    setError('');
    try {
      await deleteQuiz(id);
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
    navigate(`/moderate-quiz/${id}`);
  };

  const handleViewResults = (e) => {
    e.stopPropagation(); // Prevent tile click
    navigate(`/quiz-analytics/${id}`);
  };

  const colorForDifficulty = (diff) => {
    const d = (diff || '').toLowerCase();
    if (d.includes('easy')) return '#22c55e';
    if (d.includes('medium')) return '#f59e0b';
    if (d.includes('hard')) return '#ef4444';
    return '#64748b';
  };

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
          position:'absolute', top: '56px', right:'16px',
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
            {isLoading ? 'Publishing...' : 'Publish'}
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