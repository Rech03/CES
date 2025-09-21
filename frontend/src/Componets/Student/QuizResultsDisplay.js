import React, { useState, useEffect } from 'react';
import { getAttemptDetail } from '../../api/quizzes';
import './QuizResultsDisplay.css';

const QuizResultsDisplay = ({ quizId, attemptData }) => {
  const [detailedResults, setDetailedResults] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDetailedResults = async () => {
      if (attemptData?.id) {
        try {
          setLoading(true);
          const attemptResponse = await getAttemptDetail(attemptData.id);
          setDetailedResults(attemptResponse.data);
        } catch (err) {
          console.warn('Could not fetch detailed results:', err);
          setError('Could not load detailed quiz results');
        } finally {
          setLoading(false);
        }
      } else {
        // If no attempt ID, use the provided attempt data
        setDetailedResults(attemptData);
        setLoading(false);
      }
    };

    fetchDetailedResults();
  }, [attemptData]);

  // Calculate results from the data
  const calculateResults = () => {
    if (!attemptData && !detailedResults) return null;

    const data = detailedResults || attemptData;
    
    return {
      correctAnswers: data.correct_answers || 0,
      totalQuestions: data.total_questions || 0,
      percentage: Math.round(data.score || 0),
      passed: (data.score || 0) >= 50,
      timeUsed: data.time_taken || 0,
      status: data.status || 'completed',
      attemptNumber: data.attempt_number || 1,
      maxScore: data.max_score || 100,
      questionResults: data.question_results || []
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
    if (!dateString) return 'Unknown Date';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const renderQuestionReview = (questionResult, index) => {
    const isCorrect = questionResult.is_correct || false;
    
    return (
      <div key={questionResult.question_id || index} className="question-review-compact">
        <div className="question-header-compact">
          <span className="question-number-compact">Q{index + 1}</span>
          <span className={`result-indicator-compact ${isCorrect ? 'correct' : 'incorrect'}`}>
            {isCorrect ? '✓' : '✗'}
          </span>
          {questionResult.points && (
            <span className="question-points">{questionResult.points_earned || 0}/{questionResult.points} pts</span>
          )}
        </div>
        
        <div className="question-text-compact">{questionResult.question_text || `Question ${index + 1}`}</div>
        
        {/* Multiple Choice Questions */}
        {questionResult.question_type === 'multiple_choice' && questionResult.choices && (
          <div className="choices-review-compact">
            {questionResult.choices.map((choice, choiceIndex) => {
              const isSelected = questionResult.selected_choice_id === choice.id;
              const isCorrectChoice = choice.is_correct;
              
              return (
                <div 
                  key={choice.id} 
                  className={`choice-review-compact ${isSelected ? 'selected' : ''} ${isCorrectChoice ? 'correct-answer' : ''}`}
                >
                  <span className="choice-letter-compact">{String.fromCharCode(65 + choiceIndex)}</span>
                  <span className="choice-text-compact">{choice.choice_text}</span>
                  {isSelected && <span className="selected-mark-compact">Your</span>}
                  {isCorrectChoice && <span className="correct-mark-compact">✓</span>}
                </div>
              );
            })}
          </div>
        )}
        
        {/* True/False Questions */}
        {questionResult.question_type === 'true_false' && (
          <div className="true-false-review-compact">
            <div className={`tf-option-compact ${questionResult.answer_text === 'true' ? 'selected' : ''} ${questionResult.correct_answer === 'true' ? 'correct-answer' : ''}`}>
              <span>True</span>
              {questionResult.answer_text === 'true' && <span className="selected-mark-compact">Your</span>}
              {questionResult.correct_answer === 'true' && <span className="correct-mark-compact">✓</span>}
            </div>
            <div className={`tf-option-compact ${questionResult.answer_text === 'false' ? 'selected' : ''} ${questionResult.correct_answer === 'false' ? 'correct-answer' : ''}`}>
              <span>False</span>
              {questionResult.answer_text === 'false' && <span className="selected-mark-compact">Your</span>}
              {questionResult.correct_answer === 'false' && <span className="correct-mark-compact">✓</span>}
            </div>
          </div>
        )}
        
        {/* Short Answer Questions */}
        {questionResult.question_type === 'short_answer' && (
          <div className="short-answer-review-compact">
            <div className="user-answer-compact">
              <strong>Your Answer:</strong> {questionResult.answer_text || 'No answer provided'}
            </div>
            {questionResult.model_answer && (
              <div className="sample-answer-compact">
                <strong>Model Answer:</strong> {questionResult.model_answer}
              </div>
            )}
            {questionResult.feedback && (
              <div className="answer-feedback">
                <strong>Feedback:</strong> {questionResult.feedback}
              </div>
            )}
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

  if (!results) {
    return (
      <div className="quiz-results-display">
        <div className="error-message">
          <p>Unable to load quiz results</p>
          {error && <p className="error-details">{error}</p>}
        </div>
      </div>
    );
  }

  const data = detailedResults || attemptData;

  return (
    <div className="quiz-results-display">
      {/* Header */}
      <div className="results-header-compact">
        <h2>Quiz Results</h2>
        <div className="quiz-info-compact">
          <span className="quiz-title-compact">{data.quiz_title || `Quiz ${quizId}`}</span>
          <span className="quiz-date-compact">{formatDate(data.created_at)}</span>
          {data.attempt_number > 1 && (
            <span className="attempt-badge-compact">Attempt #{data.attempt_number}</span>
          )}
          {results.status !== 'completed' && (
            <span className="status-badge">{results.status}</span>
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
          {results.maxScore && results.maxScore !== 100 && (
            <div className="stat-compact">
              <span className="stat-value-display">{results.correctAnswers * (results.maxScore / results.totalQuestions)}/{results.maxScore}</span>
              <span className="stat-label-display">Points</span>
            </div>
          )}
        </div>
      </div>

      {/* Toggle Details Button */}
      <div className="toggle-details">
        <button 
          className="toggle-btn"
          onClick={() => setShowDetails(!showDetails)}
          disabled={!results.questionResults || results.questionResults.length === 0}
        >
          {showDetails ? 'Hide Details' : 'View Question Details'}
          {(!results.questionResults || results.questionResults.length === 0) && 
            <span className="disabled-note"> (Not Available)</span>
          }
        </button>
      </div>

      {/* Detailed Results */}
      {showDetails && results.questionResults && results.questionResults.length > 0 && (
        <div className="detailed-results-compact">
          <h3>Question Review</h3>
          <div className="questions-review-compact">
            {results.questionResults.map((questionResult, index) => 
              renderQuestionReview(questionResult, index)
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

          {data.feedback && (
            <div className="personalized-feedback">
              <h4>Instructor Feedback</h4>
              <p>{data.feedback}</p>
            </div>
          )}

          {results.attemptNumber > 1 && (
            <div className="attempt-info">
              <p><strong>Attempt #{results.attemptNumber}</strong> - Your best score will be recorded.</p>
            </div>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-message-small">
          <p>Note: Some detailed information could not be loaded.</p>
        </div>
      )}
    </div>
  );
};

export default QuizResultsDisplay;