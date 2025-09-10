import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './QuizResultsPage.css';

const QuizResultsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showDetails, setShowDetails] = useState(false);
  
  // Get results data from navigation state
  const resultsData = location.state || {
    answers: {},
    questions: [],
    timeUsed: 0,
    quizData: {},
    isRetake: false
  };

  // Calculate results
  const calculateResults = () => {
    const { answers, questions } = resultsData;
    let correctAnswers = 0;
    let totalQuestions = questions.length;
    
    // Sample correct answers for demonstration
    const correctAnswersKey = {
      1: 1, // Multiple choice: first option
      2: true, // True/False: true
      3: "Variables store data that can change, constants store data that cannot change", // Short answer (simplified check)
      4: 3 // Multiple choice: third option
    };

    questions.forEach(question => {
      const userAnswer = answers[question.id];
      const correctAnswer = correctAnswersKey[question.id];
      
      if (question.type === 'short_answer') {
        // Simple keyword matching for short answers
        if (userAnswer && userAnswer.toLowerCase().includes('change')) {
          correctAnswers++;
        }
      } else {
        if (userAnswer === correctAnswer) {
          correctAnswers++;
        }
      }
    });

    const percentage = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
    const passed = percentage >= 50; // Assuming 50% is passing

    return {
      correctAnswers,
      totalQuestions,
      percentage,
      passed,
      timeUsed: resultsData.timeUsed || 0,
      correctAnswersKey
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

  const renderQuestionReview = (question, index) => {
    const userAnswer = resultsData.answers[question.id];
    const correctAnswer = results.correctAnswersKey[question.id];
    const isCorrect = question.type === 'short_answer' 
      ? userAnswer && userAnswer.toLowerCase().includes('change')
      : userAnswer === correctAnswer;

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
            {question.choices.map((choice, choiceIndex) => {
              const isSelected = userAnswer === choice.id;
              const isCorrectChoice = correctAnswer === choice.id;
              
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
            <div className={`tf-option ${userAnswer === true ? 'selected' : ''} ${correctAnswer === true ? 'correct-answer' : ''}`}>
              <span>True</span>
              {userAnswer === true && <span className="selected-mark">Your Answer</span>}
              {correctAnswer === true && <span className="correct-mark">Correct Answer</span>}
            </div>
            <div className={`tf-option ${userAnswer === false ? 'selected' : ''} ${correctAnswer === false ? 'correct-answer' : ''}`}>
              <span>False</span>
              {userAnswer === false && <span className="selected-mark">Your Answer</span>}
              {correctAnswer === false && <span className="correct-mark">Correct Answer</span>}
            </div>
          </div>
        )}
        
        {question.type === 'short_answer' && (
          <div className="short-answer-review">
            <div className="user-answer">
              <strong>Your Answer:</strong>
              <div className="answer-text">{userAnswer || 'No answer provided'}</div>
            </div>
            <div className="sample-answer">
              <strong>Sample Answer:</strong>
              <div className="answer-text">Variables store data that can change during program execution, while constants store data that remains fixed.</div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="quiz-results-container">
      <div className="results-content">
        {/* Header */}
        <div className="results-header">
          <h1>Quiz Results</h1>
          <p className="quiz-title">{resultsData.quizData.quizTitle}</p>
          {resultsData.isRetake && (
            <div className="retake-badge">Retake Attempt</div>
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
            <div className="stat-value">{results.percentage >= 80 ? 'Excellent' : results.percentage >= 70 ? 'Good' : results.percentage >= 50 ? 'Average' : 'Needs Improvement'}</div>
            <div className="stat-label">Performance</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="results-actions">
          <button 
            className="view-details-btn"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? 'Hide Details' : 'View Detailed Results'}
          </button>
          
          <button 
            className="home-btn"
            onClick={handleReturnHome}
          >
            Return to Dashboard
          </button>
        </div>

        {/* Detailed Results */}
        {showDetails && (
          <div className="detailed-results">
            <h3>Question by Question Review</h3>
            <div className="questions-review">
              {resultsData.questions.map((question, index) => 
                renderQuestionReview(question, index)
              )}
            </div>
          </div>
        )}

        {/* Performance Feedback */}
        <div className="performance-feedback">
          <h3>Performance Feedback</h3>
          <div className="feedback-content">
            {results.percentage >= 80 && (
              <p>Excellent work! You demonstrate a strong understanding of the material.</p>
            )}
            {results.percentage >= 70 && results.percentage < 80 && (
              <p>Good job! You have a solid grasp of most concepts with room for minor improvements.</p>
            )}
            {results.percentage >= 50 && results.percentage < 70 && (
              <p>You're on the right track, but consider reviewing the material and practicing more.</p>
            )}
            {results.percentage < 50 && (
              <p>This topic needs more attention. Review the course materials and consider seeking additional help.</p>
            )}
            
            {resultsData.isRetake && (
              <p><strong>Note:</strong> This was a retake attempt. Your highest score will be recorded.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizResultsPage;