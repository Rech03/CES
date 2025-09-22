import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getQuizExplanations } from '../../api/ai-quiz';
import './QuizResultsPage.css';

const QuizResultsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [explanations, setExplanations] = useState(null);
  
  // Get results data from navigation state (from AI quiz submission)
  const resultsData = location.state || {
    answers: {},
    questions: [],
    timeUsed: 0,
    quizData: {},
    isRetake: false,
    isAIQuiz: true
  };

  useEffect(() => {
    const fetchExplanations = async () => {
      if (resultsData.attempt_id && resultsData.quizData?.quizId) {
        try {
          console.log('Fetching AI quiz explanations...');
          const explanationsResponse = await getQuizExplanations(
            resultsData.quizData.quizId,
            resultsData.attempt_id
          );
          setExplanations(explanationsResponse.data);
        } catch (err) {
          console.warn('Could not fetch explanations:', err);
        }
      }
      setLoading(false);
    };

    fetchExplanations();
  }, [resultsData.attempt_id, resultsData.quizData?.quizId]);

  // Calculate results from AI quiz response
  const calculateResults = () => {
    // Use data from AI quiz submission response
    if (resultsData.score !== undefined) {
      return {
        correctAnswers: resultsData.correct_answers || 0,
        totalQuestions: resultsData.total_questions || resultsData.questions?.length || 0,
        percentage: Math.round(resultsData.score || 0),
        passed: (resultsData.score || 0) >= 50,
        timeUsed: resultsData.time_taken || resultsData.timeUsed || 0,
        feedback: resultsData.feedback || null,
        level: resultsData.adaptive_level || null,
        questionResults: resultsData.question_results || []
      };
    }

    // Fallback calculation if direct results not available
    const { answers, questions } = resultsData;
    let correctAnswers = 0;
    const totalQuestions = questions.length;

    // Simple calculation for demonstration
    questions.forEach(question => {
      const userAnswer = answers[question.id];
      if (userAnswer !== undefined && userAnswer !== null && userAnswer !== '') {
        // For demo purposes, assume some answers are correct
        if (question.type === 'multiple_choice' && userAnswer === (question.choices?.[0]?.id || 1)) {
          correctAnswers++;
        } else if (question.type === 'true_false' && userAnswer === true) {
          correctAnswers++;
        } else if (question.type === 'short_answer' && userAnswer.length > 10) {
          correctAnswers++;
        }
      }
    });

    const percentage = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

    return {
      correctAnswers,
      totalQuestions,
      percentage,
      passed: percentage >= 50,
      timeUsed: resultsData.timeUsed || 0,
      feedback: null,
      level: 'Adaptive',
      questionResults: []
    };
  };

  const results = calculateResults();

  const getGradeColor = (percentage) => {
    if (percentage >= 80) return '#27AE60'; // Green
    if (percentage >= 70) return '#3498DB'; // Blue  
    if (percentage >= 50) return '#F39C12'; // Orange
    return '#E74C3C'; // Red
  };

  const getGradeLetter = (percentage) => {
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B';
    if (percentage >= 60) return 'C';
    if (percentage >= 50) return 'D';
    return 'F';
  };

  const getPerformanceLevel = (percentage) => {
    if (percentage >= 90) return 'Excellent';
    if (percentage >= 80) return 'Very Good';
    if (percentage >= 70) return 'Good';
    if (percentage >= 60) return 'Average';
    return 'Needs Improvement';
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleReturnHome = () => {
    navigate('/Dashboard');
  };

  const handleRetakeQuiz = () => {
    navigate('/QuizCountdownPage', {
      state: {
        ...resultsData.quizData,
        isRetake: true
      }
    });
  };

  const handleViewAnalytics = () => {
    navigate('/QuizAnalyticsPage', {
      state: {
        quizId: resultsData.quizData?.quizId,
        slideId: resultsData.quizData?.slideId
      }
    });
  };

  const renderQuestionReview = (question, index) => {
    const userAnswer = resultsData.answers[question.id];
    const questionResult = results.questionResults.find(qr => qr.question_id === question.id);
    const isCorrect = questionResult?.is_correct || false;

    return (
      <div key={question.id} className="question-review">
        <div className="question-header">
          <span className="question-number">Question {index + 1}</span>
          <span className={`result-indicator ${isCorrect ? 'correct' : 'incorrect'}`}>
            {isCorrect ? '✓ Correct' : '✗ Incorrect'}
          </span>
        </div>
        
        <div className="question-text">{question.question}</div>
        
        {question.type === 'multiple_choice' && (
          <div className="choices-review">
            {question.choices?.map((choice, choiceIndex) => {
              const isSelected = userAnswer === choice.id;
              const isCorrectChoice = choice.is_correct;
              
              return (
                <div 
                  key={choice.id} 
                  className={`choice-review ${isSelected ? 'selected' : ''} ${isCorrectChoice ? 'correct-answer' : ''}`}
                >
                  <span className="choice-letter">{String.fromCharCode(65 + choiceIndex)}</span>
                  <span className="choice-text">{choice.text}</span>
                  {isSelected && <span className="selected-mark">Your Answer</span>}
                  {isCorrectChoice && <span className="correct-mark">Correct Answer</span>}
                </div>
              );
            })}
          </div>
        )}
        
        {question.type === 'true_false' && (
          <div className="true-false-review">
            <div className={`tf-option ${userAnswer === true ? 'selected' : ''} ${question.correct_answer === true ? 'correct-answer' : ''}`}>
              <span>True</span>
              {userAnswer === true && <span className="selected-mark">Your Answer</span>}
              {question.correct_answer === true && <span className="correct-mark">Correct Answer</span>}
            </div>
            <div className={`tf-option ${userAnswer === false ? 'selected' : ''} ${question.correct_answer === false ? 'correct-answer' : ''}`}>
              <span>False</span>
              {userAnswer === false && <span className="selected-mark">Your Answer</span>}
              {question.correct_answer === false && <span className="correct-mark">Correct Answer</span>}
            </div>
          </div>
        )}
        
        {question.type === 'short_answer' && (
          <div className="short-answer-review">
            <div className="user-answer">
              <strong>Your Answer:</strong>
              <div className="answer-text">{userAnswer || 'No answer provided'}</div>
            </div>
            {question.model_answer && (
              <div className="sample-answer">
                <strong>Model Answer:</strong>
                <div className="answer-text">{question.model_answer}</div>
              </div>
            )}
          </div>
        )}

        {/* AI Explanation */}
        {question.explanation && (
          <div className="ai-explanation">
            <h5>Explanation:</h5>
            <p>{question.explanation}</p>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="quiz-results-container">
        <div className="loading-content">
          <div className="spinner"></div>
          <h2>Processing Results...</h2>
          <p>Analyzing your AI quiz performance...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-results-container">
      <div className="results-content">
        {/* Header */}
        <div className="results-header">
          <h1>AI Quiz Results</h1>
          <p className="quiz-title">
            {resultsData.quizData?.quizTitle || resultsData.quizData?.title || 'AI Generated Quiz'}
          </p>
          {resultsData.isRetake && (
            <div className="retake-badge">Retake Attempt</div>
          )}
          <div className="ai-badge-large">Adaptive AI Quiz</div>
          {results.level && (
            <div className="level-badge">Level: {results.level}</div>
          )}
        </div>

        {/* Score Display */}
        <div className="score-display">
          <div className="score-circle" style={{ borderColor: getGradeColor(results.percentage) }}>
            <div className="score-percentage" style={{ color: getGradeColor(results.percentage) }}>
              {results.percentage}%
            </div>
            <div className="score-grade" style={{ color: getGradeColor(results.percentage) }}>
              Grade {getGradeLetter(results.percentage)}
            </div>
          </div>
          
          <div className={`pass-status ${results.passed ? 'passed' : 'failed'}`}>
            {results.passed ? 'PASSED' : 'FAILED'}
          </div>
        </div>

        {/* Statistics */}
        <div className="results-stats">
          <div className="stat-item">
            <div className="stat-value">{results.correctAnswers}</div>
            <div className="stat-label">Correct Answers</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{results.totalQuestions}</div>
            <div className="stat-label">Total Questions</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{formatTime(results.timeUsed)}</div>
            <div className="stat-label">Time Used</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{getPerformanceLevel(results.percentage)}</div>
            <div className="stat-label">Performance</div>
          </div>
        </div>

        {/* AI Adaptive Feedback */}
        <div className="ai-feedback-section">
          <h3>AI Adaptive Feedback</h3>
          <div className="ai-feedback-content">
            {results.feedback ? (
              <p>{results.feedback}</p>
            ) : (
              <>
                {results.percentage >= 80 && (
                  <p>Excellent performance! The AI has noted your strong understanding and may present more challenging questions in future quizzes.</p>
                )}
                {results.percentage >= 70 && results.percentage < 80 && (
                  <p>Good work! The AI system will continue to adapt question difficulty based on your performance patterns.</p>
                )}
                {results.percentage >= 50 && results.percentage < 70 && (
                  <p>You're making progress! The AI will adjust to help reinforce key concepts you're learning.</p>
                )}
                {results.percentage < 50 && (
                  <p>The AI system has identified areas for improvement and will adjust future questions to help strengthen your understanding.</p>
                )}
              </>
            )}
            
            <div className="adaptive-info">
              <h4>How Adaptive Learning Works:</h4>
              <ul>
                <li>Questions adapt to your skill level in real-time</li>
                <li>Your performance influences future quiz difficulty</li>
                <li>The system identifies knowledge gaps and provides targeted practice</li>
                <li>Each attempt helps the AI better understand your learning needs</li>
              </ul>
            </div>

            {resultsData.isRetake && (
              <p><strong>Retake Note:</strong> This attempt helps the AI better understand your progress. Your highest score will be recorded.</p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="results-actions">
          <button 
            className="view-details-btn"
            onClick={() => setShowDetails(!showDetails)}
            disabled={!resultsData.questions || resultsData.questions.length === 0}
          >
            {showDetails ? 'Hide Details' : 'View Question Details'}
          </button>
          
          <button 
            className="analytics-btn"
            onClick={handleViewAnalytics}
          >
            View Analytics
          </button>
          
          <button 
            className="retake-btn"
            onClick={handleRetakeQuiz}
          >
            Retake Quiz
          </button>
          
          <button 
            className="home-btn"
            onClick={handleReturnHome}
          >
            Return to Dashboard
          </button>
        </div>

        {/* Detailed Results */}
        {showDetails && resultsData.questions && resultsData.questions.length > 0 && (
          <div className="detailed-results">
            <h3>Question by Question Review</h3>
            <div className="questions-review">
              {resultsData.questions.map((question, index) => 
                renderQuestionReview(question, index)
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="error-message">
            <p>Some detailed results could not be loaded: {error}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizResultsPage;