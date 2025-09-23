import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  getAdaptiveQuiz, 
  submitAdaptiveQuiz 
} from '../../api/ai-quiz';
import MultipleChoiceQuestion from '../../Componets/Student/MultipleChoiceQuestion';
import TrueFalseQuestion from '../../Componets/Student/TrueFalseQuestion';
import ShortAnswerQuestion from '../../Componets/Student/ShortAnswerQuestion';
import './QuizInterface.css';

const QuizInterface = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Get quiz data from navigation state
  const quizData = location.state || {
    quizTitle: 'AI Quiz',
    quizDuration: '15 min',
    totalQuestions: 5,
    quizId: null,
    slideId: null,
    isAIQuiz: true
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
  const [quizSession, setQuizSession] = useState(null);
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
    const initializeAIQuiz = async () => {
      setLoading(true);
      try {
        if (!quizData.quizId) {
          throw new Error('No quiz ID provided');
        }

        console.log('Initializing AI quiz:', quizData.quizId);

        // Fetch AI quiz details and questions
        const quizResponse = await getAdaptiveQuiz(quizData.quizId);
        const fetchedQuizData = quizResponse.data;

        console.log('AI Quiz response:', fetchedQuizData);

        // Extract questions from the response
        let questionsData = [];
        if (fetchedQuizData.questions && Array.isArray(fetchedQuizData.questions)) {
          questionsData = fetchedQuizData.questions;
        } else if (fetchedQuizData.adaptive_questions) {
          questionsData = fetchedQuizData.adaptive_questions;
        } else {
          throw new Error('No questions found in the quiz response');
        }

        // Process questions into consistent format for AI quizzes
        const processedQuestions = questionsData.map((q, index) => {
          // Handle different possible question structures from AI quiz API
          const questionData = {
            id: q.id || q.question_id || index + 1,
            type: q.question_type || q.type || 'multiple_choice',
            question: q.question_text || q.text || q.question || `Question ${index + 1}`,
            points: q.points || q.weight || 1,
            order: q.order || index + 1,
            explanation: q.explanation || null
          };

          // Handle choices for multiple choice questions
          if (questionData.type === 'multiple_choice' && q.choices) {
            questionData.choices = q.choices.map((choice, choiceIndex) => ({
              id: choice.id || choiceIndex + 1,
              text: choice.choice_text || choice.text || choice.answer_text || `Option ${choiceIndex + 1}`,
              is_correct: choice.is_correct || false
            }));
          }

          // Handle true/false questions
          if (questionData.type === 'true_false') {
            questionData.correct_answer = q.correct_answer;
          }

          // Handle short answer questions
          if (questionData.type === 'short_answer') {
            questionData.model_answer = q.model_answer || q.sample_answer;
          }

          return questionData;
        });

        if (processedQuestions.length === 0) {
          throw new Error('No valid questions found for this quiz');
        }

        setQuestions(processedQuestions);
        setQuizSession(fetchedQuizData);
        
        // Set timer based on quiz settings
        const timeLimit = (fetchedQuizData.time_limit || quizData.time_limit || 15) * 60;
        setTimeRemaining(timeLimit);

        console.log('AI Quiz initialized with', processedQuestions.length, 'questions');

      } catch (err) {
        console.error('Error initializing AI quiz:', err);
        setError(err.message || 'Failed to initialize quiz');
      } finally {
        setLoading(false);
      }
    };

    initializeAIQuiz();
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

    // Auto-save functionality for AI quizzes
    setAutoSaveStatus('Saved locally');
    setTimeout(() => setAutoSaveStatus(''), 2000);
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
      // Prepare answers for AI quiz submission using published quiz ID
      const submissionData = {
        adaptive_quiz_id: quizData.quizId, // Published quiz ID
        slide_id: quizData.slideId, // Original slide ID for reference
        answers: Object.entries(answers).map(([questionId, answer]) => {
          const question = questions.find(q => q.id.toString() === questionId.toString());
          
          return {
            question_id: parseInt(questionId),
            question_type: question?.type || 'multiple_choice',
            selected_choice_id: typeof answer === 'number' ? answer : null,
            answer_text: typeof answer === 'string' ? answer : null,
            is_true_false: question?.type === 'true_false' ? answer : null
          };
        }),
        time_taken: timeUsed,
        completed_at: new Date().toISOString()
      };

      console.log('Submitting quiz with published ID:', submissionData);

      const submitResponse = await submitAdaptiveQuiz(submissionData);
      console.log('Quiz submission response:', submitResponse.data);

      // Store submission result for results page
      const submissionResult = {
        ...submitResponse.data,
        timeUsed,
        questions,
        answers,
        quizData: {
          ...quizData,
          isAIQuiz: true
        }
      };

      // Navigate to results page
      setTimeout(() => {
        navigate('/QuizResultsPage', {
          state: submissionResult
        });
      }, 1500);

    } catch (submitErr) {
      console.error('Error submitting AI quiz:', submitErr);
      setError('Failed to submit quiz. Please try again.');
      setIsSubmitted(false);
    }
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
          <h2>Loading AI Quiz...</h2>
          <p>Preparing your adaptive questions...</p>
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
          <p>This AI quiz doesn't have any questions generated yet.</p>
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
            choices={currentQuestion.choices || []}
          />
        );
      case 'true_false':
        return (
          <TrueFalseQuestion 
            {...questionProps}
            correctAnswer={currentQuestion.correct_answer}
          />
        );
      case 'short_answer':
        return (
          <ShortAnswerQuestion 
            {...questionProps}
            autoSave={true}
            maxLength={500}
            modelAnswer={currentQuestion.model_answer}
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
          <h2>AI Quiz Submitted Successfully!</h2>
          <p>Your answers have been recorded and are being processed. Redirecting to results...</p>
          {quizData.isRetake && (
            <p><strong>Retake completed - your best score will be kept</strong></p>
          )}
          {quizData.isLive && (
            <p><strong>Live quiz completed</strong></p>
          )}
          <div className="submission-summary">
            <p>Questions answered: {getAnsweredCount()}/{questions.length}</p>
            <p>Time used: {formatTime(getDurationInSeconds(quizData.time_limit || quizData.quizDuration) - timeRemaining)}</p>
            <p>Quiz type: Adaptive AI Quiz</p>
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
          <h1 className="quiz-title">
            {quizData.quizTitle || quizData.title}
            <span className="ai-badge">AI</span>
          </h1>
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
            <span>•</span>
            <span className="adaptive-indicator">Adaptive</span>
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
              {quizData.isRetake ? 'Submit Retake' : 'Submit AI Quiz'}
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
            <h3>{quizData.isRetake ? 'Submit AI Quiz Retake?' : 'Submit AI Quiz?'}</h3>
            
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

            <p>Are you sure you want to submit your {quizData.isRetake ? 'retake' : 'adaptive quiz'}? This action cannot be undone.</p>
            
            {quizData.isRetake && (
              <p><strong>Note: Your best score will be kept regardless of this attempt.</strong></p>
            )}
            {quizData.isLive && (
              <p><strong>Note: This is a live quiz session.</strong></p>
            )}
            <p><strong>AI Note: Your performance will influence future quiz difficulty.</strong></p>

            <div className="modal-actions">
              <button className="modal-btn cancel-btn" onClick={() => setShowSubmitModal(false)}>
                Cancel
              </button>
              <button className="modal-btn confirm-btn" onClick={handleSubmitQuiz}>
                {quizData.isRetake ? 'Submit Retake' : 'Submit AI Quiz'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizInterface;