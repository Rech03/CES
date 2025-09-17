import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { startQuizAttempt, submitAnswer, submitQuizAttempt } from '../../api/quizzes';
import { getAdaptiveQuiz, submitAdaptiveQuiz } from '../../api/ai-quiz';
import { getQuizQuestions } from '../../api/quizzes';
import MultipleChoiceQuestion from '../../Componets/Student/MultipleChoiceQuestion';
import TrueFalseQuestion from '../../Componets/Student/TrueFalseQuestion';
import ShortAnswerQuestion from '../../Componets/Student/ShortAnswerQuestion';
import './QuizInterface.css';

const QuizInterface = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Get quiz data from navigation state
  const quizData = location.state || {
    quizTitle: 'CSC3002F - Parallel Programming Quiz',
    quizDuration: '15 min',
    totalQuestions: 20,
    quizId: 1
  };

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(
    getDurationInSeconds(quizData.quizDuration)
  );
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [attemptId, setAttemptId] = useState(null);

  // Convert duration to seconds
  function getDurationInSeconds(duration) {
    if (typeof duration === 'string') {
      const match = duration.match(/(\d+)\s*min/);
      return match ? parseInt(match[1], 10) * 60 : 900; // default 15 minutes
    }
    return duration || 900;
  }

  useEffect(() => {
    const initializeQuiz = async () => {
      setLoading(true);
      try {
        let fetchedQuestions = [];
        let quizAttemptId = null;

        // Handle AI-generated quiz
        if (quizData.isAIGenerated && quizData.slideId) {
          try {
            const adaptiveResponse = await getAdaptiveQuiz(quizData.slideId);
            const adaptiveQuiz = adaptiveResponse.data;
            
            fetchedQuestions = adaptiveQuiz.questions || [];
            setTimeRemaining(getDurationInSeconds(adaptiveQuiz.duration || quizData.quizDuration));
          } catch (aiErr) {
            console.error('Error fetching AI quiz:', aiErr);
            setError('Failed to load AI quiz');
          }
        }
        // Handle regular quiz
        else if (quizData.quizId) {
          try {
            // Start quiz attempt
            const attemptResponse = await startQuizAttempt({
              quiz: quizData.quizId,
              password: quizData.password || null
            });
            
            quizAttemptId = attemptResponse.data.attempt_id || attemptResponse.data.id;
            setAttemptId(quizAttemptId);

            // Fetch quiz questions
            const questionsResponse = await getQuizQuestions(quizData.quizId);
            fetchedQuestions = questionsResponse.data.results || questionsResponse.data || [];
            
          } catch (quizErr) {
            console.error('Error starting quiz:', quizErr);
            setError('Failed to start quiz');
          }
        }

        // Process questions into consistent format
        const processedQuestions = fetchedQuestions.map((q, index) => ({
          id: q.id || index + 1,
          type: q.question_type || q.type || 'multiple_choice',
          question: q.question_text || q.text || q.question,
          choices: q.choices || q.options || [],
          points: q.points || 1,
          order: q.order || index + 1
        }));

        setQuestions(processedQuestions);

        // Fallback to sample questions if no questions loaded
        if (processedQuestions.length === 0) {
          const sampleQuestions = [
            {
              id: 1,
              type: 'multiple_choice',
              question: 'What is a variable in programming?',
              choices: [
                { id: 1, text: 'A container that stores data values', choice_text: 'A container that stores data values' },
                { id: 2, text: 'A type of function', choice_text: 'A type of function' },
                { id: 3, text: 'A programming language', choice_text: 'A programming language' },
                { id: 4, text: 'A computer component', choice_text: 'A computer component' }
              ]
            },
            {
              id: 2,
              type: 'true_false',
              question: 'Variables in most programming languages are case-sensitive.'
            },
            {
              id: 3,
              type: 'multiple_choice',
              question: 'Which of the following is a valid variable name?',
              choices: [
                { id: 1, text: '2variable', choice_text: '2variable' },
                { id: 2, text: 'variable-name', choice_text: 'variable-name' },
                { id: 3, text: 'variable_name', choice_text: 'variable_name' },
                { id: 4, text: 'variable name', choice_text: 'variable name' }
              ]
            }
          ];
          setQuestions(sampleQuestions);
        }

      } catch (err) {
        console.error('Error initializing quiz:', err);
        setError('Failed to initialize quiz');
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

    // Submit answer to API for regular quizzes
    if (attemptId && !quizData.isAIGenerated) {
      try {
        await submitAnswer({
          attempt_id: attemptId,
          question: currentQuestion.id,
          selected_choice: typeof answer === 'number' ? answer : null,
          answer_text: typeof answer === 'string' ? answer : null
        });
      } catch (err) {
        console.warn('Failed to submit answer:', err);
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

    const timeUsed = getDurationInSeconds(quizData.quizDuration) - timeRemaining;

    try {
      // Submit AI quiz
      if (quizData.isAIGenerated && quizData.slideId) {
        await submitAdaptiveQuiz({
          adaptive_quiz_id: quizData.slideId,
          answers: Object.entries(answers).map(([questionId, answer]) => ({
            question_id: parseInt(questionId),
            answer: answer
          }))
        });
      }
      // Submit regular quiz
      else if (attemptId) {
        await submitQuizAttempt({
          attempt_id: attemptId
        });
      }

      console.log('Quiz submitted successfully');
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
    }, 1000);
  };

  const getAnsweredCount = () => {
    return Object.keys(answers).length;
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
      isSubmitted
    };

    switch (currentQuestion.type) {
      case 'multiple_choice':
        return (
          <MultipleChoiceQuestion 
            {...questionProps} 
            choices={currentQuestion.choices.map(choice => ({
              id: choice.id,
              text: choice.text || choice.choice_text || choice.answer_text
            }))}
          />
        );
      case 'true_false':
        return <TrueFalseQuestion {...questionProps} />;
      case 'short_answer':
        return <ShortAnswerQuestion {...questionProps} />;
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
            <p>
              <strong>Retake completed - your best score will be kept</strong>
            </p>
          )}
          {quizData.isAIGenerated && (
            <p>
              <strong>AI Quiz completed - difficulty will adapt based on your performance</strong>
            </p>
          )}
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
            <span>
              Question {currentQuestionIndex + 1} of {questions.length}
            </span>
            <span>•</span>
            <span>{getAnsweredCount()} answered</span>
            {quizData.isRetake && (
              <>
                <span>•</span>
                <span className="retake-indicator">Retake Attempt</span>
              </>
            )}
            {quizData.isAIGenerated && (
              <>
                <span>•</span>
                <span className="ai-indicator">AI Generated</span>
              </>
            )}
          </div>
        </div>

        <div className="quiz-timer">
          <div
            className={`timer ${timeRemaining < 300 ? 'warning' : ''} ${
              timeRemaining < 60 ? 'critical' : ''
            }`}
          >
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
            <button className="nav-btn submit-btn" onClick={() => setShowSubmitModal(true)}>
              {quizData.isRetake ? 'Submit Retake' : 'Submit Quiz'}
            </button>
          ) : (
            <button className="nav-btn next-btn" onClick={handleNextQuestion}>
              Next →
            </button>
          )}
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      {showSubmitModal && (
        <div className="modal-overlay">
          <div className="submit-modal">
            <h3>{quizData.isRetake ? 'Submit Retake?' : 'Submit Quiz?'}</h3>
            <p>
              You have answered {getAnsweredCount()} out of {questions.length} questions.
            </p>
            <p>
              Are you sure you want to submit your {quizData.isRetake ? 'retake' : 'quiz'}? This
              action cannot be undone.
            </p>
            {quizData.isRetake && (
              <p>
                <strong>Note: Your best score will be kept regardless of this attempt.</strong>
              </p>
            )}
            {quizData.isAIGenerated && (
              <p>
                <strong>Note: AI will adapt future quiz difficulty based on this performance.</strong>
              </p>
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