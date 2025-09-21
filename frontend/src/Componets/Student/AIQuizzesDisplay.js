import React, { useState, useEffect } from 'react';
import { studentAvailableSlides, studentAdaptiveProgress } from '../../api/ai-quiz';
import { getMyAttempts } from '../../api/quizzes';
import AIQuizTile from './AIQuizTile';
import './AIQuizzesDisplay.css';

const AIQuizzesDisplay = () => {
  const [aiQuizzes, setAiQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterDifficulty, setFilterDifficulty] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [error, setError] = useState(null);
  const [progressData, setProgressData] = useState(null);

  useEffect(() => {
    const fetchAIQuizzes = async () => {
      setLoading(true);
      try {
        // Fetch available AI-generated slides/quizzes
        const slidesResponse = await studentAvailableSlides();
        const slides = slidesResponse.data.results || slidesResponse.data || [];

        // Fetch student progress data
        let progress = null;
        try {
          const progressResponse = await studentAdaptiveProgress();
          progress = progressResponse.data;
          setProgressData(progress);
        } catch (progressErr) {
          console.warn('Could not fetch progress data:', progressErr);
        }

        // Fetch quiz attempts for completion status
        let attempts = [];
        try {
          const attemptsResponse = await getMyAttempts();
          attempts = attemptsResponse.data.results || attemptsResponse.data || [];
        } catch (attemptsErr) {
          console.warn('Could not fetch attempts:', attemptsErr);
        }

        // Process slides into quiz format
        const processedQuizzes = slides.map(slide => {
          // Find related attempts for this slide
          const slideAttempts = attempts.filter(attempt => 
            attempt.adaptive_quiz_id === slide.id || 
            attempt.slide_id === slide.id
          );

          const completedAttempts = slideAttempts.filter(attempt => 
            attempt.is_completed || attempt.status === 'completed'
          );

          const bestAttempt = completedAttempts.reduce((best, current) => {
            return (current.score || 0) > (best.score || 0) ? current : best;
          }, { score: 0 });

          return {
            id: slide.id,
            slideId: slide.id,
            title: slide.title || `AI Quiz - ${slide.topic_name || 'Topic'}`,
            topic: slide.topic_name || slide.subject || 'AI Generated Topic',
            difficulty: slide.difficulty_level || 'Medium',
            estimatedDuration: `${slide.estimated_duration || 15} min`,
            questionCount: `${slide.total_questions || 20}`,
            sourceFile: slide.source_file_name || slide.lecture_slide_title || 'AI Generated',
            adaptiveLevel: slide.adaptive_level || 'Beginner',
            lastUpdated: slide.updated_at ? 
              new Date(slide.updated_at).toLocaleTimeString() : 
              'Recently generated',
            completed: completedAttempts.length > 0,
            bestScore: bestAttempt.score || null,
            attempts: slideAttempts.length,
            maxAttempts: "Unlimited",
            createdAt: slide.created_at || slide.date_created
          };
        });

        setAiQuizzes(processedQuizzes);

      } catch (err) {
        console.error('Error fetching AI quizzes:', err);
        setError('Failed to load AI quizzes');
      } finally {
        setLoading(false);
      }
    };

    fetchAIQuizzes();
  }, []);

  const filteredAndSortedQuizzes = () => {
    let filtered = aiQuizzes;

    // Filter by difficulty
    if (filterDifficulty !== 'all') {
      filtered = filtered.filter(quiz => 
        quiz.difficulty.toLowerCase() === filterDifficulty
      );
    }

    // Sort quizzes
    switch (sortBy) {
      case 'recent':
        return filtered.sort((a, b) => {
          const dateA = new Date(a.createdAt || a.lastUpdated);
          const dateB = new Date(b.createdAt || b.lastUpdated);
          return dateB - dateA;
        });
      case 'difficulty':
        const difficultyOrder = { 'Easy': 1, 'Medium': 2, 'Hard': 3, 'Expert': 4 };
        return filtered.sort((a, b) => 
          difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty]
        );
      case 'completed':
        return filtered.sort((a, b) => b.completed - a.completed);
      default:
        return filtered;
    }
  };

  const getQuizStats = () => {
    const completed = aiQuizzes.filter(quiz => quiz.completed).length;
    const totalQuizzes = aiQuizzes.length;
    const completedQuizzes = aiQuizzes.filter(quiz => quiz.completed && quiz.bestScore);
    const averageScore = completedQuizzes.length > 0 ? 
      completedQuizzes.reduce((acc, quiz) => acc + quiz.bestScore, 0) / completedQuizzes.length : 0;

    return { 
      completed, 
      totalQuizzes, 
      averageScore: Math.round(averageScore) 
    };
  };

  const getAIInsights = () => {
    if (!progressData) {
      return {
        performanceTrend: "Complete more AI quizzes to see performance trends",
        recommendedFocus: "Take AI quizzes to get personalized recommendations",
        adaptiveLearning: "AI difficulty will adjust based on your performance"
      };
    }

    return {
      performanceTrend: progressData.performance_trend || "Your AI quiz scores are improving!",
      recommendedFocus: progressData.recommended_topics?.join(', ') || "Continue with current topics",
      adaptiveLearning: `AI is adapting to your ${progressData.current_level || 'current'} level`
    };
  };

  const stats = getQuizStats();
  const insights = getAIInsights();

  if (loading) {
    return (
      <div className="ai-quizzes-container">
        <div className="loading-container">
          <div className="ai-loading-spinner"></div>
          <p>Loading AI Quizzes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ai-quizzes-container">
    

      {/* AI Quizzes Header */}
      <div className="ai-quizzes-header">
        <div className="header-title">
          <h2>🤖 AI-Generated Quizzes</h2>
          <p>Personalized quizzes created from your course materials</p>
        </div>
        
        <div className="quiz-stats-summary">
          <div className="stat-item">
            <span className="stat-number">{stats.completed}</span>
            <span className="stat-label">Completed</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{stats.totalQuizzes}</span>
            <span className="stat-label">Available</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{stats.averageScore}%</span>
            <span className="stat-label">Avg Score</span>
          </div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="ai-controls">
        <div className="filter-section">
          <label>Filter by Difficulty:</label>
          <select 
            value={filterDifficulty} 
            onChange={(e) => setFilterDifficulty(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Levels</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
            <option value="expert">Expert</option>
          </select>
        </div>

        <div className="sort-section">
          <label>Sort by:</label>
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            className="sort-select"
          >
            <option value="recent">Most Recent</option>
            <option value="difficulty">Difficulty</option>
            <option value="completed">Completion Status</option>
          </select>
        </div>
      </div>

      {/* AI Quizzes Grid */}
      <div className="ai-quizzes-grid">
        {filteredAndSortedQuizzes().length > 0 ? (
          filteredAndSortedQuizzes().map(quiz => (
            <AIQuizTile
              key={quiz.id}
              slideId={quiz.slideId}
              title={quiz.title}
              topic={quiz.topic}
              difficulty={quiz.difficulty}
              estimatedDuration={quiz.estimatedDuration}
              questionCount={quiz.questionCount}
              sourceFile={quiz.sourceFile}
              adaptiveLevel={quiz.adaptiveLevel}
              lastUpdated={quiz.lastUpdated}
              completed={quiz.completed}
              bestScore={quiz.bestScore}
              attempts={quiz.attempts}
              maxAttempts={quiz.maxAttempts}
              onStartQuiz={() => console.log(`Starting AI quiz: ${quiz.id}`)}
              onViewResults={() => console.log(`Viewing results for quiz: ${quiz.id}`)}
            />
          ))
        ) : (
          <div className="no-quizzes-available">
            <h3>No AI Quizzes Available</h3>
            <p>AI quizzes will appear here once your instructor uploads lecture materials.</p>
          </div>
        )}
      </div>

      {/* AI Learning Insights */}
      <div className="ai-insights-section">
        <h3>🧠 AI Learning Insights</h3>
        <div className="insights-grid">
          <div className="insight-card">
            <div className="insight-icon">📈</div>
            <div className="insight-content">
              <h4>Performance Trend</h4>
              <p>{insights.performanceTrend}</p>
            </div>
          </div>
          <div className="insight-card">
            <div className="insight-icon">🎯</div>
            <div className="insight-content">
              <h4>Recommended Focus</h4>
              <p>{insights.recommendedFocus}</p>
            </div>
          </div>
          <div className="insight-card">
            <div className="insight-icon">⚡</div>
            <div className="insight-content">
              <h4>Adaptive Learning</h4>
              <p>{insights.adaptiveLearning}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIQuizzesDisplay;