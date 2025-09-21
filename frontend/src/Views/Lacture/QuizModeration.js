// Views/Lacture/QuizModeration.js
import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  getQuizForModeration, 
  updateQuizQuestions, 
  publishQuiz, 
  rejectQuiz,
  getAdaptiveQuiz
} from '../../api/ai-quiz';
import { getMyCourses } from '../../api/courses';
import NavBar from '../../Componets/Lacture/NavBar';
import './QuizModeration.css';

const QuizModeration = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  // Debug logging to track the quizId issue
  useEffect(() => {
    console.log('=== QuizModeration Debug ===');
    console.log('quizId from useParams:', quizId);
    console.log('quizId type:', typeof quizId);
    console.log('location.pathname:', location.pathname);
    console.log('location.state:', location.state);
  }, [quizId, location]);

  useEffect(() => {
    // Load courses and quiz data
    if (quizId && quizId !== 'undefined' && quizId !== 'null') {
      loadData();
    } else {
      console.error('Invalid quizId detected:', quizId);
      setError('Invalid quiz ID. Please select a quiz from the dashboard.');
      setLoading(false);
    }
  }, [quizId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Load courses first to get topic/course mapping
      const coursesResponse = await getMyCourses();
      let coursesData = [];
      if (coursesResponse.data?.courses) {
        coursesData = coursesResponse.data.courses;
      } else if (Array.isArray(coursesResponse.data)) {
        coursesData = coursesResponse.data;
      }
      setCourses(coursesData);
      
      // Load quiz data
      await loadQuizForModeration(coursesData);
      
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load quiz data');
      setLoading(false);
    }
  };

  const loadQuizForModeration = async (coursesData = courses) => {
    if (!quizId || quizId === 'undefined' || quizId === 'null') {
      console.error('Attempted to load quiz with invalid ID:', quizId);
      setError('Invalid quiz ID provided');
      setLoading(false);
      return;
    }

    try {
      console.log('Making API call to getQuizForModeration with ID:', quizId);
      
      // Only use the moderation API for lecturers (avoid 403 errors from student API)
      const moderationResponse = await getQuizForModeration(quizId);
      const finalQuizData = moderationResponse.data;
      
      console.log('Moderation API response:', finalQuizData);
      console.log('Full API response structure:', JSON.stringify(finalQuizData, null, 2));
      
      if (!finalQuizData) {
        throw new Error('No quiz data available from moderation API');
      }
      
      // Extract course and topic information with better fallback logic
      let courseInfo = { code: 'Unknown Course', name: 'Unknown Course' };
      let topicInfo = { name: 'Unknown Topic' };
      
      // DEBUG: Log all possible fields that might contain course/topic info
      console.log('=== DEBUGGING COURSE/TOPIC EXTRACTION ===');
      console.log('finalQuizData.title:', finalQuizData.title);
      console.log('finalQuizData.topic:', finalQuizData.topic);
      console.log('finalQuizData.subject:', finalQuizData.subject);
      console.log('finalQuizData.course:', finalQuizData.course);
      console.log('finalQuizData.course_id:', finalQuizData.course_id);
      console.log('finalQuizData.topic_id:', finalQuizData.topic_id);
      console.log('All quiz data keys:', Object.keys(finalQuizData));
      
      // AGGRESSIVE EXTRACTION: Use title as primary source since API might not have course/topic fields
      if (finalQuizData.title) {
        const title = finalQuizData.title;
        console.log('Extracting from title:', title);
        
        // Pattern 1: Extract course code (letters + numbers at start)
        const courseCodeMatch = title.match(/^([A-Z]{2,6}\d{1,4})/);
        if (courseCodeMatch) {
          const detectedCode = courseCodeMatch[1];
          courseInfo = { 
            code: detectedCode, 
            name: `Course ${detectedCode}` 
          };
          console.log('Detected course code from title:', detectedCode);
          
          // Try to find full course name from loaded courses
          if (coursesData && coursesData.length > 0) {
            const matchingCourse = coursesData.find(c => 
              c.code && c.code.toUpperCase() === detectedCode.toUpperCase()
            );
            if (matchingCourse) {
              courseInfo = { 
                code: matchingCourse.code, 
                name: matchingCourse.name 
              };
              console.log('Found matching course:', courseInfo);
            }
          }
        }
        
        // Pattern 2: Extract topic name from title
        let topicName = title;
        
        // Remove course code from beginning
        topicName = topicName.replace(/^[A-Z]{2,6}\d{1,4}[\s\-_]*/, '');
        
        // Remove file extensions
        topicName = topicName.replace(/\.(pdf|docx?|pptx?)$/i, '');
        
        // Remove numbers in parentheses (like "(1)")
        topicName = topicName.replace(/\s*\(\d+\)\s*$/, '');
        
        // Remove duplicate course codes that might appear again
        topicName = topicName.replace(/[A-Z]{2,6}\d{1,4}[\s\-_]*/g, '');
        
        // Clean up separators and whitespace
        topicName = topicName.replace(/^[\s\-_]+|[\s\-_]+$/g, '');
        
        if (topicName && topicName.length > 0) {
          topicInfo = { name: topicName };
          console.log('Extracted topic name:', topicName);
        }
      }
      
      console.log('FINAL EXTRACTED DATA:');
      console.log('Course:', courseInfo);
      console.log('Topic:', topicInfo);
      
      // Transform the quiz data
      const transformedQuiz = {
        id: finalQuizData.quiz_id || finalQuizData.id || quizId,
        title: finalQuizData.title || 'Untitled Quiz',
        difficulty: finalQuizData.difficulty || 'medium',
        status: finalQuizData.status || 'draft',
        created_at: finalQuizData.created_at,
        review_notes: finalQuizData.review_notes || '',
        topic: {
          name: topicInfo.name || 'Unknown Topic',
          course: {
            code: courseInfo.code || 'UNKNOWN',
            name: courseInfo.name || 'Unknown Course'
          }
        },
        originalData: finalQuizData
      };

      // Transform questions
      const transformedQuestions = (finalQuizData.questions || []).map((q, index) => {
        console.log(`Processing question ${index}:`, q);
        
        let choices = [];
        if (q.options) {
          // API returns options as {A: "text", B: "text", etc.}
          choices = Object.entries(q.options).map(([key, text], idx) => ({
            choice_text: text,
            is_correct: q.correct_answer === key,
            order: idx
          }));
        } else if (q.choices) {
          choices = q.choices;
        }

        return {
          question_text: q.question || q.question_text || '',
          question_type: q.question_type || 'multiple_choice',
          points: q.points || 1,
          difficulty: q.difficulty || 'medium',
          order: q.order || index,
          explanation: q.explanation || '',
          choices: choices,
          originalData: q
        };
      });

      console.log('Transformed quiz with course/topic:', transformedQuiz);
      console.log('Transformed questions:', transformedQuestions);
      
      setQuiz(transformedQuiz);
      setQuestions(transformedQuestions);
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
    if (!quizId || quizId === 'undefined' || quizId === 'null') {
      setError('Cannot save: Invalid quiz ID');
      return;
    }

    try {
      setSaving(true);
      setError('');
      
      const invalidQuestions = questions.filter(q => 
        !q.question_text.trim() || 
        !q.choices.some(c => c.is_correct) ||
        q.choices.filter(c => c.choice_text.trim()).length < 2
      );
      
      if (invalidQuestions.length > 0) {
        setError('Please ensure all questions have text, at least 2 choices, and one correct answer.');
        return;
      }

      console.log('Saving changes for quiz ID:', quizId);
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
    if (!quizId || quizId === 'undefined' || quizId === 'null') {
      setError('Cannot publish: Invalid quiz ID');
      return;
    }

    if (hasChanges) {
      if (!window.confirm('You have unsaved changes. Save and publish?')) {
        return;
      }
      await handleSaveChanges();
      if (error) return;
    }

    if (!window.confirm('Publish this quiz? Students will be able to access it.')) {
      return;
    }

    try {
      setSaving(true);
      console.log('Publishing quiz ID:', quizId);
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
    if (!quizId || quizId === 'undefined' || quizId === 'null') {
      setError('Cannot reject: Invalid quiz ID');
      return;
    }

    const reason = window.prompt('Enter reason for rejection:');
    if (!reason) return;

    try {
      setSaving(true);
      console.log('Rejecting quiz ID:', quizId);
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

        <div className="error-state">
          <h2>Error Loading Quiz</h2>
          <p>{error}</p>
          <div className="error-actions">
            <button onClick={() => navigate('/LecturerDashboard')} className="btn-secondary">
              Back to Dashboard
            </button>
            <button onClick={() => window.location.reload()} className="btn-primary">
              Reload Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-moderation-container">

      
      {/* Centered Content Container */}
      <div className="moderation-content">
        {/* Header Section */}
        <div className="moderation-header">
          <div className="header-top">
            <h1>Review & Edit Quiz</h1>
            <div className="quiz-meta">
              <span className="course-code">
                {quiz?.topic?.course?.code}
              </span>
              <span className="topic-name">
                {quiz?.topic?.name}
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
              disabled={saving || !hasChanges || !quizId}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            
            <button 
              onClick={handlePublish}
              className="btn-success"
              disabled={saving || !quizId}
            >
              {saving ? 'Publishing...' : 'Publish Quiz'}
            </button>
            
            <button 
              onClick={handleReject}
              className="btn-danger"
              disabled={saving || !quizId}
            >
              Reject
            </button>
          </div>
        </div>

        {/* Alert Messages */}
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

        {/* Quiz Details Card */}
        <div className="quiz-details-card">
          <h2>Quiz Details</h2>
          
          <div className="quiz-title-section">
            <label>Quiz Title</label>
            <input
              type="text"
              value={quiz?.title || ''}
              onChange={(e) => setQuiz(prev => ({ ...prev, title: e.target.value }))}
              className="title-input"
              placeholder="Enter quiz title..."
            />
          </div>

          <div className="quiz-stats-grid">
            <div className="stat-item">
              <span className="stat-label">Questions</span>
              <span className="stat-value">{questions.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Total Points</span>
              <span className="stat-value">
                {questions.reduce((sum, q) => sum + (q.points || 1), 0)}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Status</span>
              <span className="stat-value" style={{ 
                color: quiz?.status === 'published' ? '#27AE60' : '#F39C12' 
              }}>
                {quiz?.status || 'Unknown'}
              </span>
            </div>
          </div>
        </div>

        {/* Questions Section */}
        <div className="questions-container">
          <div className="section-header">
            <h2>Questions ({questions.length})</h2>
            <button onClick={addQuestion} className="btn-add">
              + Add Question
            </button>
          </div>

          {questions.length === 0 ? (
            <div className="empty-questions">
              <div className="empty-icon">📝</div>
              <h3>No Questions Yet</h3>
              <p>Add your first question to get started with this quiz.</p>
              <button onClick={addQuestion} className="btn-primary">
                Add First Question
              </button>
            </div>
          ) : (
            <div className="questions-list">
              {questions.map((question, qIndex) => (
                <div key={qIndex} className="question-card">
                  <div className="question-header">
                    <div className="question-info">
                      <span className="question-number">Question {qIndex + 1}</span>
                    </div>
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
                      
                      <div className="points-group">
                        <input
                          type="number"
                          value={question.points || 1}
                          onChange={(e) => handleQuestionChange(qIndex, 'points', parseInt(e.target.value) || 1)}
                          className="points-input"
                          min="1"
                          max="10"
                        />
                        <span className="points-label">pts</span>
                      </div>
                      
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
                    <label>Question Text</label>
                    <textarea
                      value={question.question_text || ''}
                      onChange={(e) => handleQuestionChange(qIndex, 'question_text', e.target.value)}
                      placeholder="Enter your question here..."
                      className="question-textarea"
                      rows="3"
                    />
                  </div>

                  {question.explanation && (
                    <div className="question-explanation">
                      <label>AI Generated Explanation</label>
                      <div className="explanation-text">{question.explanation}</div>
                    </div>
                  )}

                  <div className="choices-section">
                    <label>Answer Choices</label>
                    <div className="choices-list">
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
                    </div>
                    
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
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="moderation-footer">
          <div className="footer-content">
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
                disabled={saving || !hasChanges || !quizId}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              
              <button 
                onClick={handlePublish}
                className="btn-success"
                disabled={saving || !quizId}
              >
                {saving ? 'Publishing...' : 'Publish Quiz'}
              </button>
            </div>
            
            {hasChanges && (
              <p className="unsaved-changes">You have unsaved changes</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizModeration;