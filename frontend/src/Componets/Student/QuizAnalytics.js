import React, { useState, useEffect } from 'react';
import './QuizAnalytics.css';
import QuizAnalyticsPage from '../../Views/Student/QuizAnalyticsPage';

const QuizAnalytics = ({ studentId = 1 }) => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState('all');
  const [loading, setLoading] = useState(true);

  // Mock data - replace with actual API call
  useEffect(() => {
    const mockData = {
      studentInfo: {
        name: "John Doe",
        studentId: "STU001",
        enrollmentDate: "2024-01-15"
      },
      overallStats: {
        totalQuizzes: 12,
        completedQuizzes: 10,
        averageScore: 78,
        totalTimeSpent: 3600, // in seconds
        passRate: 85,
        lastActivity: "2024-09-10"
      },
      recentQuizzes: [
        { id: 1, title: "JavaScript Basics", score: 85, date: "2024-09-08", duration: 420, passed: true },
        { id: 2, title: "React Components", score: 92, date: "2024-09-06", duration: 380, passed: true },
        { id: 3, title: "CSS Flexbox", score: 67, date: "2024-09-04", duration: 510, passed: true },
        { id: 4, title: "HTML Semantics", score: 45, date: "2024-09-02", duration: 290, passed: false },
        { id: 5, title: "Web APIs", score: 88, date: "2024-08-30", duration: 450, passed: true }
      ],
      strengths: [
        "Strong performance in React concepts",
        "Consistent improvement over time",
        "Good time management in quizzes"
      ],
      weaknesses: [
        "Needs improvement in HTML fundamentals",
        "Struggling with complex CSS layouts",
        "Could benefit from more practice time"
      ],
      recommendations: [
        "Review HTML semantic elements and accessibility",
        "Practice CSS Grid and Flexbox exercises",
        "Allocate more time for quiz preparation",
        "Consider retaking failed quizzes"
      ],
      performanceByCategory: {
        "JavaScript": 85,
        "React": 90,
        "CSS": 70,
        "HTML": 55,
        "APIs": 88
      }
    };

    setTimeout(() => {
      setAnalyticsData(mockData);
      setLoading(false);
    }, 1000);
  }, [studentId]);

  const getGradeColor = (score) => {
    if (score >= 80) return '#27AE60';
    if (score >= 70) return '#3498DB';
    if (score >= 50) return '#F39C12';
    return '#E74C3C';
  };

  const getPerformanceLevel = (score) => {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Very Good';
    if (score >= 70) return 'Good';
    if (score >= 60) return 'Average';
    return 'Needs Improvement';
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="student-analytics-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="student-analytics-container">
        <div className="error-message">
          <p>Unable to load analytics data</p>
        </div>
      </div>
    );
  }

  const { studentInfo, overallStats, recentQuizzes, strengths, weaknesses, recommendations, performanceByCategory } = analyticsData;

  return (
    <div className="student-analytics-container">
      {/* Header */}
      <div className="analytics-header">
        <h2>Student Performance Analytics</h2>
        <div className="student-info">
          <span className="student-name">{studentInfo.name}</span>
          <span className="student-id">ID: {studentInfo.studentId}</span>
        </div>
      </div>

      {/* Overall Performance Summary */}
      <div className="performance-summary">
        <div className="summary-card">
          <div className="summary-score">
            <div 
              className="score-circle-small" 
              style={{ borderColor: getGradeColor(overallStats.averageScore) }}
            >
              <span style={{ color: getGradeColor(overallStats.averageScore) }}>
                {overallStats.averageScore}%
              </span>
            </div>
            <div className="score-label">Overall Average</div>
          </div>
          <div className="summary-stats">
            <div className="stat-item-small">
              <span className="stat-value-small">{overallStats.completedQuizzes}/{overallStats.totalQuizzes}</span>
              <span className="stat-label-small">Quizzes Completed</span>
            </div>
            <div className="stat-item-small">
              <span className="stat-value-small">{overallStats.passRate}%</span>
              <span className="stat-label-small">Pass Rate</span>
            </div>
            <div className="stat-item-small">
              <span className="stat-value-small">{formatTime(overallStats.totalTimeSpent)}</span>
              <span className="stat-label-small">Total Study Time</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Quiz Performance */}
      <div className="recent-performance">
        <h3>Recent Quiz Performance</h3>
        <div className="quiz-history">
          {recentQuizzes.map(quiz => (
            <div key={quiz.id} className="quiz-history-item">
              <div className="quiz-info">
                <span className="quiz-title-small">{quiz.title}</span>
                <span className="quiz-date">{formatDate(quiz.date)}</span>
              </div>
              <div className="quiz-metrics">
                
                <div className="quiz-duration">{formatTime(quiz.duration)}</div>
                <div className={`quiz-status ${quiz.passed ? 'passed' : 'failed'}`}>
                  {quiz.passed ? 'Passed' : 'Failed'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Performance by Category */}
      <div className="category-performance">
        <h3>Performance by Topic</h3>
        <div className="category-bars">
          {Object.entries(performanceByCategory).map(([category, score]) => (
            <div key={category} className="category-bar">
              <div className="category-info">
                <span className="category-name">{category}</span>
                <span className="category-score" style={{ color: getGradeColor(score) }}>
                  {score}%
                </span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ 
                    width: `${score}%`, 
                    backgroundColor: getGradeColor(score) 
                  }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Feedback Section */}
      <div className="feedback-section">
        <div className="feedback-grid">
          <div className="feedback-card strengths">
            <h4>💪 Strengths</h4>
            <ul>
              {strengths.map((strength, index) => (
                <li key={index}>{strength}</li>
              ))}
            </ul>
          </div>
          
          <div className="feedback-card weaknesses">
            <h4>📈 Areas for Improvement</h4>
            <ul>
              {weaknesses.map((weakness, index) => (
                <li key={index}>{weakness}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="recommendations-card">
          <h4>🎯 Personalized Recommendations</h4>
          <div className="recommendations-list">
            {recommendations.map((recommendation, index) => (
              <div key={index} className="recommendation-item">
                <span className="recommendation-number">{index + 1}</span>
                <span className="recommendation-text">{recommendation}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      
    </div>
  );
};

export default QuizAnalytics;