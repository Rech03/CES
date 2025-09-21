import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getAdaptiveQuiz, getQuizAttemptStatus } from '../../api/ai-quiz';
import NavBar from "../Student/NavBar";
import './AIQuizCountdownPage.css';

const AIQuizCountdownPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { quizData } = location.state || {};
  
  const [countdown, setCountdown] = useState(5);
  const [isReady, setIsReady] = useState(false);
  const [quizDetails, setQuizDetails] = useState(null);
  const [attemptHistory, setAttemptHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!quizData?.slideId) {
      setError('No quiz data provided');
      setLoading(false);
      return;
    }

    const fetchQuizDetails = async () => {
      try {
        // Fetch full quiz details
        const quizResponse = await getAdaptiveQuiz(quizData.slideId);
        setQuizDetails(quizResponse.data);

        // Fetch attempt history
        try {
          const attemptResponse = await getQuizAttemptStatus(quizData.slideId);
          setAttemptHistory(attemptResponse.data);
        } catch (attemptErr) {
          console.warn('Could not fetch attempt history:', attemptErr);
        }

      } catch (err) {
        console.error('Error fetching quiz details:', err);
        setError('Failed to load quiz details');
      } finally {
        setLoading(false);
      }
    };

    fetchQuizDetails();
  }, [quizData]);

  useEffect(() => {
    let timer;
    if (isReady && countdown > 0) {
      timer = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    } else if (isReady && countdown === 0) {
      // Navigate to quiz attempt page
      navigate('/ai-quiz-attempt', {
        state: {
          quizData: {
            ...quizData,
            fullQuizDetails: quizDetails
          }
        }
      });
    }
    return () => clearInterval(timer);
  }, [isReady, countdown, navigate, quizData, quizDetails]);

  const handleStartCountdown = () => {
    setIsReady(true);
  };

  const handleBackToQuizzes = () => {
    navigate('/ai-quizzes');
  };

  const getDifficultyColor = (difficulty) => {
    switch(difficulty) {
      case 'Easy': return '#27AE60';
      case 'Medium': return '#F39C12';
      case 'Hard': return '#E74C3C';
      case 'Expert': return '#9B59B6';
      default: return '#95A5A6';
    }
  };

  const getPerformanceInsight = () => {
    if (!attemptHistory || attemptHistory.attempt_count === 0) {
      return {
        message: "This is your first attempt at this quiz. Take your time and read each question carefully.",
        icon: "🆕",
        color: "#3498DB"
      };
    }

    if (attemptHistory.best_score >= 90) {
      return {
        message: `Excellent work! Your best score is ${attemptHistory.best_score}%. Challenge yourself to maintain this level.`,
        icon: "⭐",
        color: "#27AE60"
      };
    }

    if (attemptHistory.best_score >= 70) {
      return {
        message: `Good progress! Your best score is ${attemptHistory.best_score}%. Focus on areas where you struggled before.`,
        icon: "📈",
        color: "#F39C12"
      };
    }

    return {
      message: `Your best score is ${attemptHistory.best_score}%. Review the material and try to improve on previous attempts.`,
      icon: "💪",
      color: "#E67E22"
    };
  };

  if (loading) {
    return (
      <div>
        <NavBar />
        <div className="countdown-container">
          <div className="loading-screen">
            <div className="loading-spinner"></div>
            <h2>Preparing Your AI Quiz...</h2>
            <p>Loading quiz content and your performance history</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <NavBar />
        <div className="countdown-container">
          <div className="error-screen">
            <div className="error-icon">⚠️</div>
            <h2>Unable to Load Quiz</h2>
            <p>{error}</p>
            <button onClick={handleBackToQuizzes} className="btn btn-primary">
              Back to Quizzes
            </button>
          </div>
        </div>
      </div>
    );
  }

  const insight = getPerformanceInsight();

  return (
    <div>
      <NavBar />
      <div className="countdown-container">
        <div className="countdown-content">
          
          {/* Header */}
          <div className="countdown-header">
            <button onClick={handleBackToQuizzes} className="back-button">
              ← Back to Quizzes
            </button>
            <div className="ai-badge-large">
              <span className="ai-icon-large">🤖</span>
              <span>AI Generated Quiz</span>
            </div>
          </div>

          {/* Quiz Information */}
          <div className="quiz-info-card">
            <div className="quiz-title-section">
              <h1>{quizDetails?.title || quizData.title}</h1>
              <p className="quiz-topic">{quizDetails?.topic_name || quizData.topic}</p>
            </div>

            <div className="quiz-details-grid">
              <div className="detail-card">
                <div className="detail-icon">📝</div>
                <div className="detail-content">
                  <span className="detail-label">Questions</span>
                  <span className="detail-value">
                    {quizDetails?.total_questions || quizData.questionCount}
                  </span>
                </div>
              </div>

              <div className="detail-card">
                <div className="detail-icon">⏰</div>
                <div className="detail-content">
                  <span className="detail-label">Duration</span>
                  <span className="detail-value">
                    {quizDetails?.estimated_duration || quizData.estimatedDuration} min
                  </span>
                </div>
              </div>

              <div className="detail-card">
                <div className="detail-icon">🎯</div>
                <div className="detail-content">
                  <span className="detail-label">Difficulty</span>
                  <span 
                    className="detail-value difficulty-badge"
                    style={{ color: getDifficultyColor(quizDetails?.difficulty_level || quizData.difficulty) }}
                  >
                    {quizDetails?.difficulty_level || quizData.difficulty}
                  </span>
                </div>
              </div>

              <div className="detail-card">
                <div className="detail-icon">📚</div>
                <div className="detail-content">
                  <span className="detail-label">Source</span>
                  <span className="detail-value source-text">
                    {quizDetails?.source_file_name || quizData.sourceFile}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Performance History */}
          {attemptHistory && (
            <div className="performance-card">
              <h3>📊 Your Performance History</h3>
              <div className="performance-stats">
                <div className="stat-item">
                  <span className="stat-number">{attemptHistory.attempt_count}</span>
                  <span className="stat-label">Attempts</span>
                </div>
                {attemptHistory.best_score && (
                  <div className="stat-item">
                    <span 
                      className="stat-number score-display"
                      style={{ color: getDifficultyColor('Medium') }}
                    >
                      {attemptHistory.best_score}%
                    </span>
                    <span className="stat-label">Best Score</span>
                  </div>
                )}
                {attemptHistory.last_attempt && (
                  <div className="stat-item">
                    <span className="stat-number">
                      {new Date(attemptHistory.last_attempt).toLocaleDateString()}
                    </span>
                    <span className="stat-label">Last Attempt</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Performance Insight */}
          <div className="insight-card" style={{ borderLeftColor: insight.color }}>
            <div className="insight-icon" style={{ color: insight.color }}>
              {insight.icon}
            </div>
            <div className="insight-content">
              <h4>AI Learning Insight</h4>
              <p>{insight.message}</p>
            </div>
          </div>

          {/* Quiz Instructions */}
          <div className="instructions-card">
            <h3>📋 Quiz Instructions</h3>
            <div className="instructions-grid">
              <div className="instruction-item">
                <span className="instruction-icon">🎯</span>
                <span>Read each question carefully before selecting an answer</span>
              </div>
              <div className="instruction-item">
                <span className="instruction-icon">⚡</span>
                <span>You can navigate between questions using the controls</span>
              </div>
              <div className="instruction-item">
                <span className="instruction-icon">💾</span>
                <span>Your progress is automatically saved as you go</span>
              </div>
              <div className="instruction-item">
                <span className="instruction-icon">⏱️</span>
                <span>Keep an eye on the timer - submit before time runs out</span>
              </div>
              <div className="instruction-item">
                <span className="instruction-icon">🔄</span>
                <span>You can retake this quiz multiple times if needed</span>
              </div>
              <div className="instruction-item">
                <span className="instruction-icon">🤖</span>
                <span>AI will adapt future questions based on your performance</span>
              </div>
            </div>
          </div>

          {/* Ready Check and Countdown */}
          <div className="ready-section">
            {!isReady ? (
              <div className="ready-check">
                <h3>Are you ready to begin?</h3>
                <p>Make sure you have a quiet environment and enough time to complete the quiz.</p>
                <button 
                  onClick={handleStartCountdown}
                  className="start-countdown-btn"
                >
                  🚀 I'm Ready - Start Quiz
                </button>
              </div>
            ) : (
              <div className="countdown-display">
                <div className="countdown-circle">
                  <div className="countdown-number">{countdown}</div>
                </div>
                <h3>Get Ready!</h3>
                <p>Your quiz will begin in {countdown} second{countdown !== 1 ? 's' : ''}...</p>
                <div className="countdown-progress">
                  <div 
                    className="countdown-progress-fill"
                    style={{ width: `${((5 - countdown) / 5) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>

          {/* Emergency Controls */}
          <div className="emergency-controls">
            <button 
              onClick={handleBackToQuizzes} 
              className="cancel-button"
              disabled={isReady && countdown <= 2}
            >
              Cancel Quiz
            </button>
            {isReady && countdown > 0 && (
              <button 
                onClick={() => navigate('/ai-quiz-attempt', {
                  state: {
                    quizData: {
                      ...quizData,
                      fullQuizDetails: quizDetails
                    }
                  }
                })}
                className="skip-countdown-btn"
              >
                Skip Countdown
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIQuizCountdownPage;