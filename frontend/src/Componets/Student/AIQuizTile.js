import { useState, useEffect } from 'react';
import { getAdaptiveQuiz, getQuizAttemptStatus } from '../../api/ai-quiz';
import { getAttemptDetail } from '../../api/quizzes';
import './AIQuizTile.css';
import { NavLink } from "react-router-dom";

function AIQuizTile({ 
  quizId,
  slideId,
  title,
  topic,
  difficulty,
  aiGenerated = true,
  estimatedDuration,
  questionCount,
  sourceFile,
  adaptiveLevel,
  lastUpdated,
  completed,
  bestScore,
  attempts,
  maxAttempts = "Unlimited",
  backgroundImage = "/logo512.png",
  onStartQuiz,
  onViewResults,
  onClick
}) {
  const [quizData, setQuizData] = useState({
    title: title || "AI-Generated JavaScript Quiz",
    topic: topic || "JavaScript Fundamentals",
    difficulty: difficulty || "Medium",
    estimatedDuration: estimatedDuration || "10-15 min",
    questionCount: questionCount || "15-20",
    sourceFile: sourceFile || "lecture_notes.pdf",
    adaptiveLevel: adaptiveLevel || "Beginner",
    lastUpdated: lastUpdated || "2 hours ago",
    completed: completed || false,
    bestScore: bestScore || null,
    attempts: attempts || 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchQuizData = async () => {
      if (!quizId && !slideId) return;

      setLoading(true);
      try {
        let fetchedData = {};

        // Fetch adaptive quiz data if slideId provided
        if (slideId) {
          try {
            const adaptiveResponse = await getAdaptiveQuiz(slideId);
            const adaptiveQuiz = adaptiveResponse.data;
            
            fetchedData = {
              title: adaptiveQuiz.title || `AI Quiz - ${adaptiveQuiz.topic_name || 'Topic'}`,
              topic: adaptiveQuiz.topic_name || adaptiveQuiz.subject || 'AI Generated Topic',
              difficulty: adaptiveQuiz.difficulty_level || 'Medium',
              estimatedDuration: `${adaptiveQuiz.estimated_duration || 15} min`,
              questionCount: `${adaptiveQuiz.total_questions || 20}`,
              sourceFile: adaptiveQuiz.source_file_name || 'AI Generated',
              adaptiveLevel: adaptiveQuiz.adaptive_level || 'Beginner',
              lastUpdated: adaptiveQuiz.last_updated ? 
                new Date(adaptiveQuiz.last_updated).toLocaleString() : 
                'Recently generated'
            };

            // Check attempt status
            try {
              const attemptResponse = await getQuizAttemptStatus(slideId);
              const attemptData = attemptResponse.data;
              
              fetchedData.completed = attemptData.is_completed || false;
              fetchedData.bestScore = attemptData.best_score || null;
              fetchedData.attempts = attemptData.attempt_count || 0;
            } catch (attemptErr) {
              console.warn('Could not fetch attempt status:', attemptErr);
            }

          } catch (adaptiveErr) {
            console.warn('Could not fetch adaptive quiz data:', adaptiveErr);
          }
        }

        // Fetch regular quiz attempt data if quizId provided
        if (quizId) {
          try {
            const attemptResponse = await getAttemptDetail(quizId);
            const attempt = attemptResponse.data;
            
            fetchedData.completed = attempt.is_completed || false;
            fetchedData.bestScore = attempt.score || null;
            fetchedData.attempts = 1; // This specific attempt
          } catch (attemptErr) {
            console.warn('Could not fetch quiz attempt:', attemptErr);
          }
        }

        // Update state with fetched data, keeping original values as fallbacks
        setQuizData(prev => ({
          ...prev,
          ...fetchedData
        }));

      } catch (err) {
        console.error('Error fetching quiz data:', err);
        setError('Failed to load quiz data');
      } finally {
        setLoading(false);
      }
    };

    fetchQuizData();
  }, [quizId, slideId]);

  const getDifficultyInfo = (difficulty) => {
    switch(difficulty) {
      case 'Easy': 
        return { color: '#27AE60', icon: '📗', description: 'Basic concepts' };
      case 'Medium': 
        return { color: '#F39C12', icon: '📙', description: 'Intermediate level' };
      case 'Hard': 
        return { color: '#E74C3C', icon: '📕', description: 'Advanced topics' };
      case 'Expert':
        return { color: '#9B59B6', icon: '📜', description: 'Expert level' };
      default: 
        return { color: '#95A5A6', icon: '📄', description: 'Unknown level' };
    }
  };

  const getAdaptiveLevelColor = (level) => {
    switch(level) {
      case 'Beginner': return '#3498DB';
      case 'Intermediate': return '#F39C12';
      case 'Advanced': return '#E74C3C';
      case 'Expert': return '#9B59B6';
      default: return '#95A5A6';
    }
  };

  const handleStartQuiz = () => {
    if (onStartQuiz) {
      onStartQuiz();
    } else {
      // Default navigation logic with quiz data
      console.log('Starting quiz with data:', { quizId, slideId, ...quizData });
    }
  };

  const handleViewResults = () => {
    if (onViewResults) {
      onViewResults();
    } else {
      // Default navigation to results
      console.log('Viewing results for:', { quizId, slideId, ...quizData });
    }
  };

  const difficultyInfo = getDifficultyInfo(quizData.difficulty);

  if (loading) {
    return (
      <div className="ai-quiz-tile-container loading">
        <div className="ai-quiz-overlay"></div>
        <div className="loading-content">
          <div className="spinner"></div>
          <p>Loading AI Quiz...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <NavLink 
        to="/AIQuizCountdownPage" 
        state={{ 
          quizData: { 
            quizId, 
            slideId, 
            ...quizData,
            isAIGenerated: true 
          } 
        }}
      >
        <div className="ai-quiz-tile-container" onClick={onClick}>
          <div className="ai-quiz-overlay"></div>
          
          {/* AI Badge */}
          <div className="ai-badge">
            <span className="ai-icon">🤖</span>
            <span className="ai-text">AI Generated</span>
          </div>

          {/* Difficulty Badge */}
          <div className="difficulty-badge" style={{ backgroundColor: difficultyInfo.color }}>
            <span className="difficulty-icon">{difficultyInfo.icon}</span>
            <span className="difficulty-text">{quizData.difficulty}</span>
          </div>

          {/* Completion Badge */}
          {quizData.completed && (
            <div className="completion-badge">
              <span>✓ Completed</span>
              {quizData.bestScore && (
                <span className="score-display">{quizData.bestScore}%</span>
              )}
            </div>
          )}

          {/* Quiz Info Section */}
          <div className="ai-quiz-info-section">
            <div className="quiz-topic">{quizData.topic}</div>
            <div className="quiz-meta-info">
              <span className="question-count">{quizData.questionCount} Questions</span>
              <span className="estimated-duration">{quizData.estimatedDuration}</span>
            </div>
            <div className="quiz-source-info">
              <span className="source-file">📄 {quizData.sourceFile}</span>
              <span 
                className="adaptive-level" 
                style={{ color: getAdaptiveLevelColor(quizData.adaptiveLevel) }}
              >
                🎯 {quizData.adaptiveLevel}
              </span>
            </div>
          </div>

          {/* Title Container */}
          <div className="ai-quiz-title-container">
            <div className="ai-quiz-title-text">{quizData.title}</div>
          </div>

          {/* Quiz Stats */}
          <div className="quiz-stats">
            <span className="attempts-count">
              📊 {quizData.attempts} attempt{quizData.attempts !== 1 ? 's' : ''}
            </span>
            <span className="last-updated">Updated: {quizData.lastUpdated}</span>
          </div>

          {/* Action Buttons */}
          <div className="ai-quiz-actions">
            {!quizData.completed && (
              <button 
                className="ai-action-btn ai-start-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleStartQuiz();
                }}
              >
                <span className="btn-icon">🚀</span>
                Start AI Quiz
              </button>
            )}
            
            {quizData.completed && (
              <>
                <button 
                  className="ai-action-btn ai-results-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    handleViewResults();
                  }}
                >
                  <span className="btn-icon">📊</span>
                  View Results
                </button>
                <button 
                  className="ai-action-btn ai-retake-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    handleStartQuiz();
                  }}
                >
                  <span className="btn-icon">🔄</span>
                  Retake
                </button>
              </>
            )}
          </div>

          {error && (
            <div className="error-indicator">
              <small>{error}</small>
            </div>
          )}
        </div>
      </NavLink>
    </div>
  );
}

export default AIQuizTile;