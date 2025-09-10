import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import MultipleChoiceQuestion from '../../Componets/Student/MultipleChoiceQuestion';
import TrueFalseQuestion from '../../Componets/Student/TrueFalseQuestion';

import './QuizInterface.css';

// Sample questions data
const sampleQuestions = [
  {
    id: 1,
    type: 'multiple_choice',
    question: 'What is a variable in programming?',
    choices: [
      { id: 1, text: 'A container that stores data values' },
      { id: 2, text: 'A type of function' },
      { id: 3, text: 'A programming language' },
      { id: 4, text: 'A computer component' }
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
    question: 'Which of the following is a valid variable name in most programming languages?',
    choices: [
      { id: 1, text: '2variable' },
      { id: 2, text: 'variable-name' },
      { id: 3, text: 'variable_name' },
      { id: 4, text: 'variable name' }
    ]
  }
];

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

  // Convert duration to seconds
  const getDurationInSeconds = (duration) => {
    if (typeof duration === 'string') {
      const match = duration.match(/(\d+)\s*min/);
      return match ? parseInt(match[1], 10) * 60 : 900; // default 15 minutes
    }
    return duration || 900;
  };

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(
    getDurationInSeconds(quizData.quizDuration)
  );
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [questions] = useState(sampleQuestions);

  // Timer effect
  useEffect(() => {
    if (timeRemaining > 0 && !isSubmitted) {
      const timer = setTimeout(() => {
        setTimeRemaining((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeRemaining === 0 && !isSubmitted) {
      // Auto-submit when time runs out
      handleSubmitQuiz();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRemaining, isSubmitted]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleAnswerSelect = (answer) => {
    setAnswers((prev) => ({
      ...prev,
      [questions[currentQuestionIndex].id]: answer
    }));
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

  const handleSubmitQuiz = () => {
    setIsSubmitted(true);
    setShowSubmitModal(false);

    // Calculate time used
    const timeUsed = getDurationInSeconds(quizData.quizDuration) - timeRemaining;

    // Here you would typically send answers to the backend
    console.log('Quiz submitted with answers:', answers);
    console.log('Quiz data:', quizData);

    // Navigate to results page
    setTimeout(() => {
      navigate('/QuizResultsPage', {
        state: {
          answers,
          questions,
          timeUsed,
          quizData,
          isRetake: quizData.isRetake || false
        }
      });
    }, 1000);
  };

  const getAnsweredCount = () => {
    return Object.keys(answers).length;
  };

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
        return <MultipleChoiceQuestion {...questionProps} choices={currentQuestion.choices} />;
      case 'true_false':
        return <TrueFalseQuestion {...questionProps} />;
      
      default:
        return <div>Unknown question type</div>;
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
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-interface-container">
      {/* Quiz Header */}
      <div className="quiz-header">
        <div className="quiz-info">
          <h1 className="quiz-title">{quizData.quizTitle}</h1>
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
