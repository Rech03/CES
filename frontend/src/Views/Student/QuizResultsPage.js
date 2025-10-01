import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './QuizResultsPage.css';

const MAX_ATTEMPTS = 3;

const QuizResultsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(true);

  const resultsData = location.state || {};

  useEffect(() => {
    setLoading(false);
  }, []);

  // Calculate results from backend response
  const calculateResults = () => {
    // Backend provides: score, correct_count, total_questions, explanations array
    const percentage = Math.round(resultsData.score || 0);
    const correctAnswers = resultsData.correct_count || 0;
    const totalQuestions = resultsData.total_questions || resultsData.questions?.length || 0;
    const timeUsed = resultsData.time_taken || resultsData.timeUsed || 0;
    
    // Get attempt info
    const attemptsMeta = resultsData.attempts_meta || {};
    const attemptNumber = attemptsMeta.attempt_number || 1;
    const isFinalAttempt = attemptsMeta.is_final_attempt || attemptNumber >= MAX_ATTEMPTS;
    const nextLevelUnlocked = attemptsMeta.next_level_unlocked || false;
    const nextLevelInfo = attemptsMeta.next_level_info || null;

    return {
      percentage,
      correctAnswers,
      totalQuestions,
      timeUsed,
      passed: percentage >= 50,
      feedback: resultsData.feedback || null,
      attemptNumber,
      isFinalAttempt,
      canRetake: !isFinalAttempt,
      nextLevelUnlocked,
      nextLevelInfo,
      questionResults: resultsData.question_results || []
    };
  };

  const results = calculateResults();

  const getGradeColor = (percentage) => {
    if (percentage >= 80) return '#27AE60';
    if (percentage >= 70) return '#3498DB';
    if (percentage >= 50) return '#F39C12';
    return '#E74C3C';
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
    const minutes = Math.floor((seconds || 0) / 60);
    const remainingSeconds = (seconds || 0) % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleReturnHome = () => {
    navigate('/StudentDashboard');
  };

  const handleRetakeQuiz = () => {
    if (!results.canRetake) return;
    
    navigate('/QuizInterface', {
      state: {
        ...resultsData.quizData,
        isRetake: true
      }
    });
  };

  const handleNextLevel = () => {
    if (!results.nextLevelInfo) return;
    
    navigate('/QuizInterface', {
      state: {
        quizId: results.nextLevelInfo.quiz_id,
        slideId: results.nextLevelInfo.slide_id,
        quizTitle: `${results.nextLevelInfo.topic_name} - ${results.nextLevelInfo.difficulty.toUpperCase()}`,
        difficulty: results.nextLevelInfo.difficulty
      }
    });
  };

  const handleViewAnalytics = () => {
    navigate('/QuizAnalyticsPage');
  };

  const renderQuestionReview = (question, index) => {
    // Get the letter answer that was submitted (from answersDict)
    const userAnswerLetter = resultsData.answersDict?.[String(index)];
    
    // Get explanation data from API response
    const explanation = (resultsData.explanations || []).find(
      exp => exp.question_number === index
    );
    
    const isCorrect = explanation?.is_correct || false;
    const correctAnswerLetter = explanation?.correct_answer || null;

    return (
      <div key={question.id || index} className="question-review">
        <div className="question-header">
          <span className="question-number">Question {index + 1}</span>
          <span className={`result-indicator ${isCorrect ? 'correct' : 'incorrect'}`}>
            {isCorrect ? '✓ Correct' : '✗ Incorrect'}
          </span>
        </div>

        <div className="question-text">
          {explanation?.question || question.question}
        </div>

        <div className="choices-review">
          {question.choices?.map((choice, choiceIndex) => {
            const choiceLetter = String.fromCharCode(65 + choiceIndex);
            const isSelected = userAnswerLetter === choiceLetter;
            const isCorrectChoice = correctAnswerLetter === choiceLetter;
            
            return (
              <div
                key={choice.id || choiceIndex}
                className={`choice-review ${isSelected ? 'selected' : ''} ${isCorrectChoice ? 'correct-answer' : ''}`}
              >
                <span className="choice-letter">{choiceLetter}</span>
                <span className="choice-text">{choice.text}</span>
                {isSelected && <span className="selected-mark">Your Answer</span>}
                {isCorrectChoice && <span className="correct-mark">Correct Answer</span>}
              </div>
            );
          })}
        </div>

        {explanation?.explanation && (
          <div className="explanation">
            <h5>Explanation:</h5>
            <p>{explanation.explanation}</p>
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
          <p>Preparing your performance summary...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-results-container">
      <div className="results-content">
        {/* Header */}
        <div className="results-header">
          <h1>Quiz Results</h1>
          <p className="quiz-title">
            {resultsData.quizData?.quizTitle || 'Quiz'}
          </p>
          <p className="attempt-info">
            Attempt {results.attemptNumber} of {MAX_ATTEMPTS}
          </p>
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

        {/* Final Attempt Message */}
        {results.isFinalAttempt && (
          <div className="final-attempt-message">
            <h3>Final Attempt Completed</h3>
            <p>
              You have completed all {MAX_ATTEMPTS} attempts for this quiz. 
              {results.nextLevelUnlocked 
                ? ' You can now proceed to the next difficulty level!' 
                : ' You can view your detailed results below.'}
            </p>
          </div>
        )}

        {/* Feedback Section */}
        <div className="feedback-section">
          <h3>Feedback</h3>
          <div className="feedback-content">
            {results.feedback ? (
              <p>{results.feedback}</p>
            ) : (
              <>
                {results.percentage >= 80 && (
                  <p>Excellent performance! You've demonstrated strong understanding of the material.</p>
                )}
                {results.percentage >= 70 && results.percentage < 80 && (
                  <p>Good work! You're showing solid progress. Review the areas you missed.</p>
                )}
                {results.percentage >= 50 && results.percentage < 70 && (
                  <p>You passed, but there's room for improvement. Review the questions you got wrong.</p>
                )}
                {results.percentage < 50 && (
                  <p>Keep practicing! Review the material and focus on the concepts you struggled with.</p>
                )}
              </>
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


          {results.nextLevelUnlocked && results.nextLevelInfo && (
            <button
              className="next-level-btn"
              onClick={handleNextLevel}
              style={{
                background: 'linear-gradient(135deg, #27AE60 0%, #2ECC71 100%)',
                color: 'white',
                fontWeight: '600'
              }}
            >
              Proceed to {results.nextLevelInfo.difficulty.toUpperCase()} Level →
            </button>
          )}

          <button className="home-btn" onClick={handleReturnHome}>
            Return to Dashboard
          </button>
        </div>

        {/* Detailed Results */}
        {showDetails && resultsData.questions && resultsData.questions.length > 0 && (
          <div className="detailed-results">
            <h3>Question by Question Review</h3>
            <div className="questions-review">
              {resultsData.questions.map((q, i) => renderQuestionReview(q, i))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizResultsPage;