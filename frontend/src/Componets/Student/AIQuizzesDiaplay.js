import React, { useState, useEffect } from 'react';
import AIQuizTile from './AIQuizTile';
import EnhancedBiography from './EnhancedBiography';
import './AIQuizzesDisplay.css';

const AIQuizzesDisplay = () => {
  const [aiQuizzes, setAiQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterDifficulty, setFilterDifficulty] = useState('all');
  const [sortBy, setSortBy] = useState('recent');

  // Mock AI Quizzes data
  useEffect(() => {
    const mockAIQuizzes = [
      {
        id: 1,
        title: "AI-Generated JavaScript Fundamentals",
        topic: "JavaScript Basics",
        difficulty: "Easy",
        estimatedDuration: "10-15 min",
        questionCount: "15-20",
        sourceFile: "js_fundamentals.pdf",
        adaptiveLevel: "Beginner",
        lastUpdated: "2 hours ago",
        completed: false,
        attempts: 0,
        maxAttempts: "Unlimited"
      },
      {
        id: 2,
        title: "Dynamic React Components Quiz",
        topic: "React Advanced",
        difficulty: "Hard",
        estimatedDuration: "20-25 min",
        questionCount: "20-25",
        sourceFile: "react_advanced_notes.pdf",
        adaptiveLevel: "Advanced",
        lastUpdated: "4 hours ago",
        completed: true,
        bestScore: 88,
        attempts: 2,
        maxAttempts: "Unlimited"
      },
      {
        id: 3,
        title: "CSS Flexbox & Grid Mastery",
        topic: "CSS Layout",
        difficulty: "Medium",
        estimatedDuration: "15-20 min",
        questionCount: "18-22",
        sourceFile: "css_layout_guide.pdf",
        adaptiveLevel: "Intermediate",
        lastUpdated: "1 day ago",
        completed: false,
        attempts: 0,
        maxAttempts: "Unlimited"
      },
      {
        id: 4,
        title: "Python Data Structures Deep Dive",
        topic: "Data Structures",
        difficulty: "Expert",
        estimatedDuration: "25-30 min",
        questionCount: "25-30",
        sourceFile: "python_ds_comprehensive.pdf",
        adaptiveLevel: "Expert",
        lastUpdated: "6 hours ago",
        completed: true,
        bestScore: 92,
        attempts: 3,
        maxAttempts: "Unlimited"
      },
      {
        id: 5,
        title: "Database Optimization Techniques",
        topic: "Database Management",
        difficulty: "Hard",
        estimatedDuration: "20-25 min",
        questionCount: "20-25",
        sourceFile: "db_optimization.pdf",
        adaptiveLevel: "Advanced",
        lastUpdated: "3 hours ago",
        completed: false,
        attempts: 1,
        maxAttempts: "Unlimited"
      },
      {
        id: 6,
        title: "Machine Learning Basics",
        topic: "AI & ML",
        difficulty: "Medium",
        estimatedDuration: "15-20 min",
        questionCount: "16-20",
        sourceFile: "ml_introduction.pdf",
        adaptiveLevel: "Intermediate",
        lastUpdated: "5 hours ago",
        completed: true,
        bestScore: 78,
        attempts: 1,
        maxAttempts: "Unlimited"
      }
    ];

    setTimeout(() => {
      setAiQuizzes(mockAIQuizzes);
      setLoading(false);
    }, 1000);
  }, []);

  const filteredAndSortedQuizzes = () => {
    let filtered = aiQuizzes;

    // Filter by difficulty
    if (filterDifficulty !== 'all') {
      filtered = filtered.filter(quiz => quiz.difficulty.toLowerCase() === filterDifficulty);
    }

    // Sort quizzes
    switch (sortBy) {
      case 'recent':
        return filtered.sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated));
      case 'difficulty':
        const difficultyOrder = { 'Easy': 1, 'Medium': 2, 'Hard': 3, 'Expert': 4 };
        return filtered.sort((a, b) => difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty]);
      case 'completed':
        return filtered.sort((a, b) => b.completed - a.completed);
      default:
        return filtered;
    }
  };

  const getQuizStats = () => {
    const completed = aiQuizzes.filter(quiz => quiz.completed).length;
    const totalQuizzes = aiQuizzes.length;
    const averageScore = aiQuizzes
      .filter(quiz => quiz.completed && quiz.bestScore)
      .reduce((acc, quiz) => acc + quiz.bestScore, 0) / 
      aiQuizzes.filter(quiz => quiz.completed && quiz.bestScore).length || 0;

    return { completed, totalQuizzes, averageScore: Math.round(averageScore) };
  };

  const stats = getQuizStats();

  if (loading) {
    return (
      <div className="ai-quizzes-container">
        <div className="loading-container">
          <div className="ai-loading-spinner"></div>
          <p>Generating AI Quizzes...</p>
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
        {filteredAndSortedQuizzes().map(quiz => (
          <AIQuizTile
            key={quiz.id}
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
        ))}
      </div>

      {/* AI Learning Insights */}
      <div className="ai-insights-section">
        <h3>🧠 AI Learning Insights</h3>
        <div className="insights-grid">
          <div className="insight-card">
            <div className="insight-icon">📈</div>
            <div className="insight-content">
              <h4>Performance Trend</h4>
              <p>Your AI quiz scores have improved by 15% this week!</p>
            </div>
          </div>
          <div className="insight-card">
            <div className="insight-icon">🎯</div>
            <div className="insight-content">
              <h4>Recommended Focus</h4>
              <p>Consider more practice with Advanced React concepts</p>
            </div>
          </div>
          <div className="insight-card">
            <div className="insight-icon">⚡</div>
            <div className="insight-content">
              <h4>Adaptive Learning</h4>
              <p>AI difficulty automatically adjusting to your skill level</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIQuizzesDisplay;