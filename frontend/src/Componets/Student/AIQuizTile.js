import { useState, useEffect } from 'react';
import { getAdaptiveQuiz, checkQuizAccess, studentAdaptiveProgress } from '../../api/ai-quiz';
import { getAttemptDetail } from '../../api/quizzes';
import { getAdaptiveSlideStats } from '../../api/analytics';
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
    attempts: attempts || 0,
    hasAccess: true,
    isLocked: false
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
              title: adaptiveQuiz.title || adaptiveQuiz.slide_title || `AI Quiz - ${adaptiveQuiz.topic_name || 'Topic'}`,
              topic: adaptiveQuiz.topic_name || adaptiveQuiz.subject || adaptiveQuiz.slide_topic || 'AI Generated Topic',
              difficulty: adaptiveQuiz.difficulty_level || adaptiveQuiz.current_difficulty || 'Medium',
              estimatedDuration: `${adaptiveQuiz.estimated_duration || adaptiveQuiz.duration || 15} min`,
              questionCount: `${adaptiveQuiz.total_questions || adaptiveQuiz.question_count || 20}`,
              sourceFile: adaptiveQuiz.source_file_name || adaptiveQuiz.slide_file || 'AI Generated',
              adaptiveLevel: adaptiveQuiz.adaptive_level || adaptiveQuiz.current_level || 'Beginner',
              lastUpdated: adaptiveQuiz.last_updated || adaptiveQuiz.updated_at ? 
                new Date(adaptiveQuiz.last_updated || adaptiveQuiz.updated_at).toLocaleDateString() : 
                'Recently generated',
              hasAccess: adaptiveQuiz.has_access !== false,
              isLocked: adaptiveQuiz.is_locked || false
            };

            // Get slide statistics for more details
            try {
              const statsResponse = await getAdaptiveSlideStats(slideId);
              const stats = statsResponse.data;
              
              if (stats) {
                fetchedData.attempts = stats.total_attempts || stats.attempt_count || 0;
                fetchedData.averageScore = stats.average_score || null;
                fetchedData.completionRate = stats.completion_rate || null;
              }
            } catch (statsErr) {
              console.warn('Could not fetch slide stats:', statsErr);
            }

          } catch (adaptiveErr) {
            console.warn('Could not fetch adaptive quiz data:', adaptiveErr);
            setError('Unable to load AI quiz data');
          }
        }

        // Check quiz access if quizId provided
        if (quizId) {
          try {
            const accessResponse = await checkQuizAccess(quizId);
            const accessData = accessResponse.data;
            
            fetchedData.hasAccess = accessData.has_access || accessData.accessible || true;
            fetchedData.isLocked = accessData.is_locked || false;
            fetchedData.accessMessage = accessData.message || null;

            // Try to get attempt data
            try {
              const attemptResponse = await getAttemptDetail(quizId);
              const attempt = attemptResponse.data;
              
              fetchedData.completed = attempt.is_completed || attempt.submitted_at !== null;
              fetchedData.bestScore = attempt.score || attempt.percentage_score || null;
              fetchedData.attempts = 1; // This specific attempt
            } catch (attemptErr) {
              console.warn('Could not fetch quiz attempt:', attemptErr);
            }
          } catch (accessErr) {
            console.warn('Could not check quiz access:', accessErr);
          }
        }

        // Get overall student progress for AI quizzes
        try {
          const progressResponse = await studentAdaptiveProgress();
          const progressData = progressResponse.data;
          
          if (progressData && Array.isArray(progressData)) {
            const currentProgress = progressData.find(p => 
              (slideId && p.slide_id === slideId) || 
              (quizId && p.quiz_id === quizId)
            );
            
            if (currentProgress) {
              fetchedData.completed = currentProgress.is_completed || currentProgress.completed || false;
              fetchedData.bestScore = currentProgress.best_score || currentProgress.score || null;
              fetchedData.attempts = currentProgress.attempt_count || currentProgress.attempts || 0;
              fetchedData.currentLevel = currentProgress.current_level || null;
              fetchedData.progress = currentProgress.progress_percentage || null;
            }
          }
        } catch (progressErr) {
          console.warn('Could not fetch student progress:', progressErr);
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
    switch(difficulty?.toLowerCase()) {
      case 'easy': 
      case 'beginner':
        return { color: '#27AE60', icon: '🟢', description: 'Basic concepts' };
      case 'medium': 
      case 'intermediate':
        return { color: '#F39C12', icon: '🟡', description: 'Intermediate level' };
      case 'hard': 
      case 'advanced':
        return { color: '#E74C3C', icon: '🔴', description: 'Advanced topics' };
      case 'expert':
        return { color: '#9B59B6', icon: '🟣', description: 'Expert level' };
      default: 
        return { color: '#95A5A6', icon: '⚪', description: 'Unknown level' };
    }
  };

  const getAdaptiveLevelColor = (level) => {
    switch(level?.toLowerCase()) {
      case 'beginner': return '#3498DB';
      case 'intermediate': return '#F39C12';
      case 'advanced': return '#E74C3C';
      case 'expert': return '#9B59B6';
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

          {/* Access Status Badge */}
          {quizData.isLocked && (
            <div className="access-badge locked">
              <span>🔒 Locked</span>
            </div>
          )}

          {/* Completion Badge */}
          {quizData.completed && (
            <div className="completion-badge">
              <span>✅ Completed</span>
              {quizData.bestScore && (
                <span className="score-display">{quizData.bestScore}%</span>
              )}
            </div>
          )}

          {/* Progress Badge for partially completed */}
          {!quizData.completed && quizData.progress && (
            <div className="progress-badge">
              <span>📊 {Math.round(quizData.progress)}% Progress</span>
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
                🎯 {quizData.currentLevel || quizData.adaptiveLevel}
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

          {/* Access Message */}
          {quizData.accessMessage && (
            <div className="access-message">
              <small>{quizData.accessMessage}</small>
            </div>
          )}

          {/* Action Buttons */}
          <div className="ai-quiz-actions">
            {!quizData.completed && quizData.hasAccess && !quizData.isLocked && (
              <button 
                className="ai-action-btn ai-start-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleStartQuiz();
                }}
              >
                <span className="btn-icon">🚀</span>
                {quizData.attempts > 0 ? 'Continue Quiz' : 'Start AI Quiz'}
              </button>
            )}

            {quizData.isLocked && (
              <button 
                className="ai-action-btn ai-locked-btn"
                disabled
              >
                <span className="btn-icon">🔒</span>
                Quiz Locked
              </button>
            )}

            {!quizData.hasAccess && (
              <button 
                className="ai-action-btn ai-access-btn"
                disabled
              >
                <span className="btn-icon">⚠️</span>
                Access Restricted
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
                {quizData.hasAccess && !quizData.isLocked && (
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
                )}
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