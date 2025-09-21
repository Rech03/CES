import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { startQuizAttempt, submitAnswer, submitQuizAttempt, getQuizQuestions } from '../../api/quizzes';
import MultipleChoiceQuestion from '../../Componets/Student/MultipleChoiceQuestion';
import TrueFalseQuestion from '../../Componets/Student/TrueFalseQuestion';
import ShortAnswerQuestion from '../../Componets/Student/ShortAnswerQuestion';
import './QuizInterface.css';

const QuizInterface = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Get quiz data from navigation state
  const quizData = location.state || {
    quizTitle: 'Quiz',
    quizDuration: '15 min',
    totalQuestions: 20,
    quizId: 1
  };

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(
    getDurationInSeconds(quizData.time_limit || quizData.quizDuration)
  );
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [attemptId, setAttemptId] = useState(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState('');

  // Convert duration to seconds
  function getDurationInSeconds(duration) {
    if (typeof duration === 'number') {
      return duration * 60; // Assume it's in minutes
    }
    if (typeof duration === 'string') {
      const match = duration.match(/(\d+)\s*min/);
      return match ? parseInt(match[1], 10) * 60 : 900; // default 15 minutes
    }
    return 900;
  }

  useEffect(() => {
    const initializeQuiz = async () => {
      setLoading(true);
      try {
        if (!quizData.quizId && !quizData.id) {
          throw new Error('No quiz ID provided');
        }

        const actualQuizId = quizData.quizId || quizData.id;
        
        // Start quiz attempt
        const attemptResponse = await startQuizAttempt({
          quiz: actualQuizId,
          password: quizData.password || null
        });
        
        const quizAttemptId = attemptResponse.data.attempt_id || 
                             attemptResponse.data.id || 
                             attemptResponse.data.attempt?.id;
        
        if (!quizAttemptId) {
          throw new Error('Failed to create quiz attempt');
        }
        
        setAttemptId(quizAttemptId);

        // Fetch quiz questions
        const questionsResponse = await getQuizQuestions(actualQuizId);
        const fetchedQuestions = questionsResponse.data.results || 
                               questionsResponse.data || 
                               [];

        // Process questions into consistent format
        const processedQuestions = fetchedQuestions.map((q, index) => ({
          id: q.id || index + 1,
          type: q.question_type || q.type || 'multiple_choice',
          question: q.question_text || q.text || q.question || `Question ${index + 1}`,
          choices: q.choices?.map(choice => ({
            id: choice.id,
            text: choice.choice_text || choice.text || choice.answer_text
          })) || [],
          points: q.points || 1,
          order: q.order || index + 1
        }));

        if (processedQuestions.length === 0) {
          throw new Error('No questions found for this quiz');
        }

        setQuestions(processedQuestions);
        
        // Set timer based on quiz settings (convert minutes to seconds)
        const timeLimit = (quizData.time_limit || quizData.duration || 15) * 60;
        setTimeRemaining(timeLimit);

      } catch (err) {
        console.error('Error initializing quiz:', err);
        setError(err.message || 'Failed to initialize quiz');
      } finally {
        setLoading(false);
      }
    };

    initializeQuiz();
  }, [quizData]);

  // Timer effect
  useEffect(() => {
    if (timeRemaining > 0 && !isSubmitted && !loading) {
      const timer = setTimeout(() => {
        setTimeRemaining((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeRemaining === 0 && !isSubmitted) {
      handleSubmitQuiz();
    }
  }, [timeRemaining, isSubmitted, loading]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleAnswerSelect = async (answer) => {
    const currentQuestion = questions[currentQuestionIndex];
    
    // Update local state
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: answer
    }));

    // Submit answer to API
    if (attemptId) {
      try {
        setAutoSaveStatus('Saving...');
        
        await submitAnswer({
          attempt_id: attemptId,
          question: currentQuestion.id,
          selected_choice: typeof answer === 'number' ? answer : null,
          answer_text: typeof answer === 'string' ? answer : null
        });
        
        setAutoSaveStatus('Saved');
        setTimeout(() => setAutoSaveStatus(''), 2000);
      } catch (err) {
        console.warn('Failed to submit answer:', err);
        setAutoSaveStatus('Error saving');
        setTimeout(() => setAutoSaveStatus(''), 3000);
      }
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleQuestionJump = (index) => {
    setCurrentQuestionIndex(index);
  };

  const handleSubmitQuiz = async () => {
    setIsSubmitted(true);
    setShowSubmitModal(false);

    const timeUsed = getDurationInSeconds(quizData.time_limit || quizData.quizDuration) - timeRemaining;

    try {
      if (attemptId) {
        await submitQuizAttempt({
          attempt_id: attemptId
        });
        console.log('Quiz submitted successfully');
      }
    } catch (submitErr) {
      console.error('Error submitting quiz:', submitErr);
    }

    // Navigate to results page
    setTimeout(() => {
      navigate('/QuizResultsPage', {
        state: {
          answers,
          questions,
          timeUsed,
          quizData,
          isRetake: quizData.isRetake || false,
          attemptId
        }
      });
    }, 1500);
  };

  const getAnsweredCount = () => {
    return Object.keys(answers).length;
  };

  const getUnansweredQuestions = () => {
    return questions.filter(q => !answers[q.id]);
  };

  if (loading) {
    return (
      <div className="quiz-interface-container">
        <div className="loading-content">
          <div className="spinner"></div>
          <h2>Loading Quiz...</h2>
          <p>Preparing your questions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="quiz-interface-container">
        <div className="error-content">
          <h2>Error Loading Quiz</h2>
          <p>{error}</p>
          <button onClick={() => navigate(-1)} className="nav-btn">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="quiz-interface-container">
        <div className="no-questions-content">
          <h2>No Questions Available</h2>
          <p>This quiz doesn't have any questions yet.</p>
          <button onClick={() => navigate(-1)} className="nav-btn">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];

  const renderQuestion = () => {
    const questionProps = {
      question: currentQuestion.question,
      selectedAnswer: answers[currentQuestion.id],
      onAnswerSelect: handleAnswerSelect,
      questionNumber: currentQuestionIndex + 1,
      totalQuestions: questions.length,
      isSubmitted: false,
      points: currentQuestion.points
    };

    switch (currentQuestion.type) {
      case 'multiple_choice':
        return (
          <MultipleChoiceQuestion 
            {...questionProps} 
            choices={currentQuestion.choices}
          />
        );
      case 'true_false':
        return <TrueFalseQuestion {...questionProps} />;
      case 'short_answer':
        return (
          <ShortAnswerQuestion 
            {...questionProps}
            autoSave={true}
            maxLength={500}
          />
        );
      default:
        return <div>Unknown question type: {currentQuestion.type}</div>;
    }
  };

  if (isSubmitted) {
    return (
      <div className="quiz-submitted-container">
        <div className="submitted-content">
          <div className="success-icon">✅</div>
          <h2>Quiz Submitted Successfully!</h2>
          <p>Your answers have been recorded. Redirecting to results...</p>
          {quizData.isRetake && (
            <p><strong>Retake completed - your best score will be kept</strong></p>
          )}
          {quizData.isLive && (
            <p><strong>Live quiz completed</strong></p>
          )}
          <div className="submission-summary">
            <p>Questions answered: {getAnsweredCount()}/{questions.length}</p>
            <p>Time used: {formatTime(getDurationInSeconds(quizData.time_limit || quizData.quizDuration) - timeRemaining)}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-interface-container">
      {/* Quiz Header */}
      <div className="quiz-header">
        <div className="quiz-info">
          <h1 className="quiz-title">{quizData.quizTitle || quizData.title}</h1>
          <div className="quiz-progress">
            <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
            <span>•</span>
            <span>{getAnsweredCount()} answered</span>
            {quizData.isRetake && (
              <>
                <span>•</span>
                <span className="retake-indicator">Retake Attempt</span>
              </>
            )}
            {quizData.isLive && (
              <>
                <span>•</span>
                <span className="live-indicator">Live Quiz</span>
              </>
            )}
          </div>
          {autoSaveStatus && (
            <div className={`auto-save-status ${autoSaveStatus.includes('Error') ? 'error' : 'success'}`}>
              {autoSaveStatus}
            </div>
          )}
        </div>

        <div className="quiz-timer">
          <div className={`timer ${timeRemaining < 300 ? 'warning' : ''} ${timeRemaining < 60 ? 'critical' : ''}`}>
            <span className="timer-icon">⏱️</span>
            <span className="timer-text">{formatTime(timeRemaining)}</span>
          </div>
        </div>
      </div>

      {/* Question Navigation */}
      <div className="question-navigation">
        <div className="question-dots">
          {questions.map((_, index) => (
            <button
              key={index}
              className={`question-dot ${index === currentQuestionIndex ? 'current' : ''} ${
                answers[questions[index].id] ? 'answered' : ''
              }`}
              onClick={() => handleQuestionJump(index)}
              title={`Question ${index + 1} ${answers[questions[index].id] ? '(Answered)' : '(Unanswered)'}`}
            >
              {index + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Main Question Area */}
      <div className="question-area">{renderQuestion()}</div>

      {/* Navigation Controls */}
      <div className="quiz-controls">
        <div className="navigation-buttons">
          <button
            className="nav-btn prev-btn"
            onClick={handlePreviousQuestion}
            disabled={currentQuestionIndex === 0}
          >
            ← Previous
          </button>

          {currentQuestionIndex === questions.length - 1 ? (
            <button 
              className="nav-btn submit-btn" 
              onClick={() => setShowSubmitModal(true)}
            >
              {quizData.isRetake ? 'Submit Retake' : 'Submit Quiz'}
            </button>
          ) : (
            <button className="nav-btn next-btn" onClick={handleNextQuestion}>
              Next →
            </button>
          )}
        </div>

        {/* Progress indicator */}
        <div className="quiz-progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${(getAnsweredCount() / questions.length) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      {showSubmitModal && (
        <div className="modal-overlay">
          <div className="submit-modal">
            <h3>{quizData.isRetake ? 'Submit Retake?' : 'Submit Quiz?'}</h3>
            
            <div className="submission-summary">
              <p>You have answered <strong>{getAnsweredCount()}</strong> out of <strong>{questions.length}</strong> questions.</p>
              
              {getUnansweredQuestions().length > 0 && (
                <div className="unanswered-warning">
                  <p>⚠️ You have {getUnansweredQuestions().length} unanswered question(s):</p>
                  <ul>
                    {getUnansweredQuestions().slice(0, 5).map((q, index) => (
                      <li key={q.id}>Question {questions.indexOf(q) + 1}</li>
                    ))}
                    {getUnansweredQuestions().length > 5 && <li>... and {getUnansweredQuestions().length - 5} more</li>}
                  </ul>
                </div>
              )}
            </div>

            <p>Are you sure you want to submit your {quizData.isRetake ? 'retake' : 'quiz'}? This action cannot be undone.</p>
            
            {quizData.isRetake && (
              <p><strong>Note: Your best score will be kept regardless of this attempt.</strong></p>
            )}
            {quizData.isLive && (
              <p><strong>Note: This is a live quiz session.</strong></p>
            )}

            <div className="modal-actions">
              <button className="modal-btn cancel-btn" onClick={() => setShowSubmitModal(false)}>
                Cancel
              </button>
              <button className="modal-btn confirm-btn" onClick={handleSubmitQuiz}>
                {quizData.isRetake ? 'Submit Retake' : 'Submit Quiz'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizInterface;