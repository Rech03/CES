// Views/Lacture/QuizModeration.js
import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  getQuizForModeration, 
  updateQuizQuestions, 
  publishQuiz,
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
  const [isPublishedQuiz, setIsPublishedQuiz] = useState(false);

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
      console.log('Making API call to load quiz with ID:', quizId);
      
      let finalQuizData = null;
      let quizSource = 'unknown';
      
      // Try moderation API first (for unpublished quizzes)
      try {
        console.log('Trying moderation API...');
        const moderationResponse = await getQuizForModeration(quizId);
        finalQuizData = moderationResponse.data;
        quizSource = 'moderation';
        setIsPublishedQuiz(false);
        console.log('Successfully loaded from moderation API:', finalQuizData);
      } catch (moderationError) {
        console.log('Moderation API failed, trying adaptive quiz API...', moderationError.message);
        
        // If moderation fails, try adaptive quiz API (for published quizzes)
        try {
          const adaptiveResponse = await getAdaptiveQuiz(quizId);
          finalQuizData = adaptiveResponse.data;
          quizSource = 'adaptive';
          setIsPublishedQuiz(true);
          console.log('Successfully loaded from adaptive API:', finalQuizData);
        } catch (adaptiveError) {
          console.log('Both APIs failed:', adaptiveError.message);
          throw new Error(`Unable to load quiz data. Moderation API: ${moderationError.message}, Adaptive API: ${adaptiveError.message}`);
        }
      }
      
      console.log('Final quiz data loaded from', quizSource, ':', finalQuizData);
      
      if (!finalQuizData) {
        throw new Error('No quiz data available from any API');
      }
      
      // Extract course and topic information with enhanced logic
      let courseInfo = { code: 'Unknown Course', name: 'Unknown Course' };
      let topicInfo = { name: 'Unknown Topic' };
      
      // Try structured data first
      if (finalQuizData.topic) {
        topicInfo = {
          name: finalQuizData.topic.name || finalQuizData.topic_name || 'Unknown Topic'
        };
        
        if (finalQuizData.topic.course) {
          courseInfo = {
            code: finalQuizData.topic.course.code || 'UNKNOWN',
            name: finalQuizData.topic.course.name || 'Unknown Course'
          };
        }
      } else if (finalQuizData.subject) {
        topicInfo = {
          name: finalQuizData.subject.name || 'Unknown Topic'
        };
        
        if (finalQuizData.subject.course) {
          courseInfo = {
            code: finalQuizData.subject.course.code || 'UNKNOWN',
            name: finalQuizData.subject.course.name || 'Unknown Course'
          };
        }
      }
      
      // FALLBACK: Extract from title if structured data not available
      if ((courseInfo.code === 'UNKNOWN' || topicInfo.name === 'Unknown Topic') && finalQuizData.title) {
        const title = finalQuizData.title;
        console.log('Extracting from title:', title);
        
        // Pattern 1: Extract course code (letters + numbers at start)
        const courseCodeMatch = title.match(/^([A-Z]{2,6}\d{1,4})/);
        if (courseCodeMatch && courseInfo.code === 'UNKNOWN') {
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
        if (topicInfo.name === 'Unknown Topic') {
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
      }
      
      console.log('FINAL EXTRACTED DATA:');
      console.log('Course:', courseInfo);
      console.log('Topic:', topicInfo);
      console.log('Quiz source:', quizSource);
      console.log('Is published quiz:', isPublishedQuiz);
      
      // Transform the quiz data
      const transformedQuiz = {
        id: finalQuizData.quiz_id || finalQuizData.adaptive_quiz_id || finalQuizData.id || quizId,
        originalId: quizId, // Keep track of the original ID used to load this quiz
        title: finalQuizData.title || 'Untitled Quiz',
        difficulty: finalQuizData.difficulty || 'medium',
        status: finalQuizData.status || (isPublishedQuiz ? 'published' : 'draft'),
        created_at: finalQuizData.created_at,
        review_notes: finalQuizData.review_notes || '',
        is_published: isPublishedQuiz,
        topic: {
          name: topicInfo.name,
          course: {
            code: courseInfo.code,
            name: courseInfo.name
          }
        },
        originalData: finalQuizData,
        dataSource: quizSource
      };

      // Transform questions based on the source API structure
      let transformedQuestions = [];
      
      if (finalQuizData.questions && Array.isArray(finalQuizData.questions)) {
        transformedQuestions = finalQuizData.questions.map((q, index) => {
          console.log(`Processing question ${index}:`, q);
          
          let choices = [];
          
          // Handle different question structures
          if (q.options && typeof q.options === 'object') {
            // API returns options as {A: "text", B: "text", etc.}
            choices = Object.entries(q.options).map(([key, text], idx) => ({
              choice_text: text,
              is_correct: q.correct_answer === key,
              order: idx
            }));
          } else if (q.choices && Array.isArray(q.choices)) {
            // Already in choice format
            choices = q.choices.map((choice, idx) => ({
              choice_text: choice.choice_text || choice.text || choice,
              is_correct: choice.is_correct || false,
              order: choice.order || idx
            }));
          } else if (q.answer_options && Array.isArray(q.answer_options)) {
            // Another possible format
            choices = q.answer_options.map((option, idx) => ({
              choice_text: option.text || option,
              is_correct: option.is_correct || false,
              order: idx
            }));
          }

          return {
            question_text: q.question || q.question_text || q.text || '',
            question_type: q.question_type || 'multiple_choice',
            points: q.points || 1,
            difficulty: q.difficulty || 'medium',
            order: q.order || index,
            explanation: q.explanation || '',
            choices: choices,
            originalData: q
          };
        });
      }

      console.log('Transformed quiz with course/topic:', transformedQuiz);
      console.log('Transformed questions:', transformedQuestions);
      
      setQuiz(transformedQuiz);
      setQuestions(transformedQuestions);
    } catch (err) {
      console.error('Error loading quiz for moderation:', err);
      const errorMsg = err.response?.data?.detail || 
                      err.response?.data?.message || 
                      err.message ||
                      'Failed to load quiz for moderation';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleQuestionChange = (questionIndex, field, value) => {
    if (!isEditable) return;
    
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
    if (!isEditable) return;
    
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
    if (!isEditable) return;
    
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
    if (!isEditable) return;
    
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
    if (!isEditable) return;
    
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
    if (!isEditable) return;
    
    if (window.confirm('Are you sure you want to remove this question?')) {
      setQuestions(prev => prev.filter((_, idx) => idx !== questionIndex));
      setHasChanges(true);
    }
  };

  const addQuestion = () => {
    if (!isEditable) return;
    
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

  const handleTitleChange = (newTitle) => {
    if (!isEditable) return;
    
    setQuiz(prev => ({ ...prev, title: newTitle }));
    setHasChanges(true);
    setError('');
    setSuccess('');
  };

  const handleSaveChanges = async () => {
    // Use the original ID for API operations
    const operationalId = quiz?.originalId || quizId;
    
    if (!operationalId || operationalId === 'undefined' || operationalId === 'null') {
      setError('Cannot save: Invalid quiz ID');
      return;
    }

    // Don't allow editing published quizzes
    if (isPublishedQuiz) {
      setError('Cannot edit published quizzes. Create a new version if changes are needed.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      
      // Validate quiz title
      if (!quiz?.title?.trim()) {
        setError('Please enter a quiz title');
        return;
      }

      // Validate questions
      const invalidQuestions = questions.filter(q => 
        !q.question_text.trim() || 
        !q.choices.some(c => c.is_correct) ||
        q.choices.filter(c => c.choice_text.trim()).length < 2
      );
      
      if (invalidQuestions.length > 0) {
        setError('Please ensure all questions have text, at least 2 choices, and one correct answer.');
        return;
      }

      console.log('Saving changes for quiz ID:', operationalId);
      console.log('Updated quiz data:', { title: quiz.title, questions });
      
      await updateQuizQuestions(operationalId, { 
        title: quiz.title,
        questions 
      });
      
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
    // Use the original ID for API operations
    const operationalId = quiz?.originalId || quizId;
    
    if (!operationalId || operationalId === 'undefined' || operationalId === 'null') {
      setError('Cannot publish: Invalid quiz ID');
      return;
    }

    // Don't allow republishing
    if (isPublishedQuiz) {
      setError('Quiz is already published. Create a new version if changes are needed.');
      return;
    }

    // Validate before publishing
    if (!quiz?.title?.trim()) {
      setError('Please enter a quiz title before publishing');
      return;
    }

    if (questions.length === 0) {
      setError('Cannot publish quiz with no questions');
      return;
    }

    const invalidQuestions = questions.filter(q => 
      !q.question_text.trim() || 
      !q.choices.some(c => c.is_correct) ||
      q.choices.filter(c => c.choice_text.trim()).length < 2
    );
    
    if (invalidQuestions.length > 0) {
      setError('Please fix all questions before publishing. Each question needs text, at least 2 choices, and one correct answer.');
      return;
    }

    if (hasChanges) {
      if (!window.confirm('You have unsaved changes. Save and publish?')) {
        return;
      }
      try {
        await handleSaveChanges();
        if (error) return;
      } catch (saveError) {
        console.error('Error saving before publish:', saveError);
        setError('Failed to save changes before publishing');
        return;
      }
    }

    if (!window.confirm('Publish this quiz? Students will be able to access it immediately.')) {
      return;
    }

    try {
      setSaving(true);
      console.log('Publishing quiz ID:', operationalId);
      const publishResponse = await publishQuiz(operationalId, { 
        review_notes: 'Reviewed and approved by lecturer',
        confirm_publish: true
      });
      
      console.log('Publish response:', publishResponse);
      
      setSuccess('Quiz published successfully! Students can now access it. Redirecting to dashboard...');
      setTimeout(() => navigate('/LecturerDashboard'), 3000);
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

  const getDifficultyColor = (difficulty) => {
    const colors = {
      easy: '#22c55e',
      medium: '#f59e0b', 
      hard: '#ef4444'
    };
    return colors[difficulty?.toLowerCase()] || '#64748b';
  };

  // Determine if quiz is editable
  const isEditable = !isPublishedQuiz;

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
              {isPublishedQuiz && (
                <span className="published-badge">
                  Published
                </span>
              )}
            </div>
          </div>
          
          <div className="header-actions">
            <button 
              onClick={() => navigate('/LecturerDashboard')}
              className="btn-secondary"
              disabled={saving}
            >
              {isPublishedQuiz ? 'Back to Dashboard' : 'Cancel'}
            </button>
            
            {isEditable && (
              <button 
                onClick={handleSaveChanges}
                className="btn-primary"
                disabled={saving || !hasChanges}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            )}
            
            {isEditable && (
              <button 
                onClick={handlePublish}
                className="btn-success"
                disabled={saving}
              >
                {saving ? 'Publishing...' : 'Publish Quiz'}
              </button>
            )}
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

        {isPublishedQuiz && (
          <div className="alert alert-info">
            This quiz has been published and is available to students. Editing is disabled to maintain consistency.
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
              onChange={(e) => isEditable && handleTitleChange(e.target.value)}
              className="title-input"
              placeholder="Enter quiz title..."
              disabled={!isEditable}
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
            <div className="stat-item">
              <span className="stat-label">Source</span>
              <span className="stat-value">
                {quiz?.dataSource === 'adaptive' ? 'Published Quiz' : 'Draft Quiz'}
              </span>
            </div>
          </div>
        </div>

        {/* Questions Section */}
        <div className="questions-container">
          <div className="section-header">
            <h2>Questions ({questions.length})</h2>
            {isEditable && (
              <button onClick={addQuestion} className="btn-add">
                + Add Question
              </button>
            )}
          </div>

          {questions.length === 0 ? (
            <div className="empty-questions">
              <div className="empty-icon">📝</div>
              <h3>No Questions Yet</h3>
              <p>{isEditable ? 'Add your first question to get started with this quiz.' : 'This quiz has no questions.'}</p>
              {isEditable && (
                <button onClick={addQuestion} className="btn-primary">
                  Add First Question
                </button>
              )}
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
                        onChange={(e) => isEditable && handleQuestionChange(qIndex, 'difficulty', e.target.value)}
                        className="difficulty-select"
                        disabled={!isEditable}
                      >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                      
                      <div className="points-group">
                        <input
                          type="number"
                          value={question.points || 1}
                          onChange={(e) => isEditable && handleQuestionChange(qIndex, 'points', parseInt(e.target.value) || 1)}
                          className="points-input"
                          min="1"
                          max="10"
                          disabled={!isEditable}
                        />
                        <span className="points-label">pts</span>
                      </div>
                      
                      {isEditable && (
                        <button 
                          onClick={() => removeQuestion(qIndex)}
                          className="btn-remove-question"
                          title="Remove question"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="question-content">
                    <label>Question Text</label>
                    <textarea
                      value={question.question_text || ''}
                      onChange={(e) => isEditable && handleQuestionChange(qIndex, 'question_text', e.target.value)}
                      placeholder="Enter your question here..."
                      className="question-textarea"
                      rows="3"
                      disabled={!isEditable}
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
                            onChange={() => isEditable && handleCorrectAnswerChange(qIndex, cIndex)}
                            className="choice-radio"
                            disabled={!isEditable}
                          />
                          
                          <input
                            type="text"
                            value={choice.choice_text || ''}
                            onChange={(e) => isEditable && handleChoiceChange(qIndex, cIndex, 'choice_text', e.target.value)}
                            placeholder={`Choice ${String.fromCharCode(65 + cIndex)}`}
                            className="choice-input"
                            disabled={!isEditable}
                          />
                          
                          {isEditable && question.choices.length > 2 && (
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
                    
                    {isEditable && question.choices?.length < 6 && (
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
                {isPublishedQuiz ? 'Back to Dashboard' : 'Cancel'}
              </button>
              
              {isEditable && (
                <button 
                  onClick={handleSaveChanges}
                  className="btn-primary"
                  disabled={saving || !hasChanges}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              )}
              
              {isEditable && (
                <button 
                  onClick={handlePublish}
                  className="btn-success"
                  disabled={saving}
                >
                  {saving ? 'Publishing...' : 'Publish Quiz'}
                </button>
              )}
            </div>
            
            {hasChanges && isEditable && (
              <p className="unsaved-changes">You have unsaved changes</p>
            )}
            
            {!isEditable && (
              <p className="read-only-notice">This published quiz is read-only</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizModeration;