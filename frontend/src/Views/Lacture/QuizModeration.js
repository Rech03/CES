// Views/Lacture/QuizModeration.js
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  getQuizForModeration, 
  updateQuizQuestions, 
  publishQuiz, 
  rejectQuiz 
} from '../../api/ai-quiz';
import NavBar from '../../Componets/Lacture/NavBar';
import './QuizModeration.css';

const QuizModeration = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (quizId) {
      loadQuizForModeration();
    }
  }, [quizId]);

  const loadQuizForModeration = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await getQuizForModeration(quizId);
      const quizData = response.data;
      
      setQuiz(quizData);
      setQuestions(quizData.questions || []);
    } catch (err) {
      console.error('Error loading quiz for moderation:', err);
      const errorMsg = err.response?.data?.detail || 
                      err.response?.data?.message || 
                      'Failed to load quiz for moderation';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleQuestionChange = (questionIndex, field, value) => {
    setQuestions(prev => {
      const updated = [...prev];
      updated[questionIndex] = {
        ...updated[questionIndex],
        [field]: value
      };
      return updated;
    });
    setHasChanges(true);
    setError('');
    setSuccess('');
  };

  const handleChoiceChange = (questionIndex, choiceIndex, field, value) => {
    setQuestions(prev => {
      const updated = [...prev];
      updated[questionIndex] = {
        ...updated[questionIndex],
        choices: updated[questionIndex].choices.map((choice, idx) => 
          idx === choiceIndex ? { ...choice, [field]: value } : choice
        )
      };
      return updated;
    });
    setHasChanges(true);
    setError('');
    setSuccess('');
  };

  const handleCorrectAnswerChange = (questionIndex, choiceIndex) => {
    setQuestions(prev => {
      const updated = [...prev];
      updated[questionIndex] = {
        ...updated[questionIndex],
        choices: updated[questionIndex].choices.map((choice, idx) => ({
          ...choice,
          is_correct: idx === choiceIndex
        }))
      };
      return updated;
    });
    setHasChanges(true);
    setError('');
    setSuccess('');
  };

  const addChoice = (questionIndex) => {
    setQuestions(prev => {
      const updated = [...prev];
      const newChoice = {
        choice_text: '',
        is_correct: false,
        order: updated[questionIndex].choices.length
      };
      updated[questionIndex] = {
        ...updated[questionIndex],
        choices: [...updated[questionIndex].choices, newChoice]
      };
      return updated;
    });
    setHasChanges(true);
  };

  const removeChoice = (questionIndex, choiceIndex) => {
    setQuestions(prev => {
      const updated = [...prev];
      updated[questionIndex] = {
        ...updated[questionIndex],
        choices: updated[questionIndex].choices.filter((_, idx) => idx !== choiceIndex)
      };
      return updated;
    });
    setHasChanges(true);
  };

  const removeQuestion = (questionIndex) => {
    if (window.confirm('Are you sure you want to remove this question?')) {
      setQuestions(prev => prev.filter((_, idx) => idx !== questionIndex));
      setHasChanges(true);
    }
  };

  const addQuestion = () => {
    const newQuestion = {
      question_text: '',
      question_type: 'multiple_choice',
      points: 1,
      difficulty: 'medium',
      order: questions.length,
      choices: [
        { choice_text: '', is_correct: true, order: 0 },
        { choice_text: '', is_correct: false, order: 1 },
        { choice_text: '', is_correct: false, order: 2 },
        { choice_text: '', is_correct: false, order: 3 }
      ]
    };
    setQuestions(prev => [...prev, newQuestion]);
    setHasChanges(true);
  };

  const handleSaveChanges = async () => {
    try {
      setSaving(true);
      setError('');
      
      // Validate questions before saving
      const invalidQuestions = questions.filter(q => 
        !q.question_text.trim() || 
        !q.choices.some(c => c.is_correct) ||
        q.choices.filter(c => c.choice_text.trim()).length < 2
      );
      
      if (invalidQuestions.length > 0) {
        setError('Please ensure all questions have text, at least 2 choices, and one correct answer.');
        return;
      }

      await updateQuizQuestions(quizId, { questions });
      setSuccess('Changes saved successfully!');
      setHasChanges(false);
    } catch (err) {
      console.error('Error saving changes:', err);
      const errorMsg = err.response?.data?.detail || 
                      err.response?.data?.message || 
                      'Failed to save changes';
      setError(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (hasChanges) {
      if (!window.confirm('You have unsaved changes. Save and publish?')) {
        return;
      }
      await handleSaveChanges();
    }

    if (!window.confirm('Publish this quiz? Students will be able to access it.')) {
      return;
    }

    try {
      setSaving(true);
      await publishQuiz(quizId, { 
        review_notes: 'Reviewed and approved by lecturer' 
      });
      setSuccess('Quiz published successfully!');
      setTimeout(() => navigate('/LecturerDashboard'), 2000);
    } catch (err) {
      console.error('Error publishing quiz:', err);
      const errorMsg = err.response?.data?.detail || 
                      err.response?.data?.message || 
                      'Failed to publish quiz';
      setError(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    const reason = window.prompt('Enter reason for rejection:');
    if (!reason) return;

    try {
      setSaving(true);
      await rejectQuiz(quizId, { review_notes: reason });
      setSuccess('Quiz rejected. Returning to dashboard...');
      setTimeout(() => navigate('/LecturerDashboard'), 2000);
    } catch (err) {
      console.error('Error rejecting quiz:', err);
      const errorMsg = err.response?.data?.detail || 
                      err.response?.data?.message || 
                      'Failed to reject quiz';
      setError(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const getDifficultyColor = (difficulty) => {
    const colors = {
      easy: '#22c55e',
      medium: '#f59e0b', 
      hard: '#ef4444'
    };
    return colors[difficulty?.toLowerCase()] || '#64748b';
  };

  if (loading) {
    return (
      <div className="quiz-moderation-container">
        <NavBar />
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading quiz for review...</p>
        </div>
      </div>
    );
  }

  if (error && !quiz) {
    return (
      <div className="quiz-moderation-container">
        <NavBar />
        <div className="error-state">
          <h2>Error Loading Quiz</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/LecturerDashboard')} className="btn-secondary">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-moderation-container">
      <NavBar />
      
      <div className="moderation-header">
        <div className="header-info">
          <h1>Review & Edit Quiz</h1>
          <div className="quiz-meta">
            <span className="course-code">
              {quiz?.topic?.course?.code || 'Unknown Course'}
            </span>
            <span className="topic-name">
              {quiz?.topic?.name || 'Unknown Topic'}
            </span>
            <span 
              className="difficulty-badge"
              style={{ backgroundColor: getDifficultyColor(quiz?.difficulty) }}
            >
              {quiz?.difficulty || 'Medium'}
            </span>
          </div>
        </div>
        
        <div className="header-actions">
          <button 
            onClick={() => navigate('/LecturerDashboard')}
            className="btn-secondary"
            disabled={saving}
          >
            Cancel
          </button>
          
          <button 
            onClick={handleSaveChanges}
            className="btn-primary"
            disabled={saving || !hasChanges}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          
          <button 
            onClick={handlePublish}
            className="btn-success"
            disabled={saving}
          >
            {saving ? 'Publishing...' : 'Publish Quiz'}
          </button>
          
          <button 
            onClick={handleReject}
            className="btn-danger"
            disabled={saving}
          >
            Reject
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          {success}
        </div>
      )}

      <div className="quiz-details">
        <div className="quiz-title-section">
          <label>Quiz Title:</label>
          <input
            type="text"
            value={quiz?.title || ''}
            onChange={(e) => setQuiz(prev => ({ ...prev, title: e.target.value }))}
            className="title-input"
            placeholder="Enter quiz title..."
          />
        </div>

        <div className="quiz-stats">
          <div className="stat">
            <span className="stat-label">Questions:</span>
            <span className="stat-value">{questions.length}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Total Points:</span>
            <span className="stat-value">
              {questions.reduce((sum, q) => sum + (q.points || 1), 0)}
            </span>
          </div>
        </div>
      </div>

      <div className="questions-section">
        <div className="section-header">
          <h2>Questions ({questions.length})</h2>
          <button onClick={addQuestion} className="btn-add">
            + Add Question
          </button>
        </div>

        {questions.map((question, qIndex) => (
          <div key={qIndex} className="question-card">
            <div className="question-header">
              <span className="question-number">Question {qIndex + 1}</span>
              <div className="question-controls">
                <select
                  value={question.difficulty || 'medium'}
                  onChange={(e) => handleQuestionChange(qIndex, 'difficulty', e.target.value)}
                  className="difficulty-select"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
                
                <input
                  type="number"
                  value={question.points || 1}
                  onChange={(e) => handleQuestionChange(qIndex, 'points', parseInt(e.target.value) || 1)}
                  className="points-input"
                  min="1"
                  max="10"
                />
                <span className="points-label">pts</span>
                
                <button 
                  onClick={() => removeQuestion(qIndex)}
                  className="btn-remove-question"
                  title="Remove question"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="question-content">
              <textarea
                value={question.question_text || ''}
                onChange={(e) => handleQuestionChange(qIndex, 'question_text', e.target.value)}
                placeholder="Enter your question here..."
                className="question-textarea"
                rows="3"
              />
            </div>

            <div className="choices-section">
              <h4>Answer Choices:</h4>
              {question.choices?.map((choice, cIndex) => (
                <div key={cIndex} className="choice-item">
                  <input
                    type="radio"
                    name={`correct_${qIndex}`}
                    checked={choice.is_correct}
                    onChange={() => handleCorrectAnswerChange(qIndex, cIndex)}
                    className="choice-radio"
                  />
                  
                  <input
                    type="text"
                    value={choice.choice_text || ''}
                    onChange={(e) => handleChoiceChange(qIndex, cIndex, 'choice_text', e.target.value)}
                    placeholder={`Choice ${String.fromCharCode(65 + cIndex)}`}
                    className="choice-input"
                  />
                  
                  {question.choices.length > 2 && (
                    <button
                      onClick={() => removeChoice(qIndex, cIndex)}
                      className="btn-remove-choice"
                      title="Remove choice"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              
              {question.choices?.length < 6 && (
                <button 
                  onClick={() => addChoice(qIndex)}
                  className="btn-add-choice"
                >
                  + Add Choice
                </button>
              )}
            </div>
          </div>
        ))}

        {questions.length === 0 && (
          <div className="empty-questions">
            <p>No questions available. Add your first question to get started.</p>
            <button onClick={addQuestion} className="btn-primary">
              Add First Question
            </button>
          </div>
        )}
      </div>

      <div className="moderation-footer">
        <div className="footer-actions">
          <button 
            onClick={() => navigate('/LecturerDashboard')}
            className="btn-secondary"
            disabled={saving}
          >
            Cancel
          </button>
          
          <button 
            onClick={handleSaveChanges}
            className="btn-primary"
            disabled={saving || !hasChanges}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          
          <button 
            onClick={handlePublish}
            className="btn-success"
            disabled={saving}
          >
            {saving ? 'Publishing...' : 'Publish Quiz'}
          </button>
        </div>
        
        {hasChanges && (
          <p className="unsaved-changes">You have unsaved changes</p>
        )}
      </div>
    </div>
  );
};

export default QuizModeration;