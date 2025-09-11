import React, { useState, useEffect } from 'react';
import './QuizResultsDisplay.css';

const QuizResultsDisplay = ({ quizId = 1 }) => {
  const [resultsData, setResultsData] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(true);

  // Mock quiz results data - replace with actual API call
  useEffect(() => {
    const mockResultsData = {
      quizInfo: {
        quizTitle: "JavaScript Fundamentals Quiz",
        quizId: quizId,
        dateTaken: "2024-09-10",
        timeTaken: 420, // seconds
        isRetake: false
      },
      answers: {
        1: 1, // Selected choice ID
        2: true,
        3: "Variables store data that can change",
        4: 2
      },
      questions: [
        {
          id: 1,
          type: 'multiple_choice',
          question: 'What is the correct way to declare a variable in JavaScript?',
          choices: [
            { id: 1, text: 'var myVariable;' },
            { id: 2, text: 'variable myVariable;' },
            { id: 3, text: 'v myVariable;' },
            { id: 4, text: 'declare myVariable;' }
          ]
        },
        {
          id: 2,
          type: 'true_false',
          question: 'JavaScript is a case-sensitive programming language.'
        },
        {
          id: 3,
          type: 'short_answer',
          question: 'Explain the difference between var and let in JavaScript.'
        },
        {
          id: 4,
          type: 'multiple_choice',
          question: 'Which method is used to add an element to the end of an array?',
          choices: [
            { id: 1, text: 'append()' },
            { id: 2, text: 'push()' },
            { id: 3, text: 'add()' },
            { id: 4, text: 'insert()' }
          ]
        }
      ]
    };

    setTimeout(() => {
      setResultsData(mockResultsData);
      setLoading(false);
    }, 1000);
  }, [quizId]);

  // Calculate results
  const calculateResults = () => {
    if (!resultsData) return null;

    const { answers, questions } = resultsData;
    let correctAnswers = 0;
    let totalQuestions = questions.length;
    
    // Correct answers key
    const correctAnswersKey = {
      1: 1, // var myVariable;
      2: true, // JavaScript is case-sensitive
      3: "Variables store data that can change", // Sample answer
      4: 2 // push()
    };

    questions.forEach(question => {
      const userAnswer = answers[question.id];
      const correctAnswer = correctAnswersKey[question.id];
      
      if (question.type === 'short_answer') {
        if (userAnswer && userAnswer.toLowerCase().includes('var')) {
          correctAnswers++;
        }
      } else {
        if (userAnswer === correctAnswer) {
          correctAnswers++;
        }
      }
    });

    const percentage = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
    const passed = percentage >= 50;

    return {
      correctAnswers,
      totalQuestions,
      percentage,
      passed,
      timeUsed: resultsData.quizInfo.timeTaken || 0,
      correctAnswersKey
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

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const renderQuestionReview = (question, index) => {
    const userAnswer = resultsData.answers[question.id];
    const correctAnswer = results.correctAnswersKey[question.id];
    const isCorrect = question.type === 'short_answer' 
      ? userAnswer && userAnswer.toLowerCase().includes('var')
      : userAnswer === correctAnswer;

    return (
      <div key={question.id} className="question-review-compact">
        <div className="question-header-compact">
          <span className="question-number-compact">Q{index + 1}</span>
          <span className={`result-indicator-compact ${isCorrect ? 'correct' : 'incorrect'}`}>
            {isCorrect ? '✓' : '✗'}
          </span>
        </div>
        
        <div className="question-text-compact">{question.question}</div>
        
        {question.type === 'multiple_choice' && (
          <div className="choices-review-compact">
            {question.choices.map((choice, choiceIndex) => {
              const isSelected = userAnswer === choice.id;
              const isCorrectChoice = correctAnswer === choice.id;
              
              return (
                <div 
                  key={choice.id} 
                  className={`choice-review-compact ${isSelected ? 'selected' : ''} ${isCorrectChoice ? 'correct-answer' : ''}`}
                >
                  <span className="choice-letter-compact">{String.fromCharCode(65 + choiceIndex)}</span>
                  <span className="choice-text-compact">{choice.text}</span>
                  {isSelected && <span className="selected-mark-compact">Your</span>}
                  {isCorrectChoice && <span className="correct-mark-compact">✓</span>}
                </div>
              );
            })}
          </div>
        )}
        
        {question.type === 'true_false' && (
          <div className="true-false-review-compact">
            <div className={`tf-option-compact ${userAnswer === true ? 'selected' : ''} ${correctAnswer === true ? 'correct-answer' : ''}`}>
              <span>True</span>
              {userAnswer === true && <span className="selected-mark-compact">Your</span>}
              {correctAnswer === true && <span className="correct-mark-compact">✓</span>}
            </div>
            <div className={`tf-option-compact ${userAnswer === false ? 'selected' : ''} ${correctAnswer === false ? 'correct-answer' : ''}`}>
              <span>False</span>
              {userAnswer === false && <span className="selected-mark-compact">Your</span>}
              {correctAnswer === false && <span className="correct-mark-compact">✓</span>}
            </div>
          </div>
        )}
        
        {question.type === 'short_answer' && (
          <div className="short-answer-review-compact">
            <div className="user-answer-compact">
              <strong>Your Answer:</strong> {userAnswer || 'No answer provided'}
            </div>
            <div className="sample-answer-compact">
              <strong>Expected:</strong> Variables declared with 'var' are function-scoped, while 'let' is block-scoped.
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="quiz-results-display">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading quiz results...</p>
        </div>
      </div>
    );
  }

  if (!resultsData || !results) {
    return (
      <div className="quiz-results-display">
        <div className="error-message">
          <p>Unable to load quiz results</p>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-results-display">
      {/* Header */}
      <div className="results-header-compact">
        <h2>Quiz Results</h2>
        <div className="quiz-info-compact">
          <span className="quiz-title-compact">{resultsData.quizInfo.quizTitle}</span>
          <span className="quiz-date-compact">{formatDate(resultsData.quizInfo.dateTaken)}</span>
          {resultsData.quizInfo.isRetake && (
            <span className="retake-badge-compact">Retake</span>
          )}
        </div>
      </div>

      {/* Score Summary */}
      <div className="score-summary">
        <div className="score-main">
          <div 
            className="score-circle-display" 
            style={{ borderColor: getGradeColor(results.percentage) }}
          >
            <div className="score-percentage-display" style={{ color: getGradeColor(results.percentage) }}>
              {results.percentage}%
            </div>
            <div className="score-grade-display" style={{ color: getGradeColor(results.percentage) }}>
              Grade {getGradeLetter(results.percentage)}
            </div>
          </div>
        </div>
        
        <div className="score-stats">
          <div className="stat-compact">
            <span className="stat-value-display">{results.correctAnswers}/{results.totalQuestions}</span>
            <span className="stat-label-display">Correct</span>
          </div>
          <div className="stat-compact">
            <span className="stat-value-display">{formatTime(results.timeUsed)}</span>
            <span className="stat-label-display">Time</span>
          </div>
          <div className="stat-compact">
            <span className={`stat-value-display ${results.passed ? 'passed' : 'failed'}`}>
              {results.passed ? 'PASSED' : 'FAILED'}
            </span>
            <span className="stat-label-display">Status</span>
          </div>
        </div>
      </div>

      {/* Toggle Details Button */}
      <div className="toggle-details">
        <button 
          className="toggle-btn"
          onClick={() => setShowDetails(!showDetails)}
        >
          {showDetails ? 'Hide Details' : 'View Question Details'}
        </button>
      </div>

      {/* Detailed Results */}
      {showDetails && (
        <div className="detailed-results-compact">
          <h3>Question Review</h3>
          <div className="questions-review-compact">
            {resultsData.questions.map((question, index) => 
              renderQuestionReview(question, index)
            )}
          </div>
        </div>
      )}

      {/* Performance Feedback */}
      <div className="performance-feedback-compact">
        <h3>Performance Summary</h3>
        <div className="feedback-content-compact">
          {results.percentage >= 80 && (
            <p>🎉 Excellent work! You demonstrate a strong understanding of the material.</p>
          )}
          {results.percentage >= 70 && results.percentage < 80 && (
            <p>👍 Good job! You have a solid grasp of most concepts.</p>
          )}
          {results.percentage >= 50 && results.percentage < 70 && (
            <p>📚 You're on the right track, but consider reviewing the material.</p>
          )}
          {results.percentage < 50 && (
            <p>📖 This topic needs more attention. Review the course materials and try again.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizResultsDisplay;