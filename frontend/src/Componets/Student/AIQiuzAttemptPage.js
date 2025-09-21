import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getAdaptiveQuiz, submitAdaptiveQuiz } from '../../api/ai-quiz';
import './AIQuizAttemptPage.css';
import NavBar from "./NavBar";

const AIQuizAttemptPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { quizData } = location.state || {};
  
  const [quiz, setQuiz] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [quizStarted, setQuizStarted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!quizData?.slideId) {
      setError('No quiz data provided');
      setLoading(false);
      return;
    }

    const loadQuiz = async () => {
      try {
        setLoading(true);
        const response = await getAdaptiveQuiz(quizData.slideId);
        const quizDetails = response.data;
        
        setQuiz(quizDetails);
        setTimeLeft((quizDetails.estimated_duration || 15) * 60); // Convert to seconds
        
        // Initialize answers object
        const initialAnswers = {};
        quizDetails.questions?.forEach(q => {
          initialAnswers[q.id] = null;
        });
        setAnswers(initialAnswers);
        
      } catch (error) {
        console.error('Failed to load quiz:', error);
        setError('Failed to load quiz. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadQuiz();
  }, [quizData]);

  useEffect(() => {
    let timer;
    if (quizStarted && timeLeft > 0 && !quizCompleted) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleSubmitQuiz();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [quizStarted, timeLeft, quizCompleted]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartQuiz = () => {
    setQuizStarted(true);
  };

  const handleAnswerSelect = (questionId, answerIndex) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answerIndex
    }));
  };

  const handleSubmitQuiz = async () => {
    if (submitting) return;
    
    setSubmitting(true);
    try {
      const payload = {
        adaptive_quiz_id: quiz.id,
        answers: Object.entries(answers).map(([questionId, answer]) => ({
          question_id: parseInt(questionId),
          selected_answer: answer !== null ? answer : -1 // Handle unanswered questions
        }))
      };
      
      const response = await submitAdaptiveQuiz(payload);
      setResults(response.data);
      setQuizCompleted(true);
      
    } catch (error) {
      console.error('Failed to submit quiz:', error);
      setError('Failed to submit quiz. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNavigateQuestion = (direction) => {
    if (direction === 'next' && currentQuestion < quiz.questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else if (direction === 'prev' && currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const getAnsweredCount = () => {
    return Object.values(answers).filter(answer => answer !== null).length;
  };

  const getScoreColor = (score) => {
    if (score >= 90) return '#27AE60';
    if (score >= 70) return '#F39C12';
    if (score >= 50) return '#E67E22';
    return '#E74C3C';
  };

  const handleBackToQuizzes = () => {
    navigate('/ai-quizzes');
  };

  const handleRetakeQuiz = () => {
    // Reset quiz state
    setCurrentQuestion(0);
    setAnswers({});
    setQuizStarted(false);
    setQuizCompleted(false);
    setResults(null);
    setTimeLeft((quiz.estimated_duration || 15) * 60);
    
    // Reinitialize answers
    const initialAnswers = {};
    quiz.questions?.forEach(q => {
      initialAnswers[q.id] = null;
    });
    setAnswers(initialAnswers);
  };

  if (loading) {
    return (
      <div>
        <NavBar />
        <div className="quiz-attempt-container">
          <div className="loading-screen">
            <div className="loading-spinner"></div>
            <h2>Loading AI Quiz...</h2>
            <p>Preparing your personalized quiz experience</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <NavBar />
        <div className="quiz-attempt-container">
          <div className="error-screen">
            <div className="error-icon">⚠️</div>
            <h2>Oops! Something went wrong</h2>
            <p>{error}</p>
            <button onClick={handleBackToQuizzes} className="btn btn-primary">
              Back to Quizzes
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (quizCompleted && results) {
    return (
      <div>
        <NavBar />
        <div className="quiz-attempt-container">
          <div className="results-screen">
            <div className="results-header">
              <div className="score-circle" style={{ borderColor: getScoreColor(results.score) }}>
                <span className="score-number" style={{ color: getScoreColor(results.score) }}>
                  {results.score}%
                </span>
              </div>
              <h2>Quiz Completed!</h2>
              <p>{results.feedback}</p>
            </div>

            <div className="results-stats">
              <div className="stat-item">
                <span className="stat-label">Questions Answered</span>
                <span className="stat-value">{results.correct_answers} / {results.total_questions}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Time Taken</span>
                <span className="stat-value">{results.time_taken} minutes</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Accuracy</span>
                <span className="stat-value">{Math.round((results.correct_answers / results.total_questions) * 100)}%</span>
              </div>
            </div>

            <div className="results-actions">
              <button onClick={handleBackToQuizzes} className="btn btn-secondary">
                Back to Quizzes
              </button>
              <button onClick={handleRetakeQuiz} className="btn btn-primary">
                Retake Quiz
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!quizStarted) {
    return (
      <div>
        <NavBar />
        <div className="quiz-attempt-container">
          <div className="quiz-intro">
            <button onClick={handleBackToQuizzes} className="back-button">
              ← Back to Quizzes
            </button>

            <div className="intro-content">
              <div className="quiz-icon">🤖</div>
              <h1>{quiz.title}</h1>
              <p className="quiz-topic">{quiz.topic_name}</p>
              
              <div className="quiz-details">
                <div className="detail-item">
                  <span className="detail-label">Questions</span>
                  <span className="detail-value">{quiz.total_questions || quiz.questions?.length}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Duration</span>
                  <span className="detail-value">{quiz.estimated_duration} min</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Difficulty</span>
                  <span className="detail-value">{quiz.difficulty_level}</span>
                </div>
              </div>

              <div className="quiz-instructions">
                <h3>Instructions:</h3>
                <ul>
                  <li>Read each question carefully</li>
                  <li>Select the best answer for each question</li>
                  <li>You can navigate between questions</li>
                  <li>Submit when you're ready or when time runs out</li>
                </ul>
              </div>

              <button onClick={handleStartQuiz} className="start-quiz-btn">
                🚀 Start Quiz
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentQ = quiz.questions[currentQuestion];
  const progress = ((currentQuestion + 1) / quiz.questions.length) * 100;

  return (
    <div>
      <NavBar />
      <div className="quiz-attempt-container">
        {/* Quiz Header */}
        <div className="quiz-header">
          <div className="quiz-info">
            <button onClick={handleBackToQuizzes} className="exit-button">
              ← Exit Quiz
            </button>
            <h2>{quiz.title}</h2>
          </div>
          
          <div className="quiz-controls">
            <div className="timer">
              🕒 {formatTime(timeLeft)}
            </div>
            <div className="progress-info">
              {getAnsweredCount()} / {quiz.questions.length} answered
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="progress-container">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <span className="progress-text">
            Question {currentQuestion + 1} of {quiz.questions.length}
          </span>
        </div>

        {/* Question Content */}
        <div className="question-container">
          <div className="question-header">
            <h3>Question {currentQuestion + 1}</h3>
            {answers[currentQ.id] !== null && (
              <span className="answered-indicator">✓ Answered</span>
            )}
          </div>
          
          <div className="question-text">
            {currentQ.question}
          </div>

          <div className="options-container">
            {currentQ.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswerSelect(currentQ.id, index)}
                className={`option-button ${
                  answers[currentQ.id] === index ? 'selected' : ''
                }`}
              >
                <div className="option-indicator">
                  {answers[currentQ.id] === index && <div className="selected-dot"></div>}
                </div>
                <span className="option-text">{option}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="navigation-container">
          <button
            onClick={() => handleNavigateQuestion('prev')}
            disabled={currentQuestion === 0}
            className="nav-button nav-prev"
          >
            ← Previous
          </button>

          <div className="question-indicators">
            {quiz.questions.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentQuestion(index)}
                className={`question-indicator ${
                  index === currentQuestion ? 'current' : ''
                } ${
                  answers[quiz.questions[index].id] !== null ? 'answered' : ''
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>

          {currentQuestion === quiz.questions.length - 1 ? (
            <button
              onClick={handleSubmitQuiz}
              disabled={submitting}
              className="submit-button"
            >
              {submitting ? 'Submitting...' : 'Submit Quiz'}
            </button>
          ) : (
            <button
              onClick={() => handleNavigateQuestion('next')}
              className="nav-button nav-next"
            >
              Next →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIQuizAttemptPage;